'use strict';
// End-to-end WooCommerce → VTech cart transfer over real HTTP:
// signed handoff (storefront server) → landing page (browser form POST) → cart import (SPA).

const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Product = require('../../models/Product');
const Cart = require('../../models/Cart');
const WooProductMapping = require('../../models/WooProductMapping');
const WooHandoffToken = require('../../models/WooHandoffToken');
const { generateAccessToken } = require('../../utils/jwt');
const { buildCanonical, computeHmac, sha256hex } = require('../../utils/wooHmac');

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

let nonceSeq = 0;
let userId;
let userToken;
let simple;        // published, no variants, price 1500, stock 20
let second;        // published, no variants, price 500, stock 10
let variable;      // published, variants Red(1200, stock 5) / Blue(1300, stock 8)
let unpublished;
let foreignVariantId; // a variant that belongs to a different product

beforeAll(() => {
  process.env.WOO_SECRET_VEGETABLE = SECRETS[VEG];
  process.env.WOO_SECRET_STYLE = SECRETS[STYLE];
});

beforeEach(async () => {
  const user = await User.create({ name: 'Woo Buyer', email: 'woo-buyer@test.com', password: 'x'.repeat(60), emailVerified: true });
  userId = user._id;
  userToken = generateAccessToken(user._id, 'customer');

  const vendor = await Vendor.create({ userId: user._id, storeName: 'VTech', slug: 'vtech', status: 'active' });
  const base = { vendorId: vendor._id, description: 'd', published: true };

  simple = await Product.create({ ...base, title: 'Veg Cutter', slug: 'veg-cutter', price: 1500, stock: 20 });
  second = await Product.create({ ...base, title: 'Peeler', slug: 'peeler', price: 500, stock: 10 });
  variable = await Product.create({
    ...base, title: 'Kurta', slug: 'kurta', price: 1000, stock: 0,
    variants: [
      { name: 'Red', sku: 'K-RED', price: 1200, stock: 5 },
      { name: 'Blue', sku: 'K-BLUE', price: 1300, stock: 8 },
    ],
  });
  unpublished = await Product.create({ ...base, title: 'Hidden', slug: 'hidden', price: 10, stock: 10, published: false });
  const other = await Product.create({
    ...base, title: 'Other', slug: 'other', price: 1, stock: 0,
    variants: [{ name: 'X', sku: 'O-X', price: 1, stock: 99 }],
  });
  foreignVariantId = String(other.variants[0]._id);

  const map = (externalSource, wooProductId, wooVariantId, product, vtechVariantId = null, active = true) =>
    ({ externalSource, wooProductId, wooVariantId, vtechProductId: product._id, vtechVariantId, active });

  await WooProductMapping.create([
    map(VEG, '101', null, simple),
    map(VEG, '303', null, simple),                       // second Woo product → same VTech product
    map(VEG, '808', null, second),
    map(VEG, '404', null, simple, null, false),          // inactive
    map(VEG, '505', null, unpublished),
    map(VEG, '606', null, variable),                     // variant product without a variant
    map(VEG, '707', '1', variable, foreignVariantId),    // variant owned by another product
    map(STYLE, '202', '55', variable, String(variable.variants[0]._id)),
    map(STYLE, '202', '56', variable, String(variable.variants[1]._id)),
  ]);
});

function signedHandoff({ source = VEG, items, address = ADDRESS, secret, timestamp }) {
  const nonce = `testnonce${Date.now()}x${++nonceSeq}`;
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signature = computeHmac(buildCanonical('POST', '/api/woo/handoff', source, nonce, ts, items, address), secret ?? SECRETS[source]);
  return request(app)
    .post('/api/woo/handoff')
    .set('X-Woo-Signature', `sha256=${signature}`)
    .send({ externalSource: source, nonce, timestamp: ts, items, address });
}

async function issueToken(opts) {
  const res = await signedHandoff(opts);
  expect(res.status).toBe(201);
  return res.body.token;
}

function importCart(token, { guestId, bearer } = {}) {
  const req = request(app).post('/api/woo/cart/import');
  if (bearer) req.set('Authorization', `Bearer ${bearer}`);
  if (guestId) req.set('Cookie', `guestId=${guestId}`);
  return req.send({ token });
}

const item = (wooProductId, qty, wooVariantId = null) => ({ wooProductId, wooVariantId, qty });
const codes = (res) => res.body.error.items.map(e => e.code);

// ---------------------------------------------------------------------------

describe('Handoff — validated while the customer is still on the storefront', () => {
  test('signed request over HTTP is accepted (path, Tamil text and & in address)', async () => {
    const res = await signedHandoff({ items: [item('101', 1)], address: { ...ADDRESS, fullName: 'முருகன் S/O Raj' } });
    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^[a-f0-9]{64}$/);
  });

  test('stores only the token hash, never the raw token', async () => {
    const token = await issueToken({ items: [item('101', 1)] });
    const doc = await WooHandoffToken.findOne({}).lean();
    expect(doc.tokenHash).toBe(sha256hex(token));
    expect(JSON.stringify(doc)).not.toContain(token);
  });

  test('wrong storefront secret is rejected', async () => {
    const res = await signedHandoff({ source: STYLE, secret: SECRETS[VEG], items: [item('202', 1, '55')] });
    expect(res.status).toBe(401);
  });

  test('missing mapping → 422, no token issued', async () => {
    const res = await signedHandoff({ items: [item('101', 1), item('999', 1)] });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CART_NOT_TRANSFERABLE');
    expect(res.body.error.items).toEqual([expect.objectContaining({ wooProductId: '999', code: 'MAPPING_NOT_FOUND' })]);
    expect(res.body.token).toBeUndefined();
    expect(await WooHandoffToken.countDocuments()).toBe(0);
  });

  test('inactive mapping → MAPPING_INACTIVE', async () => {
    const res = await signedHandoff({ items: [item('404', 1)] });
    expect(res.status).toBe(422);
    expect(codes(res)).toEqual(['MAPPING_INACTIVE']);
  });

  test("a mapping on the other storefront does not apply", async () => {
    const res = await signedHandoff({ source: VEG, items: [item('202', 1, '55')] });
    expect(res.status).toBe(422);
    expect(codes(res)).toEqual(['MAPPING_NOT_FOUND']);
  });

  test('invalid quantities → INVALID_QUANTITY for each bad line', async () => {
    const res = await signedHandoff({ items: [item('101', 0), item('303', 101), item('808', 1.5)] });
    expect(res.status).toBe(422);
    expect(codes(res)).toEqual(['INVALID_QUANTITY', 'INVALID_QUANTITY', 'INVALID_QUANTITY']);
  });

  test('variant belonging to a different product → VARIANT_NOT_FOUND', async () => {
    const res = await signedHandoff({ items: [item('707', 1, '1')] });
    expect(codes(res)).toEqual(['VARIANT_NOT_FOUND']);
  });

  test('variant product mapped without a variant → VARIANT_REQUIRED', async () => {
    const res = await signedHandoff({ items: [item('606', 1)] });
    expect(codes(res)).toEqual(['VARIANT_REQUIRED']);
  });

  test('unpublished VTech product → PRODUCT_UNAVAILABLE', async () => {
    const res = await signedHandoff({ items: [item('505', 1)] });
    expect(codes(res)).toEqual(['PRODUCT_UNAVAILABLE']);
  });

  test('quantity above VTech stock → INSUFFICIENT_STOCK', async () => {
    const res = await signedHandoff({ source: STYLE, items: [item('202', 6, '55')] });
    expect(codes(res)).toEqual(['INSUFFICIENT_STOCK']);
  });
});

describe('Landing page — relays the token without putting it in a URL', () => {
  test('serves a no-store, no-referrer page that hands off via sessionStorage', async () => {
    const token = await issueToken({ items: [item('101', 1)] });
    const res = await request(app).post('/api/woo/landing').type('form').send({ token });

    expect(res.status).toBe(200);
    expect(res.headers.location).toBeUndefined();
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cache-control']).toBe('no-store');
    const csp = res.headers['content-security-policy'];
    const nonce = /'nonce-([^']+)'/.exec(csp)[1];
    expect(csp).toContain("default-src 'none'");
    expect(res.text).toContain(`<script nonce="${nonce}">`);
    expect(res.text).toContain("sessionStorage.setItem('vtech_woo_handoff'");
    expect(res.text).toContain("location.replace('/woo-checkout')");
  });

  test('does not consume the token', async () => {
    const token = await issueToken({ items: [item('101', 1)] });
    await request(app).post('/api/woo/landing').type('form').send({ token });
    expect((await importCart(token, { guestId: 'guest_landing' })).status).toBe(200);
  });

  test('accepts the form POST from a store page (browser sends the store Origin)', async () => {
    const token = await issueToken({ items: [item('101', 1)] });
    for (const origin of ['https://vegetablecuttingmachine.com', 'https://styleyourlyf.com']) {
      const res = await request(app).post('/api/woo/landing').set('Origin', origin).type('form').send({ token });
      expect(res.status).toBe(200);
      expect(res.text).toContain("location.replace('/woo-checkout')");
      // A navigation needs no CORS headers; none are added for the store
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    }
  });

  test('other API routes still refuse unknown origins', async () => {
    const res = await request(app).post('/api/woo/cart/import').set('Origin', 'https://vegetablecuttingmachine.com').send({});
    expect(res.status).not.toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('never reflects a malformed token into the page', async () => {
    const evil = '</script><script>alert(1)</script>';
    const res = await request(app).post('/api/woo/landing').type('form').send({ token: evil });
    expect(res.text).not.toContain('alert(1)');
    expect(res.text).toContain('var t=null;');
    expect(res.text).toContain('vtech_woo_handoff_error');
  });
});

describe('Cart import', () => {
  test('guest, simple product (vegetablecuttingmachine): price comes from VTech, not WooCommerce', async () => {
    const token = await issueToken({ items: [{ ...item('101', 2), price: 1, vendorId: 'evil', name: 'Free' }] });
    const res = await importCart(token, { guestId: 'guest_simple' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ externalSource: VEG, importedLines: 1, importedQuantity: 2 });
    expect(JSON.stringify(res.body)).not.toContain(String(simple._id));

    const cart = await Cart.findOne({ guestId: 'guest_simple' });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ qty: 2, priceSnapshot: 1500, name: 'Veg Cutter', variantId: null });
    expect(cart.totals.subtotal).toBe(3000);
  });

  test('guest without a cookie gets the standard guestId cookie and cart', async () => {
    const token = await issueToken({ items: [item('101', 1)] });
    const res = await importCart(token);
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'].find(c => c.startsWith('guestId='));
    const guestId = decodeURIComponent(cookie.split(';')[0].slice('guestId='.length));
    expect(await Cart.countDocuments({ guestId })).toBe(1);
  });

  test('variable products (styleyourlyf): each variant uses its own price and name', async () => {
    const token = await issueToken({ source: STYLE, items: [item('202', 1, '55'), item('202', 2, '56')] });
    const res = await importCart(token, { guestId: 'guest_variant' });
    expect(res.status).toBe(200);

    const cart = await Cart.findOne({ guestId: 'guest_variant' });
    const byVariant = Object.fromEntries(cart.items.map(i => [i.variantName, i]));
    expect(byVariant.Red).toMatchObject({ qty: 1, priceSnapshot: 1200, variantId: String(variable.variants[0]._id) });
    expect(byVariant.Blue).toMatchObject({ qty: 2, priceSnapshot: 1300, variantId: String(variable.variants[1]._id) });
  });

  test('multiple items; two Woo products mapped to one VTech product are merged', async () => {
    const token = await issueToken({ items: [item('101', 2), item('808', 1), item('303', 3)] });
    await importCart(token, { guestId: 'guest_multi' });
    const cart = await Cart.findOne({ guestId: 'guest_multi' });
    const qtyByName = Object.fromEntries(cart.items.map(i => [i.name, i.qty]));
    expect(qtyByName).toEqual({ 'Veg Cutter': 5, Peeler: 1 });
  });

  test('logged-in VTech customer: imports into their account cart, keeps native items', async () => {
    await Cart.create({
      userId,
      items: [{ productId: variable._id, variantId: String(variable.variants[1]._id), qty: 1, priceSnapshot: 1300, name: 'Kurta' }],
    });
    const token = await issueToken({ items: [item('101', 1)] });
    const res = await importCart(token, { bearer: userToken });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'] || []).not.toEqual(expect.arrayContaining([expect.stringMatching(/^guestId=/)]));

    const cart = await Cart.findOne({ userId });
    expect(cart.items.map(i => [i.name, i.qty])).toEqual([['Kurta', 1], ['Veg Cutter', 1]]);
    expect(await Cart.countDocuments({ guestId: { $exists: true } })).toBe(0);
  });

  test('same product as a native line gets its own attributed line; native qty unchanged', async () => {
    await Cart.create({ guestId: 'guest_merge', items: [{ productId: simple._id, variantId: null, qty: 4, priceSnapshot: 1500, name: 'Veg Cutter' }] });
    const token = await issueToken({ items: [item('101', 2)] });
    await importCart(token, { guestId: 'guest_merge' });
    const cart = await Cart.findOne({ guestId: 'guest_merge' });
    expect(cart.items.map(i => [i.qty, i.externalSource])).toEqual([[4, null], [2, VEG]]);
  });

  test('a second transfer from the same storefront replaces that storefront line (no adding up)', async () => {
    await importCart(await issueToken({ items: [item('101', 1)] }), { guestId: 'guest_twice' });
    await importCart(await issueToken({ items: [item('101', 2)] }), { guestId: 'guest_twice' });
    const cart = await Cart.findOne({ guestId: 'guest_twice' });
    expect(cart.items.map(i => [i.qty, i.externalSource])).toEqual([[2, VEG]]);
  });

  test('a transfer replaces every earlier store line but keeps items added on VTech', async () => {
    await Cart.create({ guestId: 'guest_switch', items: [{ productId: simple._id, variantId: null, qty: 1, priceSnapshot: 1500, name: 'Veg Cutter' }] });
    await importCart(await issueToken({ items: [item('101', 2)] }), { guestId: 'guest_switch' });
    let cart = await Cart.findOne({ guestId: 'guest_switch' });
    expect(cart.items.map(i => [i.qty, i.externalSource ?? null])).toEqual([[1, null], [2, VEG]]);

    // The same transfer again (e.g. the shopper went back and pressed the button twice)
    await importCart(await issueToken({ items: [item('101', 2)] }), { guestId: 'guest_switch' });
    cart = await Cart.findOne({ guestId: 'guest_switch' });
    expect(cart.items.map(i => [i.qty, i.externalSource ?? null])).toEqual([[1, null], [2, VEG]]);
  });

  test('stock covers native and transferred lines of the same product together', async () => {
    await Cart.create({ guestId: 'guest_stock', items: [{ productId: simple._id, variantId: null, qty: 15, priceSnapshot: 1500, name: 'Veg Cutter' }] });
    const res = await importCart(await issueToken({ items: [item('101', 6)] }), { guestId: 'guest_stock' });
    expect(res.status).toBe(422);
    expect(codes(res)).toEqual(['INSUFFICIENT_STOCK']);
  });

  test('expired token → 410, nothing added', async () => {
    const token = await issueToken({ items: [item('101', 1)] });
    await WooHandoffToken.updateOne({ tokenHash: sha256hex(token) }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await importCart(token, { guestId: 'guest_expired' });
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
    expect(await Cart.findOne({ guestId: 'guest_expired' })).toBeNull();
  });

  test('token replayed by a different browser → 410, original cart untouched', async () => {
    const token = await issueToken({ items: [item('101', 2)] });
    expect((await importCart(token, { guestId: 'guest_a' })).status).toBe(200);
    const replay = await importCart(token, { guestId: 'guest_b' });
    expect(replay.status).toBe(410);
    expect(await Cart.findOne({ guestId: 'guest_b' })).toBeNull();
    expect((await Cart.findOne({ guestId: 'guest_a' })).items[0].qty).toBe(2);
  });

  test('duplicate submission from the same browser is idempotent', async () => {
    const token = await issueToken({ items: [item('101', 2)] });
    expect((await importCart(token, { guestId: 'guest_dup' })).status).toBe(200);
    const again = await importCart(token, { guestId: 'guest_dup' });
    expect(again.status).toBe(200);
    expect(again.body.data.alreadyImported).toBe(true);
    expect((await Cart.findOne({ guestId: 'guest_dup' })).items[0].qty).toBe(2);
  });

  test('concurrent duplicate submissions add the products exactly once', async () => {
    const token = await issueToken({ items: [item('101', 2)] });
    const results = await Promise.all([1, 2, 3].map(() => importCart(token, { guestId: 'guest_race' })));
    expect(results.filter(r => r.status === 200 && !r.body.data.alreadyImported)).toHaveLength(1);
    expect(results.every(r => r.status === 200 || r.status === 409)).toBe(true);
    const cart = await Cart.findOne({ guestId: 'guest_race' });
    expect(cart.items[0].qty).toBe(2);
  });

  test('atomic: one product becomes invalid after handoff → nothing imported, native cart intact', async () => {
    await Cart.create({ guestId: 'guest_atomic', items: [{ productId: simple._id, variantId: null, qty: 1, priceSnapshot: 1500, name: 'Veg Cutter' }] });
    const token = await issueToken({ items: [item('101', 2), item('808', 1)] });
    await Product.updateOne({ _id: second._id }, { $set: { published: false } });

    const res = await importCart(token, { guestId: 'guest_atomic' });
    expect(res.status).toBe(422);
    expect(res.body.error.items).toEqual([expect.objectContaining({ wooProductId: '808', code: 'PRODUCT_UNAVAILABLE' })]);

    const cart = await Cart.findOne({ guestId: 'guest_atomic' });
    expect(cart.items.map(i => [i.name, i.qty])).toEqual([['Veg Cutter', 1]]);
    expect((await WooHandoffToken.findOne({ tokenHash: sha256hex(token) })).status).toBe('rejected');
    expect((await importCart(token, { guestId: 'guest_atomic' })).status).toBe(410);
  });

  test('mapping deactivated after handoff → rejected at import', async () => {
    const token = await issueToken({ items: [item('101', 1)] });
    await WooProductMapping.updateOne({ externalSource: VEG, wooProductId: '101' }, { $set: { active: false } });
    const res = await importCart(token, { guestId: 'guest_deact' });
    expect(res.status).toBe(422);
    expect(codes(res)).toEqual(['MAPPING_INACTIVE']);
  });

  test('stock is checked against existing cart qty + imported qty', async () => {
    await Cart.create({ userId, items: [{ productId: simple._id, variantId: null, qty: 19, priceSnapshot: 1500, name: 'Veg Cutter' }] });
    const token = await issueToken({ items: [item('101', 2)] });
    const res = await importCart(token, { bearer: userToken });
    expect(res.status).toBe(422);
    expect(codes(res)).toEqual(['INSUFFICIENT_STOCK']);
    expect((await Cart.findOne({ userId })).items[0].qty).toBe(19);
  });

  test('malformed token → 400', async () => {
    const res = await importCart('not-a-token', { guestId: 'guest_bad' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});
