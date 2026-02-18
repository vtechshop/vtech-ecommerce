const { calculateOrderTotals } = require('../../utils/pricing');

describe('Pricing Calculations (Extended)', () => {
  describe('calculateOrderTotals', () => {
    it('should calculate basic order totals', () => {
      const items = [
        { price: 100, qty: 2 },
        { price: 50, qty: 1 },
      ];
      const result = calculateOrderTotals(items);
      expect(result.subtotal).toBe(250);
      expect(result.tax).toBe(25); // 10% default
      expect(result.total).toBe(275);
    });

    it('should apply custom tax rate', () => {
      const items = [{ price: 1000, qty: 1 }];
      const result = calculateOrderTotals(items, 0.18);
      expect(result.subtotal).toBe(1000);
      expect(result.tax).toBe(180);
      expect(result.total).toBe(1180);
    });

    it('should include shipping cost', () => {
      const items = [{ price: 100, qty: 1 }];
      const result = calculateOrderTotals(items, 0.1, 50);
      expect(result.shipping).toBe(50);
      expect(result.total).toBe(160); // 100 + 10 + 50
    });

    it('should apply discount', () => {
      const items = [{ price: 100, qty: 1 }];
      const result = calculateOrderTotals(items, 0.1, 0, 20);
      expect(result.discount).toBe(20);
      expect(result.total).toBe(90); // 100 + 10 - 20
    });

    it('should handle all parameters together', () => {
      const items = [
        { price: 500, qty: 2 },
        { price: 200, qty: 3 },
      ];
      const result = calculateOrderTotals(items, 0.18, 99, 150);
      // subtotal = 1000 + 600 = 1600
      // tax = 1600 * 0.18 = 288
      // total = 1600 + 288 + 99 - 150 = 1837
      expect(result.subtotal).toBe(1600);
      expect(result.tax).toBe(288);
      expect(result.shipping).toBe(99);
      expect(result.discount).toBe(150);
      expect(result.total).toBe(1837);
    });

    it('should handle empty items', () => {
      const result = calculateOrderTotals([]);
      expect(result.subtotal).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle zero tax rate', () => {
      const items = [{ price: 100, qty: 1 }];
      const result = calculateOrderTotals(items, 0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(100);
    });

    it('should handle single item with qty of 1', () => {
      const items = [{ price: 999, qty: 1 }];
      const result = calculateOrderTotals(items, 0.1, 0, 0);
      expect(result.subtotal).toBe(999);
      expect(result.tax).toBeCloseTo(99.9);
      expect(result.total).toBeCloseTo(1098.9);
    });
  });
});
