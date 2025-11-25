const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Product = require('../../models/Product');

describe('Product Integration Tests', () => {
  let productId;

  beforeEach(async () => {
    const { hashPassword } = require('../../utils/hash');

    // Create vendor user and vendor
    const vendorUser = await User.create({
      name: 'Vendor User',
      email: 'vendor@test.com',
      password: await hashPassword('password123456'),
      role: 'vendor',
      emailVerified: true,
    });

    const vendor = await Vendor.create({
      userId: vendorUser._id,
      storeName: 'Test Vendor Store',
      slug: 'test-vendor-store',
      status: 'active',
    });

    // Create product
    const product = await Product.create({
      vendorId: vendor._id,
      title: 'Test Product',
      slug: 'test-product',
      description: 'Test description',
      price: 99.99,
      stock: 10,
      sku: 'TEST-001',
      published: true,
      category: 'Test Category',
    });

    productId = product._id;
  });

  describe('GET /api/products', () => {
    test('should get products', async () => {
      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should filter by category', async () => {
      const response = await request(app)
        .get('/api/products?category=Test Category');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    test('should get product details', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Product');
    });

    test('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/507f1f77bcf86cd799439011');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/catalog/products', () => {
    test('should get catalog products', async () => {
      const response = await request(app)
        .get('/api/catalog/products');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
