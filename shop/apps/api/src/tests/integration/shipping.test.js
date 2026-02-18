const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Order = require('../../models/Order');
const { generateAccessToken } = require('../../utils/jwt');

// Mock email service to prevent actual email sending in tests
jest.mock('../../services/emailService', () => ({
  sendOrderShippedEmail: jest.fn().mockResolvedValue(true),
  sendEmail: jest.fn().mockResolvedValue(true),
}));

describe('Shipping Integration Tests', () => {
  let vendorToken;
  let vendorUser;
  let vendor;
  let orderId;

  beforeEach(async () => {
    const { hashPassword } = require('../../utils/hash');

    // Create vendor user
    vendorUser = await User.create({
      name: 'Vendor User',
      email: 'vendor@test.com',
      password: await hashPassword('password123456'),
      role: 'vendor',
      emailVerified: true,
    });

    vendorToken = generateAccessToken(vendorUser._id, 'vendor');

    // Create vendor with approved KYC
    vendor = await Vendor.create({
      userId: vendorUser._id,
      storeName: 'Test Vendor Store',
      slug: 'test-vendor-store',
      status: 'active',
      kyc: {
        status: 'approved',
        submittedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    // Link vendor profile to user
    vendorUser.vendorProfile = vendor._id;
    await vendorUser.save();

    // Create order using vendor's _id as items.vendorId
    const order = await Order.create({
      orderId: 'TEST-ORDER-123',
      userId: vendorUser._id,
      status: 'paid',
      items: [{
        productId: '507f1f77bcf86cd799439011',
        vendorId: vendor._id,
        qty: 1,
        priceSnapshot: 100,
        name: 'Test Product',
      }],
      totals: {
        subtotal: 100,
        tax: 10,
        shipping: 5,
        total: 115,
      },
    });

    // Use MongoDB _id for API calls since routes validate as ObjectId
    orderId = order._id.toString();
  });

  describe('POST /api/shipping/orders/:orderId/carrier', () => {
    test('should set carrier and AWB', async () => {
      const response = await request(app)
        .post(`/api/shipping/orders/${orderId}/carrier`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          carrier: 'FedEx',
          awb: '123456789',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.shipment.carrier).toBe('FedEx');
      expect(response.body.data.shipment.awb).toBe('123456789');
    });

    test('should return 404 for non-existent order', async () => {
      const fakeId = '507f1f77bcf86cd799439099';
      const response = await request(app)
        .post(`/api/shipping/orders/${fakeId}/carrier`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          carrier: 'FedEx',
          awb: '123456789',
        });

      expect(response.status).toBe(404);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/shipping/orders/${orderId}/carrier`)
        .send({
          carrier: 'FedEx',
          awb: '123456789',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/shipping/orders/:orderId/packed', () => {
    test('should mark as packed', async () => {
      const response = await request(app)
        .post(`/api/shipping/orders/${orderId}/packed`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('packed');
    });
  });

  describe('POST /api/shipping/orders/:orderId/shipped', () => {
    test('should mark as shipped', async () => {
      // First set carrier info
      await request(app)
        .post(`/api/shipping/orders/${orderId}/carrier`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          carrier: 'FedEx',
          awb: '123456789',
        });

      // Then mark as packed
      await request(app)
        .post(`/api/shipping/orders/${orderId}/packed`)
        .set('Authorization', `Bearer ${vendorToken}`);

      // Then mark as shipped
      const response = await request(app)
        .post(`/api/shipping/orders/${orderId}/shipped`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('shipped');
    });
  });
});
