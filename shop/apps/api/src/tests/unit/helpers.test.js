const {
  generateOrderId,
  generateAffiliateCode,
  getPaginationMeta,
  slugify,
  generateSKU,
  escapeRegex,
} = require('../../utils/helpers');

describe('Helpers', () => {
  describe('generateOrderId', () => {
    it('should generate order ID starting with ORD-', () => {
      const orderId = generateOrderId();
      expect(orderId).toMatch(/^ORD-/);
    });

    it('should generate unique order IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateOrderId());
      }
      expect(ids.size).toBe(100);
    });

    it('should only contain uppercase alphanumeric characters after prefix', () => {
      const orderId = generateOrderId();
      const suffix = orderId.replace('ORD-', '');
      expect(suffix).toMatch(/^[A-Z0-9]+$/);
    });
  });

  describe('generateAffiliateCode', () => {
    it('should generate code from name', () => {
      const code = generateAffiliateCode('John Doe');
      expect(code).toBeTruthy();
      expect(typeof code).toBe('string');
    });

    it('should be uppercase', () => {
      const code = generateAffiliateCode('test user');
      expect(code).toBe(code.toUpperCase());
    });

    it('should remove special characters from name', () => {
      const code = generateAffiliateCode('Jo@hn#Doe!');
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should truncate name to max 6 characters', () => {
      const code = generateAffiliateCode('VeryLongUserName');
      // Name part is max 6, plus 4 random chars
      expect(code.length).toBeLessThanOrEqual(10);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 50; i++) {
        codes.add(generateAffiliateCode('TestUser'));
      }
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe('getPaginationMeta', () => {
    it('should calculate pagination metadata correctly', () => {
      const meta = getPaginationMeta(100, 1, 10);
      expect(meta).toEqual({
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should indicate no next page on last page', () => {
      const meta = getPaginationMeta(100, 10, 10);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
    });

    it('should handle middle page', () => {
      const meta = getPaginationMeta(100, 5, 10);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(true);
    });

    it('should handle single page', () => {
      const meta = getPaginationMeta(5, 1, 10);
      expect(meta.totalPages).toBe(1);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
    });

    it('should handle zero total', () => {
      const meta = getPaginationMeta(0, 1, 10);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNext).toBe(false);
    });

    it('should ceil partial pages', () => {
      const meta = getPaginationMeta(15, 1, 10);
      expect(meta.totalPages).toBe(2);
    });
  });

  describe('slugify', () => {
    it('should convert string to lowercase slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! @World#')).toBe('hello-world');
    });

    it('should handle leading/trailing spaces', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });

    it('should handle underscores', () => {
      expect(slugify('hello_world')).toBe('hello-world');
    });

    it('should handle existing hyphens', () => {
      expect(slugify('hello-world')).toBe('hello-world');
    });

    it('should handle multiple consecutive hyphens', () => {
      expect(slugify('hello---world')).toBe('hello-world');
    });

    it('should handle mixed case', () => {
      expect(slugify('HeLLo WoRLd')).toBe('hello-world');
    });
  });

  describe('generateSKU', () => {
    it('should generate SKU with default prefix', () => {
      const sku = generateSKU();
      expect(sku).toMatch(/^SKU-/);
    });

    it('should generate SKU with custom prefix', () => {
      const sku = generateSKU('PROD');
      expect(sku).toMatch(/^PROD-/);
    });

    it('should generate unique SKUs', () => {
      const skus = new Set();
      for (let i = 0; i < 50; i++) {
        skus.add(generateSKU());
      }
      expect(skus.size).toBeGreaterThan(1);
    });

    it('should be uppercase', () => {
      const sku = generateSKU();
      expect(sku).toBe(sku.toUpperCase());
    });
  });

  describe('escapeRegex', () => {
    it('should escape regex special characters', () => {
      expect(escapeRegex('hello.world')).toBe('hello\\.world');
      expect(escapeRegex('price$100')).toBe('price\\$100');
      expect(escapeRegex('a*b+c?')).toBe('a\\*b\\+c\\?');
      expect(escapeRegex('(test)')).toBe('\\(test\\)');
      expect(escapeRegex('[abc]')).toBe('\\[abc\\]');
      expect(escapeRegex('{1,2}')).toBe('\\{1,2\\}');
      expect(escapeRegex('a|b')).toBe('a\\|b');
      expect(escapeRegex('^start$')).toBe('\\^start\\$');
      expect(escapeRegex('back\\slash')).toBe('back\\\\slash');
    });

    it('should not escape non-special characters', () => {
      expect(escapeRegex('hello')).toBe('hello');
      expect(escapeRegex('abc123')).toBe('abc123');
    });

    it('should return non-string values as-is', () => {
      expect(escapeRegex(123)).toBe(123);
      expect(escapeRegex(null)).toBeNull();
      expect(escapeRegex(undefined)).toBeUndefined();
    });

    it('should handle empty string', () => {
      expect(escapeRegex('')).toBe('');
    });
  });
});
