const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../../utils/jwt');

describe('JWT Utils', () => {
  const validUserId = '507f1f77bcf86cd799439011';

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(validUserId, 'customer');
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include userId and role in payload', () => {
      const token = generateAccessToken(validUserId, 'customer');
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(validUserId);
      expect(decoded.role).toBe('customer');
    });

    it('should include email when provided', () => {
      const token = generateAccessToken(validUserId, 'customer', 'test@test.com');
      const decoded = verifyAccessToken(token);
      expect(decoded.email).toBe('test@test.com');
    });

    it('should not include email when not provided', () => {
      const token = generateAccessToken(validUserId, 'customer');
      const decoded = verifyAccessToken(token);
      expect(decoded.email).toBeUndefined();
    });

    it('should throw for invalid role', () => {
      expect(() => generateAccessToken(validUserId, 'superadmin')).toThrow('Invalid role');
      expect(() => generateAccessToken(validUserId, '')).toThrow('Invalid role');
      expect(() => generateAccessToken(validUserId, null)).toThrow('Invalid role');
    });

    it('should accept all valid roles', () => {
      const roles = ['guest', 'customer', 'vendor', 'affiliate', 'support', 'admin'];
      roles.forEach(role => {
        expect(() => generateAccessToken(validUserId, role)).not.toThrow();
      });
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateRefreshToken(validUserId, 'customer');
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should throw for invalid role', () => {
      expect(() => generateRefreshToken(validUserId, 'hacker')).toThrow('Invalid role');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token', () => {
      const token = generateAccessToken(validUserId, 'admin');
      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(validUserId);
      expect(decoded.role).toBe('admin');
    });

    it('should throw for invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });

    it('should throw for tampered token', () => {
      const token = generateAccessToken(validUserId, 'customer');
      const tampered = token.slice(0, -5) + 'xxxxx';
      expect(() => verifyAccessToken(tampered)).toThrow();
    });

    it('should reject refresh token used as access token', () => {
      const refreshToken = generateRefreshToken(validUserId, 'customer');
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = generateRefreshToken(validUserId, 'vendor');
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(validUserId);
      expect(decoded.role).toBe('vendor');
    });

    it('should throw for invalid token', () => {
      expect(() => verifyRefreshToken('bad-token')).toThrow();
    });

    it('should reject access token used as refresh token', () => {
      const accessToken = generateAccessToken(validUserId, 'customer');
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });
});
