const request = require('supertest');
const crypto = require('crypto');
const app = require('../../app');
const Order = require('../../models/Order');

// Mock notification services
jest.mock('../../services/notificationService', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  notify: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/notificationHelper', () => ({
  notifyVendorsAboutOrder: jest.fn().mockResolvedValue(true),
  notifyAdminNewOrder: jest.fn().mockResolvedValue(true),
}));

const WEBHOOK_SECRET = 'test_webhook_secret';

/**
 * Generate valid Razorpay webhook signature
 */
function generateSignature(body) {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
}

describe('Webhooks Integration Tests', () => {
  let orderId;

  beforeAll(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  beforeEach(async () => {
    const order = await Order.create({
      orderId: 'TEST-ORDER-WH',
      userId: '507f1f77bcf86cd799439011',
      status: 'pending',
      items: [{
        productId: '507f1f77bcf86cd799439022',
        qty: 1,
        priceSnapshot: 100,
        name: 'Webhook Test Product',
      }],
      totals: { subtotal: 100, tax: 0, shipping: 0, total: 100 },
    });

    orderId = order._id.toString();
  });

  describe('POST /api/payment/razorpay/webhook', () => {
    test('should handle payment.captured event', async () => {
      const body = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              order_id: 'order_test_123',
              amount: 10000,
              currency: 'INR',
              status: 'captured',
              notes: {
                orderId: orderId,
              },
            },
          },
        },
      };

      const signature = generateSignature(body);

      const response = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify order was updated to paid
      const updatedOrder = await Order.findById(orderId);
      expect(updatedOrder.payment.status).toBe('paid');
    });

    test('should handle payment.failed event', async () => {
      const body = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_fail',
              order_id: 'order_test_fail',
              error_code: 'BAD_REQUEST_ERROR',
              notes: {
                orderId: orderId,
              },
            },
          },
        },
      };

      const signature = generateSignature(body);

      const response = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid signature', async () => {
      const body = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              notes: { orderId },
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', 'invalid_signature_here')
        .send(body);

      expect(response.status).toBe(400);
    });

    test('should handle unrecognized event gracefully', async () => {
      const body = {
        event: 'unknown.event',
        payload: {},
      };

      const signature = generateSignature(body);

      const response = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
