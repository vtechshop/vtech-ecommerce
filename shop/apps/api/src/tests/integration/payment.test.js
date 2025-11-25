const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const { hashPassword } = require('../../utils/hash');

describe('Payment Integration Tests', () => {
  let user, accessToken;

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
  });

  describe('POST /api/payment/intent', () => {
    test('should create payment intent', async () => {
      const response = await request(app)
        .post('/api/payment/intent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 1000,
          currency: 'USD',
          provider: 'stripe',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('client_secret');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payment/intent')
        .send({
          amount: 1000,
          currency: 'USD',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/payment/confirm', () => {
    test('should confirm payment', async () => {
      const response = await request(app)
        .post('/api/payment/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentIntentId: 'pi_test_123',
          provider: 'stripe',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
