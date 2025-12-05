const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Product = require('../../models/Product');
const Cart = require('../../models/Cart');
const { generateAccessToken } = require('../../utils/jwt');

describe('Checkout Integration Tests', () => {
  let userToken;
  let userId;
  let productId;
  let cartId;

  beforeEach(async () => {
    const { hashPassword } = require('../../utils/hash');

    // Create user
    const user = await User.create({
      name: 'Test User',
      email: 'checkout@test.com',
      password: await hashPassword('password123456'),
      emailVerified: true,
    });

    userId = user._id;
    userToken = generateAccessToken(user._id, 'customer');

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
      description: 'Test',
      price: 99.99,
      stock: 10,
      sku: 'TEST-001',
      published: true,
    });

    productId = product._id;

    // Create cart
    const cart = await Cart.create({
      userId,
      items: [{
        productId: productId,
        qty: 2,
      }],
    });

    cartId = cart._id;
  });

  describe('POST /api/orders', () => {
    test('should create order from cart', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{
            productId: productId,
            qty: 2,
          }],
          shipTo: {
            fullName: 'John Doe',
            phone: '1234567890',
            addressLine1: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345',
            country: 'Test Country',
          },
          shippingMethod: 'standard',
          paymentMethod: 'cod',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      // Multi-vendor order response structure
      expect(response.body.data).toHaveProperty('orderIds');
      expect(response.body.data).toHaveProperty('vendorOrders');
      expect(response.body.data.vendorOrders[0].status).toBe('placed');
    });

    test('should require items', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shipTo: {
            fullName: 'John Doe',
            addressLine1: '123 Main St',
            city: 'Test City',
          },
          paymentMethod: 'cod',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
