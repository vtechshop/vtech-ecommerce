'use strict';
// WooCommerce-transferred carts through the existing VTech checkout:
// handoff → import → checkout pre-fill → POST /api/orders → admin order filters.

const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Product = require('../../models/Product');
const Cart = require('../../models/Cart');
const Order = require('../../models/Order');
const WooProductMapping = require('../../models/WooProductMapping');
const { generateAccessToken } = require('../../utils/jwt');
const { buildCanonical, computeHmac } = require('../../utils/wooHmac');
const { attributeOrderItems } = require('../../services/orderSourceAttribution');

const VEG = 'woo_vegetablecuttingmachine';
const STYLE = 'woo_styleyourlyf';
const SECRETS = {
  [VEG]: 'test-veg-secret-0123456789abcdef0123456789abcdef',
  [STYLE]: 'test-style-secret-0123456789abcdef0123456789abcd',
};
const ADDRESS = {
  fullName: 'Priya R',
  email: 'priya@example.com',
  phone: '9876543210',
  addressLine1: '12/4 R&D Street',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  zipCode: '641006',
  country: 'IN',
};
const SHIP_TO = { fullName: 'Priya R', phone: '9876543210', addressLine1: '12/4 R&D Street', city: 'Coimbatore', state: 'Tamil Nadu', zipCode: '641006', country: 'IN' };

let nonceSeq = 0;
let user, userToken, adminToken;
let cutter;   // simple, price 1500, stock 20, GST 18% on top
let kurta;    // variants Red 1200 (stock 5) / Blue 1300 (stock 8)
let peeler;   // native-only product, price 500, stock 10
let otherSellerProduct;

beforeAll(() => {
  process.env.WOO_SECRET_VEGETABLE = SECRETS[VEG];
  process.env.WOO_SECRET_STYLE = SECRETS[STYLE];
});

beforeEach(async () => {
  user = await User.create({ name: 'Buyer', email: 'buyer@test.com', password: 'x'.repeat(60), emailVerified: true });
  userToken = generateAccessToken(user._id, 'customer');
  const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'x'.repeat(60), role: 'admin', emailVerified: true });
  adminToken = generateAccessToken(admin._id, 'admin');

  const vendor = await Vendor.create({ userId: admin._id, storeName: 'VTech', slug: 'vtech', status: 'active' });
  const otherVendor = await Vendor.create({ userId: user._id, storeName: 'Other', slug: 'other', status: 'active' });
  const base = { vendorId: vendor._id, description: 'd', published: true };

  cutter = await Product.create({ ...base, title: 'Veg Cutter', slug: 'veg-cutter', price: 1500, stock: 20, taxable: true, taxRate: 18 });
  kurta = await Product.create({
    ...base, title: 'Kurta', slug: 'kurta', price: 1000, stock: 0,
    variants: [
      { name: 'Red', sku: 'K-RED', price: 1200, stock: 5 },
      { name: 'Blue', sku: 'K-BLUE', price: 1300, stock: 8 },
    ],
  });
  peeler = await Product.create({ ...base, title: 'Peeler', slug: 'peeler', price: 500, stock: 10 });
  otherSellerProduct = await Product.create({ ...base, vendorId: otherVendor._id, title: 'Other Seller', slug: 'other-seller', price: 100, stock: 10 });

  await WooProductMapping.create([
    { externalSource: VEG, wooProductId: '101', wooVariantId: null, vtechProductId: cutter._id },
    { externalSource: VEG, wooProductId: '909', wooVariantId: null, vtechProductId: otherSellerProduct._id },
    { externalSource: STYLE, wooProductId: '202', wooVariantId: '55', vtechProductId: kurta._id, vtechVariantId: String(kurta.variants[0]._id) },
  ]);
});

async function transfer({ source, items, guestId, bearer, address = ADDRESS }) {
  const nonce = `checkoutnonce${Date.now()}x${++nonceSeq}`;
  const ts = Math.floor(Date.now() / 1000);
  const sig = computeHmac(buildCanonical('POST', '/api/woo/handoff', source, nonce, ts, items, address), SECRETS[source]);
  const handoff = await request(app).post('/api/woo/handoff').set('X-Woo-Signature', `sha256=${sig}`)
    .send({ externalSource: source, nonce, timestamp: ts, items, address });
  expect(handoff.status).toBe(201);

  const req = request(app).post('/api/woo/cart/import');
  if (bearer) req.set('Authorization', `Bearer ${bearer}`);
  if (guestId) req.set('Cookie', `guestId=${guestId}`);
  const imported = await req.send({ token: handoff.body.token });
  expect(imported.status).toBe(200);
}

function nativeAdd({ guestId, bearer, ...body }) {
  const req = request(app).post('/api/cart/add');
  if (bearer) req.set('Authorization', `Bearer ${bearer}`);
  if (guestId) req.set('Cookie', `guestId=${guestId}`);
  return req.send(body);
}

// Mirrors Checkout.jsx: every cart line, with its cartItemId
const linesFromCart = (cart) => cart.items.map(i => ({
  cartItemId: String(i._id), productId: String(i.productId), variantId: i.variantId ?? undefined, qty: i.qty,
}));

function placeOrder(items, { guestId, bearer } = {}) {
  const req = request(app).post('/api/orders');
  if (bearer) req.set('Authorization', `Bearer ${bearer}`);
  if (guestId) req.set('Cookie', `guestId=${guestId}`);
  return req.send({
    items,
    shipTo: SHIP_TO,
    shippingMethod: { id: 'standard', name: 'Standard', cost: 0 },
    paymentMethod: 'razorpay',
    ...(!bearer && { guestEmail: 'priya@example.com' }),
  });
}

const sourceOf = (order) => order.items.map(i => [i.name, i.externalSource ?? null]).sort();

// ---------------------------------------------------------------------------

describe('Checkout pre-fill from the verified handoff', () => {
  test('owner gets name, email, phone and address; other browsers get nothing', async () => {
    await transfer({ source: VEG, items: [{ wooProductId: '101', wooVariantId: null, qty: 1 }], guestId: 'guest_prefill' });

    const own = await request(app).get('/api/woo/cart/contact').set('Cookie', 'guestId=guest_prefill');
    expect(own.status).toBe(200);
    expect(own.headers['cache-control']).toBe('no-store');
    expect(own.body.data).toMatchObject({ ...ADDRESS, externalSource: VEG });

    const other = await request(app).get('/api/woo/cart/contact').set('Cookie', 'guestId=guest_someone_else');
    expect(other.body.data).toBeNull();
    const noCookie = await request(app).get('/api/woo/cart/contact');
    expect(noCookie.body.data).toBeNull();
    expect(noCookie.headers['set-cookie']).toBeUndefined();
  });

  test('logged-in customer: pre-fill is tied to their account cart', async () => {
    await transfer({ source: STYLE, items: [{ wooProductId: '202', wooVariantId: '55', qty: 1 }], bearer: userToken });
    const res = await request(app).get('/api/woo/cart/contact').set('Authorization', `Bearer ${userToken}`);
    expect(res.body.data).toMatchObject({ fullName: 'Priya R', externalSource: STYLE });
  });

  test('only known checkout fields are kept', async () => {
    await transfer({
      source: VEG, items: [{ wooProductId: '101', wooVariantId: null, qty: 1 }], guestId: 'guest_fields',
      address: { ...ADDRESS, password: 'secret', role: 'admin' },
    });
    const res = await request(app).get('/api/woo/cart/contact').set('Cookie', 'guestId=guest_fields');
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.role).toBeUndefined();
  });
});

describe('Mixed carts in the cart', () => {
  test('native add of a transferred product creates a native line, not a bigger Woo line', async () => {
    await transfer({ source: VEG, items: [{ wooProductId: '101', wooVariantId: null, qty: 2 }], guestId: 'guest_mixed' });
    await nativeAdd({ productId: cutter._id, quantity: 1, guestId: 'guest_mixed' });
    await nativeAdd({ productId: cutter._id, quantity: 1, guestId: 'guest_mixed' });

    const cart = await Cart.findOne({ guestId: 'guest_mixed' });
    expect(cart.items.map(i => [i.qty, i.externalSource])).toEqual([[2, VEG], [2, null]]);
  });

  test('cart/add cannot set externalSource from the request', async () => {
    await nativeAdd({ productId: peeler._id, quantity: 1, guestId: 'guest_spoof_add', externalSource: STYLE });
    const cart = await Cart.findOne({ guestId: 'guest_spoof_add' });
    expect(cart.items[0].externalSource).toBeNull();
  });
});

describe('Orders through the existing checkout', () => {
  test('guest, mixed cart (native + store): one order, per-item attribution, DB prices and GST', async () => {
    const guestId = 'guest_order';
    await nativeAdd({ productId: peeler._id, quantity: 1, guestId });
    await transfer({ source: VEG, items: [{ wooProductId: '101', wooVariantId: null, qty: 2 }], guestId });
    const cart = await Cart.findOne({ guestId });

    const res = await placeOrder(linesFromCart(cart), { guestId });
    expect(res.status).toBe(201);
    expect(res.body.data.vendorOrders).toHaveLength(1);

    const order = await Order.findById(res.body.data.vendorOrders[0]._id).lean();
    expect(order.source).toBe('online');
    expect(sourceOf(order)).toEqual([['Peeler', null], ['Veg Cutter', VEG]]);
    // 500 + 2×1500 = 3500; GST 18% on the cutter only = 540
    expect(order.totals).toMatchObject({ subtotal: 3500, tax: 540, total: 4040 });

    expect((await Product.findById(cutter._id)).stock).toBe(18);
    expect((await Cart.findOne({ guestId })).wooContact).toBeUndefined();
  });

  test('a transfer from the other store replaces the first store items before ordering', async () => {
    const guestId = 'guest_switch_store';
    await nativeAdd({ productId: peeler._id, quantity: 1, guestId });
    await transfer({ source: VEG, items: [{ wooProductId: '101', wooVariantId: null, qty: 2 }], guestId });
    await transfer({ source: STYLE, items: [{ wooProductId: '202', wooVariantId: '55', qty: 1 }], guestId });
    const cart = await Cart.findOne({ guestId });
    expect(cart.items.map(i => i.externalSource ?? null).sort()).toEqual([null, STYLE].sort());

    const res = await placeOrder(linesFromCart(cart), { guestId });
    expect(res.status).toBe(201);
    const order = await Order.findById(res.body.data.vendorOrders[0]._id).lean();
    expect(sourceOf(order)).toEqual([['Kurta', STYLE], ['Peeler', null]]);
    expect(order.items.find(i => i.name === 'Kurta')).toMatchObject({ priceSnapshot: 1200, variantName: 'Red' });
    expect((await Product.findById(cutter._id)).stock).toBe(20);
    expect((await Product.findById(kurta._id)).variants[0].stock).toBe(4);
  });

  test('logged-in customer: attribution recorded and account cart cleared as before', async () => {
    await transfer({ source: VEG, items: [{ wooProductId: '101', wooVariantId: null, qty: 1 }], bearer: userToken });
    const cart = await Cart.findOne({ userId: user._id });

    const res = await placeOrder(linesFromCart(cart), { bearer: userToken });
    expect(res.status).toBe(201);
    const order = await Order.findById(res.body.data.vendorOrders[0]._id).lean();
    expect(String(order.userId)).toBe(String(user._id));
    expect(sourceOf(order)).toEqual([['Veg Cutter', VEG]]);
    expect(await Cart.findOne({ userId: user._id })).toBeNull();
  });

  test('a transferred cart cannot be partly checked out', async () => {
    const guestId = 'guest_partial';
    await nativeAdd({ productId: peeler._id, quantity: 1, guestId });
    await transfer({ source: VEG, items: [{ wooProductId: '101', wooVariantId: null, qty: 2 }], guestId });
    const lines = linesFromCart(await Cart.findOne({ guestId }));

    const dropped = await placeOrder(lines.slice(0, 1), { guestId });
    expect(dropped.status).toBe(409);
    expect(dropped.body.error.code).toBe('CART_MISMATCH');

    const fewer = await placeOrder(lines.map(l => ({ ...l, qty: 1 })), { guestId });
    expect(fewer.status).toBe(409);

    expect(await Order.countDocuments()).toBe(0);
    expect((await Product.findById(cutter._id)).stock).toBe(20);
  });

  test('omitting cartItemIds cannot strip attribution', async () => {
    const guestId = 'guest_strip';
    await transfer({ source: VEG, items: [{ wooProductId: '101', wooVariantId: null, qty: 1 }], guestId });
    const res = await placeOrder([{ productId: String(cutter._id), qty: 1 }], { guestId });
    expect(res.status).toBe(409);
    expect(await Order.countDocuments()).toBe(0);
  });

  test('a client-supplied externalSource is ignored', async () => {
    const guestId = 'guest_claim';
    await nativeAdd({ productId: peeler._id, quantity: 1, guestId });
    const items = linesFromCart(await Cart.findOne({ guestId })).map(l => ({ ...l, externalSource: STYLE }));
    const res = await placeOrder(items, { guestId });
    expect(res.status).toBe(201);
    const order = await Order.findById(res.body.data.vendorOrders[0]._id).lean();
    expect(order.items[0].externalSource).toBeNull();
  });

  test('native-only checkout without cartItemIds behaves as before', async () => {
    const res = await placeOrder([{ productId: String(peeler._id), qty: 2 }], { bearer: userToken });
    expect(res.status).toBe(201);
    const order = await Order.findById(res.body.data.vendorOrders[0]._id).lean();
    expect(order.items[0].externalSource).toBeNull();
  });

  test('stock is checked across native and transferred lines of the same product', async () => {
    const guestId = 'guest_overstock';
    await transfer({ source: VEG, items: [{ wooProductId: '101', wooVariantId: null, qty: 12 }], guestId });
    await Cart.updateOne({ guestId }, { $push: { items: { productId: cutter._id, variantId: null, qty: 10, priceSnapshot: 1500, name: 'Veg Cutter' } } });

    const res = await placeOrder(linesFromCart(await Cart.findOne({ guestId })), { guestId });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(await Order.countDocuments()).toBe(0);
    expect((await Product.findById(cutter._id)).stock).toBe(20);
  });

  test('transferred cart spanning two sellers is refused before any stock is reserved', async () => {
    const guestId = 'guest_sellers';
    await transfer({
      source: VEG, guestId,
      items: [{ wooProductId: '101', wooVariantId: null, qty: 1 }, { wooProductId: '909', wooVariantId: null, qty: 1 }],
    });
    const res = await placeOrder(linesFromCart(await Cart.findOne({ guestId })), { guestId });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MULTI_SELLER_CART_UNSUPPORTED');
    expect(await Order.countDocuments()).toBe(0);
    expect((await Product.findById(cutter._id)).stock).toBe(20);
  });
});

describe('Admin order filters', () => {
  test('orders can be filtered by item source', async () => {
    await placeOrder([{ productId: String(peeler._id), qty: 1 }], { bearer: userToken });   // native only
    await transfer({ source: STYLE, items: [{ wooProductId: '202', wooVariantId: '55', qty: 1 }], guestId: 'guest_admin' });
    await placeOrder(linesFromCart(await Cart.findOne({ guestId: 'guest_admin' })), { guestId: 'guest_admin' });

    const list = (itemSource) => request(app).get('/api/admin/orders').query({ itemSource })
      .set('Authorization', `Bearer ${adminToken}`).then(r => r.body.data.map(o => o.items[0].name));

    expect(await list('external')).toEqual(['Kurta']);
    expect(await list(STYLE)).toEqual(['Kurta']);
    expect(await list(VEG)).toEqual([]);
    expect(await list('vtech')).toEqual(['Peeler']);
  });
});

describe('attributeOrderItems', () => {
  const line = (id, source, qty = 1) => ({ _id: id, productId: 'p' + id, variantId: null, qty, externalSource: source });

  test('takes sources from matching cart lines and checks the whole cart', () => {
    const cart = [line('1', null), line('2', VEG, 2)];
    const out = attributeOrderItems([
      { cartItemId: '1', productId: 'p1', qty: 1 },
      { cartItemId: '2', productId: 'p2', qty: 2 },
    ], cart);
    expect(out).toEqual({ sources: [null, VEG], hasExternal: true, wholeCart: true });
  });

  test('a cartItemId pointing at another product gives no source', () => {
    const out = attributeOrderItems([{ cartItemId: '2', productId: 'p1', qty: 2 }], [line('2', VEG, 2)]);
    expect(out.sources).toEqual([null]);
    expect(out.wholeCart).toBe(false);
  });

  test('the same cart line used twice is not the whole cart', () => {
    const cart = [line('1', VEG), line('2', null)];
    const out = attributeOrderItems([
      { cartItemId: '1', productId: 'p1', qty: 1 },
      { cartItemId: '1', productId: 'p1', qty: 1 },
    ], cart);
    expect(out.wholeCart).toBe(false);
  });
});
