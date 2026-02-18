const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Order = require('../../models/Order');
const { hashPassword } = require('../../utils/hash');

// Mock Razorpay utilities
jest.mock('../../utils/razorpay', () => ({
  isConfigured: true,
  createOrder: jest.fn(),
  verifyPaymentSignature: jest.fn(),
  fetchPayment: jest.fn(),
  createTransfers: jest.fn(),
}));

// Mock notification services
jest.mock('../../services/notificationService', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  notify: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/notificationHelper', () => ({
  notifyVendorsAboutOrder: jest.fn().mockResolvedValue(true),
  notifyAdminNewOrder: jest.fn().mockResolvedValue(true),
}));

const razorpay = require('../../utils/razorpay');

describe('Payment Integration Tests', () => {
  let user, accessToken, order;

  beforeEach(async () => {
    user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: await hashPassword('password123456'),
      emailVerified: true,
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123456',
      });

    accessToken = loginResponse.body.data.accessToken;

    // Create a pending order for payment
    order = await Order.create({
      orderId: 'TEST-PAY-001',
      userId: user._id,
      status: 'pending',
      items: [{
        productId: '507f1f77bcf86cd799439011',
        vendorId: '507f1f77bcf86cd799439022',
        qty: 1,
        priceSnapshot: 500,
        name: 'Test Product',
      }],
      totals: {
        subtotal: 500,
        tax: 90,
        shipping: 50,
        total: 640,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payment/razorpay/create-order', () => {
    test('should create Razorpay order', async () => {
      razorpay.createOrder.mockResolvedValue({
        success: true,
        order: {
          id: 'order_test_123',
          amount: 64000, // 640 * 100 paise
          currency: 'INR',
        },
      });

      const response = await request(app)
        .post('/api/payment/razorpay/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: order._id.toString(),
          amount: 640,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderId', 'order_test_123');
      expect(response.body.data).toHaveProperty('amount', 64000);
    });

    test('should reject missing orderId', async () => {
      const response = await request(app)
        .post('/api/payment/razorpay/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 640,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject non-existent order', async () => {
      const response = await request(app)
        .post('/api/payment/razorpay/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: '507f1f77bcf86cd799439099',
          amount: 640,
        });

      expect(response.status).toBe(404);
    });

    test('should reject order owned by another user', async () => {
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: await hashPassword('password123456'),
        emailVerified: true,
      });

      const otherOrder = await Order.create({
        orderId: 'TEST-PAY-002',
        userId: otherUser._id,
        status: 'pending',
        items: [{
          productId: '507f1f77bcf86cd799439011',
          qty: 1,
          priceSnapshot: 100,
          name: 'Other Product',
        }],
        totals: { subtotal: 100, tax: 0, shipping: 0, total: 100 },
      });

      const response = await request(app)
        .post('/api/payment/razorpay/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: otherOrder._id.toString(),
          amount: 100,
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/payment/razorpay/key', () => {
    test('should return Razorpay key', async () => {
      const response = await request(app)
        .get('/api/payment/razorpay/key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('keyId');
    });
  });

  describe('POST /api/payment/razorpay/failure', () => {
    test('should handle payment failure', async () => {
      const response = await request(app)
        .post('/api/payment/razorpay/failure')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderId: order._id.toString(),
          error: 'Payment cancelled by user',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject missing orderId', async () => {
      const response = await request(app)
        .post('/api/payment/razorpay/failure')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          error: { description: 'Payment cancelled' },
        });

      expect(response.status).toBe(400);
    });
  });
});
