// Mock external dependencies
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../../config/env', () => ({
  APPYFLOW_KEY_SECRET: '',
}));

const env = require('../../config/env');

describe('GST Service', () => {
  let verifyGST;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('../../config/env', () => ({
      APPYFLOW_KEY_SECRET: '',
    }));
  });

  describe('verifyGST - Format Validation', () => {
    beforeEach(() => {
      const gstService = require('../../services/gstService');
      verifyGST = gstService.verifyGST;
    });

    it('should reject empty GST number', async () => {
      const result = await verifyGST('');
      expect(result.verified).toBe(false);
      expect(result.error).toContain('15 characters');
    });

    it('should reject null GST number', async () => {
      const result = await verifyGST(null);
      expect(result.verified).toBe(false);
    });

    it('should reject GST number not 15 characters', async () => {
      const result = await verifyGST('123456789');
      expect(result.verified).toBe(false);
      expect(result.error).toContain('15 characters');
    });

    it('should reject invalid GST format', async () => {
      const result = await verifyGST('INVALID12345678');
      expect(result.verified).toBe(false);
      expect(result.error).toContain('Invalid GST number format');
    });

    it('should reject if API key not configured', async () => {
      // Valid format but no API key
      const result = await verifyGST('29ABCDE1234F1Z5');
      expect(result.verified).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });
});
