// FILE: apps/api/src/tests/unit/auth.test.js

// Set up required environment variables for JWT tests
process.env.ACCESS_TOKEN_SECRET = 'test-access-token-secret-32chars-min-length-required-abc';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-32chars-min-length-required-abc';

const { hashPassword, comparePassword } = require('../../utils/hash');
const { generateAccessToken, verifyAccessToken } = require('../../utils/jwt');

describe('Authentication Utils', () => {
  describe('Password Hashing', () => {
    test('should hash password', async () => {
      const password = 'test123456';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
    });

    test('should compare password correctly', async () => {
      const password = 'test123456';
      const hashed = await hashPassword(password);
      
      const isMatch = await comparePassword(password, hashed);
      expect(isMatch).toBe(true);
      
      const isNotMatch = await comparePassword('wrongpassword', hashed);
      expect(isNotMatch).toBe(false);
    });
  });

  describe('JWT Tokens', () => {
    test('should generate and verify access token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateAccessToken(userId, 'customer');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe('customer');
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        verifyAccessToken('invalid-token');
      }).toThrow();
    });
  });
});