const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Order = require('../../models/Order');
const { generateAccessToken } = require('../../utils/jwt');

describe('Order Integration Tests', () => {
  let userToken;
  let userId;
  let orderId;

  beforeEach(async () => {
    const { hashPassword } = require('../../utils/hash');

    // Create user
    const user = await User.create({
      name: 'Test User',
      email: 'order@test.com',
      password: await hashPassword('password123456'),
      emailVerified: true,
    });

    userId = user._id;
    userToken = generateAccessToken(user._id, 'customer');

    // Create order
    const order = await Order.create({
      orderId: 'TEST-ORDER-123',
      userId,
      status: 'placed',
      items: [{
        product: '507f1f77bcf86cd799439011',
        quantity: 1,
        price: 100,
      }],
      totals: {
        subtotal: 100,
        tax: 10,
        shipping: 5,
        total: 115,
      },
    });

    orderId = order.orderId;
  });

  describe('GET /api/orders', () => {
    test('should get user orders', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/orders/:orderId', () => {
    test('should get order details', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBe(orderId);
    });

    test('should not get other user order', async () => {
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@test.com',
        password: 'hashedpassword',
      });

      const otherOrder = await Order.create({
        orderId: 'OTHER-ORDER-123',
        userId: otherUser._id,
        status: 'placed',
        items: [],
        totals: { subtotal: 0, tax: 0, shipping: 0, total: 0 },
      });

      const response = await request(app)
        .get(`/api/orders/${otherOrder.orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/orders/:orderId/cancel', () => {
    test('should cancel order', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });
  });
});
