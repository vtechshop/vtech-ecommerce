// Returns can be requested only within 7 days of delivery.
const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Order = require('../../models/Order');
const { hashPassword } = require('../../utils/hash');
const { generateAccessToken } = require('../../utils/jwt');

const DAY = 24 * 60 * 60 * 1000;
let n = 0;

describe('7-day return window', () => {
  let customer, token;
  beforeEach(async () => {
    customer = await User.create({ name: 'Cust', email: `ret-${n++}@test.com`, password: await hashPassword('password123456'), emailVerified: true });
    token = generateAccessToken(customer._id, 'customer');
  });

  const deliveredDaysAgo = (days, where = 'event') => Order.create({
    orderId: `TEST-RET-${Date.now()}-${n++}`,
    userId: customer._id,
    status: 'delivered',
    items: [{ productId: '507f1f77bcf86cd799439022', qty: 1, priceSnapshot: 500, name: 'Return Test Product' }],
    totals: { subtotal: 500, tax: 0, shipping: 0, total: 500 },
    payment: { status: 'captured', paidAt: new Date(Date.now() - (days + 2) * DAY) },
    ...(where === 'shipment' ? { shipment: { deliveredAt: new Date(Date.now() - days * DAY) } } : {}),
    events: where === 'event' ? [{ status: 'delivered', description: 'Delivered', timestamp: new Date(Date.now() - days * DAY) }] : [],
  });
  const askReturn = (order) => request(app).post(`/api/orders/${order._id}/return`).set('Authorization', `Bearer ${token}`)
    .send({ items: [{ productId: order.items[0].productId, qty: 1, reason: 'Not as expected' }], reason: 'Not as expected' });

  it('allows a return 3 days after delivery', async () => {
    const res = await askReturn(await deliveredDaysAgo(3));
    expect(res.status).toBeLessThan(300);
    expect(res.body.success).toBe(true);
  });

  it('refuses a return 8 days after delivery', async () => {
    const res = await askReturn(await deliveredDaysAgo(8));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RETURN_WINDOW_CLOSED');
  });

  it('uses the carrier delivery date when there is one', async () => {
    const res = await askReturn(await deliveredDaysAgo(10, 'shipment'));
    expect(res.body.error.code).toBe('RETURN_WINDOW_CLOSED');
  });
});
