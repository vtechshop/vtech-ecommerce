const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const { generateAccessToken } = require('../../utils/jwt');

describe('User Integration Tests', () => {
  let userToken;
  let userId;

  beforeEach(async () => {
    const { hashPassword } = require('../../utils/hash');

    // Create user
    const user = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: await hashPassword('password123456'),
      emailVerified: true,
    });

    userId = user._id;
    userToken = generateAccessToken(user._id, 'customer');
  });

  describe('GET /api/user/profile', () => {
    test('should get user profile', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('user@test.com');
    });
  });

  describe('PUT /api/user/profile', () => {
    test('should update user profile', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });
  });

  describe('GET /api/user/addresses', () => {
    test('should get user addresses', async () => {
      const response = await request(app)
        .get('/api/user/addresses')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/user/addresses', () => {
    test('should add address', async () => {
      const response = await request(app)
        .post('/api/user/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          fullName: 'John Doe',
          phone: '1234567890',
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[response.body.data.length - 1].fullName).toBe('John Doe');
    });
  });

  describe('GET /api/user/wishlist', () => {
    test('should get user wishlist', async () => {
      const response = await request(app)
        .get('/api/user/wishlist')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
