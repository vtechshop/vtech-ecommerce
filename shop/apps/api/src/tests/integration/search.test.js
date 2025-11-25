// FILE: apps/api/src/tests/integration/search.test.js
const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Product = require('../../models/Product');

describe('Search Integration Tests', () => {
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

    await Product.create([
      {
        vendorId: vendor._id,
        title: 'Wireless Headphones',
        slug: 'wireless-headphones',
        description: 'Premium wireless headphones',
        price: 150,
        stock: 10,
        sku: 'WH-001',
        published: true,
        brand: 'AudioTech',
      },
      {
        vendorId: vendor._id,
        title: 'Bluetooth Speaker',
        slug: 'bluetooth-speaker',
        description: 'Portable bluetooth speaker',
        price: 80,
        stock: 20,
        sku: 'BS-001',
        published: true,
        brand: 'SoundPro',
      },
      {
        vendorId: vendor._id,
        title: 'Laptop Stand',
        slug: 'laptop-stand',
        description: 'Ergonomic laptop stand',
        price: 40,
        stock: 30,
        sku: 'LS-001',
        published: true,
        brand: 'OfficePlus',
      },
    ]);
  });

  describe('GET /api/catalog/products', () => {
    test('should get all products', async () => {
      const response = await request(app)
        .get('/api/catalog/products');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should filter by tag', async () => {
      const response = await request(app)
        .get('/api/catalog/products?tag=electronics');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter by featured', async () => {
      const response = await request(app)
        .get('/api/catalog/products?featured=true');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});