const { hashPassword, comparePassword, hashRefreshToken, compareRefreshToken } = require('../../utils/hash');

describe('Hash Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword('MyPassword123!');
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('MyPassword123!');
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await hashPassword('MyPassword123!');
      const hash2 = await hashPassword('MyPassword123!');
      expect(hash1).not.toBe(hash2);
    });

    it('should create bcrypt hash format', async () => {
      const hash = await hashPassword('test');
      expect(hash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const hash = await hashPassword('SecurePass123!');
      const result = await comparePassword('SecurePass123!', hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await hashPassword('SecurePass123!');
      const result = await comparePassword('WrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should handle special characters in passwords', async () => {
      const password = 'P@$$w0rd!#%&*';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });
  });

  describe('hashRefreshToken', () => {
    it('should return SHA-256 hex hash', () => {
      const hash = hashRefreshToken('my-refresh-token');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce same hash for same input', () => {
      const hash1 = hashRefreshToken('token-123');
      const hash2 = hashRefreshToken('token-123');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashRefreshToken('token-1');
      const hash2 = hashRefreshToken('token-2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compareRefreshToken', () => {
    it('should return true for matching token', () => {
      const token = 'my-refresh-token';
      const hash = hashRefreshToken(token);
      expect(compareRefreshToken(token, hash)).toBe(true);
    });

    it('should return false for non-matching token', () => {
      const hash = hashRefreshToken('correct-token');
      expect(compareRefreshToken('wrong-token', hash)).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      // This test verifies the function works correctly
      // Timing safety can't easily be tested, but we verify the logic
      const token = 'test-token-12345';
      const hash = hashRefreshToken(token);
      expect(compareRefreshToken(token, hash)).toBe(true);
      expect(compareRefreshToken(token + 'x', hash)).toBe(false);
    });
  });
});
