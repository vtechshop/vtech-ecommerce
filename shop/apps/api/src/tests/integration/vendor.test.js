// FILE: apps/api/src/tests/integration/vendor.test.js
const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Product = require('../../models/Product');
const { generateAccessToken } = require('../../utils/jwt');

describe('Vendor Integration Tests', () => {
  let vendorToken;
  let vendorUser;
  let vendor;

  beforeEach(async () => {
    const { hashPassword } = require('../../utils/hash');

    vendorUser = await User.create({
      name: 'Vendor User',
      email: 'vendor@test.com',
      password: await hashPassword('password123456'),
      role: 'vendor',
      emailVerified: true,
    });

    vendorToken = generateAccessToken(vendorUser._id, 'vendor');

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
  });

  describe('POST /api/vendors/products', () => {
    test('should create product as vendor', async () => {
      const response = await request(app)
        .post('/api/vendors/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Vendor Product',
          description: 'Test product',
          price: 99.99,
          stock: 50,
          categoryIds: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Vendor Product');
      expect(response.body.data.vendorId.toString()).toBe(vendor._id.toString());
    });
  });

  describe('GET /api/vendors/products', () => {
    beforeEach(async () => {
      await Product.create({
        vendorId: vendor._id,
        title: 'Vendor Product 1',
        slug: 'vendor-product-1',
        description: 'Test',
        price: 50,
        stock: 10,
        sku: 'VP-001',
        published: true,
      });
    });

    test('should get vendor products', async () => {
      const response = await request(app)
        .get('/api/vendors/products')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });
});