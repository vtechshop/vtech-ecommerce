// FILE: apps/api/src/tests/unit/helpers.test.js
const {
  slugify,
  generateSKU,
  generateOrderId,
  generateAffiliateCode,
} = require('../../utils/helpers');

describe('Helper Functions', () => {
  describe('slugify', () => {
    test('should convert string to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Product 123')).toBe('product-123');
      expect(slugify('Special @#$ Characters')).toBe('special-characters');
    });

    test('should handle multiple spaces', () => {
      expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
    });
  });

  describe('generateSKU', () => {
    test('should generate valid SKU', () => {
      const sku = generateSKU();
      // Format: SKU-{base36timestamp}{base36random} (variable length)
      expect(sku).toMatch(/^SKU-[A-Z0-9]+$/);
      expect(sku.length).toBeGreaterThan(8);
    });

    test('should generate unique SKUs', () => {
      const sku1 = generateSKU();
      const sku2 = generateSKU();
      expect(sku1).not.toBe(sku2);
    });
  });

  describe('generateOrderId', () => {
    beforeEach(() => {
      let seq = 0;
      jest.spyOn(require('../../models/Counter'), 'getNextSequence').mockImplementation(async () => ++seq);
    });
    afterEach(() => { jest.restoreAllMocks(); });

    test('should generate valid order ID with VT prefix', async () => {
      const orderId = await generateOrderId();
      // Format: VT-YYMM-NNNNNNN
      expect(orderId).toMatch(/^VT-\d{4}-\d{7}$/);
    });
  });

  describe('generateAffiliateCode', () => {
    test('should generate code from name', () => {
      const code = generateAffiliateCode('John Doe');
      expect(code).toMatch(/^[A-Z0-9]{6,}$/);
    });
  });
});