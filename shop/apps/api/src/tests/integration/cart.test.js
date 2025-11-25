const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Product = require('../../models/Product');
const Cart = require('../../models/Cart');
const Coupon = require('../../models/Coupon');
const { generateAccessToken } = require('../../utils/jwt');

describe('Cart Integration Tests', () => {
  let userToken;
  let userId;
  let productId;
  let couponId;

  beforeEach(async () => {
    const { hashPassword } = require('../../utils/hash');

    // Create user
    const user = await User.create({
      name: 'Test User',
      email: 'cart@test.com',
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

    // Create coupon
    const coupon = await Coupon.create({
      code: 'TEST10',
      type: 'percentage',
      value: 10,
      minOrderValue: 50,
      isActive: true,
      startDate: new Date(Date.now() - 1000),
      endDate: new Date(Date.now() + 86400000),
    });

    couponId = coupon._id;
  });

  describe('POST /api/cart/add', () => {
    test('should add item to cart', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId,
          quantity: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].qty).toBe(2);
    });

    test('should not add more than available stock', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId,
          quantity: 100,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/cart', () => {
    beforeEach(async () => {
      await Cart.create({
        userId,
        items: [{
          productId: productId,
          qty: 2,
        }],
      });
    });

    test('should get user cart', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
    });
  });

  describe('DELETE /api/cart/items/:itemId', () => {
    let cart;
    let itemId;

    beforeEach(async () => {
      cart = await Cart.create({
        userId,
        items: [{
          productId: productId,
          qty: 2,
        }],
      });
      itemId = cart.items[0]._id;
    });

    test('should remove item from cart', async () => {
      const response = await request(app)
        .delete(`/api/cart/items/${itemId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(0);
    });
  });

  describe('POST /api/cart/coupon', () => {
    beforeEach(async () => {
      const cart = await Cart.create({
        userId,
        items: [{
          productId: productId,
          qty: 2,
          priceSnapshot: 99.99,
        }],
      });
      cart.calculateTotals();
      await cart.save();
    });

    test('should apply valid coupon', async () => {
      const response = await request(app)
        .post('/api/cart/coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'TEST10',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.coupons).toHaveLength(1);
      expect(response.body.data.coupons[0].code).toBe('TEST10');
    });

    test('should not apply invalid coupon', async () => {
      const response = await request(app)
        .post('/api/cart/coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'INVALID',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/cart/coupon', () => {
    beforeEach(async () => {
      const cart = await Cart.create({
        userId,
        items: [{
          productId: productId,
          qty: 2,
          priceSnapshot: 99.99,
        }],
      });
      cart.coupons = [{
        code: 'TEST10',
        discount: 20,
        type: 'percentage',
      }];
      cart.calculateTotals();
      await cart.save();
    });

    test('should remove coupon', async () => {
      const response = await request(app)
        .delete('/api/cart/coupon')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'TEST10',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.coupons).toHaveLength(0);
    });
  });
});
