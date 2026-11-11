// Invoice numbers: only paid orders, in the order payments are confirmed, no gaps or duplicates.
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Order = require('../../models/Order');
const Counter = require('../../models/Counter');
const { assignInvoiceNumber, isInvoiceable } = require('../../services/invoiceNumberService');

let n = 0;
const makeOrder = (over = {}) => Order.create({
  orderId: `TEST-INV-${Date.now()}-${n++}`,
  userId: '507f1f77bcf86cd799439011',
  status: 'pending_payment',
  items: [{ productId: '507f1f77bcf86cd799439022', qty: 1, priceSnapshot: 500, name: 'Invoice Test Product' }],
  totals: { subtotal: 500, tax: 0, shipping: 0, total: 500 },
  payment: { status: 'pending' },
  ...over,
});
const pay = (order) => Order.updateOne({ _id: order._id }, { $set: { status: 'paid', 'payment.status': 'captured', 'payment.paidAt': new Date() } });

describe('Invoice numbers', () => {
  // Production MongoDB (Atlas) is a replica set, so numbers are given inside a transaction: test that path
  let replSet;
  beforeAll(async () => {
    await mongoose.disconnect();
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    await mongoose.connect(replSet.getUri());
    await Order.createCollection();
    await Counter.createCollection();
    await Order.syncIndexes();
  }, 120000);
  afterAll(async () => {
    await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  beforeEach(async () => {
    await Order.deleteMany({});
    await Counter.deleteMany({});
  });

  it('a pending order gets no invoice number', async () => {
    const order = await makeOrder();
    expect(await assignInvoiceNumber(order._id)).toBeNull();
    expect((await Order.findById(order._id)).invoiceNumber).toBeUndefined();
  });

  it('an order moved to "paid" by hand while its payment is pending gets no number', async () => {
    const order = await makeOrder({ status: 'packed', payment: { status: 'pending' } });
    expect(isInvoiceable(order)).toBe(false);
    expect(await assignInvoiceNumber(order._id)).toBeNull();
  });

  it('numbers follow the order payments are confirmed, not the order the orders were placed', async () => {
    const first = await makeOrder();
    const second = await makeOrder();
    const third = await makeOrder();
    await pay(third);
    expect(await assignInvoiceNumber(third._id)).toBe('W-00001');
    await pay(first);
    expect(await assignInvoiceNumber(first._id)).toBe('W-00002');
    // second never paid
    expect(await assignInvoiceNumber(second._id)).toBeNull();
    const nextPaid = await makeOrder();
    await pay(nextPaid);
    expect(await assignInvoiceNumber(nextPaid._id)).toBe('W-00003');
  });

  it('calling it again keeps the same number', async () => {
    const order = await makeOrder();
    await pay(order);
    const a = await assignInvoiceNumber(order._id);
    const b = await assignInvoiceNumber(order._id);
    expect(a).toBe('W-00001');
    expect(b).toBe('W-00001');
    expect((await Counter.findById('invoice_W')).seq).toBe(1);
  });

  it('many calls at the same time (verify + webhook + downloads) use one number, no gap', async () => {
    const orders = [await makeOrder(), await makeOrder(), await makeOrder()];
    for (const o of orders) await pay(o);
    const results = await Promise.all(orders.flatMap(o => Array.from({ length: 4 }, () => assignInvoiceNumber(o._id))));
    const perOrder = orders.map((_, i) => new Set(results.slice(i * 4, i * 4 + 4)));
    perOrder.forEach(set => expect(set.size).toBe(1));
    const numbers = perOrder.map(set => [...set][0]).sort();
    expect(numbers).toEqual(['W-00001', 'W-00002', 'W-00003']);
    expect((await Counter.findById('invoice_W')).seq).toBe(3);
  });

  it('manual in-store orders use their own M series', async () => {
    const order = await makeOrder({ source: 'in-store', status: 'delivered', payment: { status: 'paid' } });
    expect(await assignInvoiceNumber(order._id)).toBe('M-00001');
  });

  it('an order paid before the series start gets no new number; one placed earlier but paid now does', async () => {
    const order = await makeOrder();
    await pay(order);
    await Order.collection.updateOne({ _id: order._id }, { $set: { 'payment.paidAt': new Date('2026-11-05T18:00:00+05:30') } });
    expect(await assignInvoiceNumber(order._id)).toBeNull();
    const placedEarlier = await makeOrder();
    await Order.collection.updateOne({ _id: placedEarlier._id }, { $set: { createdAt: new Date('2026-11-08T12:00:00+05:30') } });
    await pay(placedEarlier);
    expect(await assignInvoiceNumber(placedEarlier._id)).toBe('W-00001');
  });

  it('an old order without a payment date uses its order date for the series start', async () => {
    const order = await makeOrder({ status: 'delivered' });
    await Order.collection.updateOne({ _id: order._id }, { $unset: { 'payment.status': 1 }, $set: { createdAt: new Date('2025-11-20T12:00:00+05:30') } });
    expect(await assignInvoiceNumber(order._id)).toBeNull();
  });

  it('old orders saved without a payment status fall back to the order status', async () => {
    const order = await makeOrder({ status: 'delivered' });
    await Order.updateOne({ _id: order._id }, { $unset: { 'payment.status': 1 } });
    expect(await assignInvoiceNumber(order._id)).toBe('W-00001');
  });
});
