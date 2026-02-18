const {
  calculateGST,
  formatGSTBreakdown,
  calculateCartGST,
  getCommonGSTRates,
} = require('../../utils/gstCalculator');

describe('GST Calculator', () => {
  describe('calculateGST', () => {
    it('should calculate intra-state GST (CGST + SGST) for regular state', () => {
      const result = calculateGST(1000, 'TN', 'TN', 18);
      expect(result.isIntraState).toBe(true);
      expect(result.cgst).toBe(90);
      expect(result.sgst).toBe(90);
      expect(result.utgst).toBe(0);
      expect(result.igst).toBe(0);
      expect(result.totalGst).toBe(180);
      expect(result.totalAmount).toBe(1180);
    });

    it('should calculate intra-state GST (CGST + UTGST) for union territory', () => {
      const result = calculateGST(1000, 'CH', 'CH', 18);
      expect(result.isIntraState).toBe(true);
      expect(result.cgst).toBe(90);
      expect(result.sgst).toBe(0);
      expect(result.utgst).toBe(90);
      expect(result.totalGst).toBe(180);
    });

    it('should calculate inter-state GST (IGST)', () => {
      const result = calculateGST(1000, 'TN', 'KA', 18);
      expect(result.isIntraState).toBe(false);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(180);
      expect(result.totalGst).toBe(180);
      expect(result.totalAmount).toBe(1180);
    });

    it('should use default 18% GST rate', () => {
      const result = calculateGST(1000, 'MH', 'MH');
      expect(result.gstRate).toBe(18);
      expect(result.totalGst).toBe(180);
    });

    it('should handle 5% GST rate', () => {
      const result = calculateGST(1000, 'DL', 'DL', 5);
      expect(result.cgst).toBe(25);
      expect(result.sgst).toBe(25);
      expect(result.totalGst).toBe(50);
    });

    it('should handle 28% luxury GST rate', () => {
      const result = calculateGST(10000, 'MH', 'TN', 28);
      expect(result.igst).toBe(2800);
      expect(result.totalAmount).toBe(12800);
    });

    it('should handle 0% GST rate', () => {
      const result = calculateGST(1000, 'TN', 'TN', 0);
      expect(result.totalGst).toBe(0);
      expect(result.totalAmount).toBe(1000);
    });

    it('should recognize all union territories', () => {
      const uts = ['AN', 'CH', 'DH', 'JK', 'LA', 'LD', 'PY'];
      uts.forEach(ut => {
        const result = calculateGST(100, ut, ut, 18);
        expect(result.utgst).toBe(9);
        expect(result.sgst).toBe(0);
      });
    });

    it('should include seller and buyer state in result', () => {
      const result = calculateGST(100, 'TN', 'KA');
      expect(result.sellerState).toBe('TN');
      expect(result.buyerState).toBe('KA');
    });
  });

  describe('formatGSTBreakdown', () => {
    it('should format intra-state SGST breakdown', () => {
      const gst = calculateGST(1000, 'TN', 'TN', 18);
      const formatted = formatGSTBreakdown(gst);
      expect(formatted).toBe('CGST 9% + SGST 9%');
    });

    it('should format intra-state UTGST breakdown', () => {
      const gst = calculateGST(1000, 'CH', 'CH', 18);
      const formatted = formatGSTBreakdown(gst);
      expect(formatted).toBe('CGST 9% + UTGST 9%');
    });

    it('should format inter-state IGST breakdown', () => {
      const gst = calculateGST(1000, 'TN', 'KA', 18);
      const formatted = formatGSTBreakdown(gst);
      expect(formatted).toBe('IGST 18%');
    });
  });

  describe('calculateCartGST', () => {
    it('should calculate GST for multiple items', () => {
      const items = [
        { id: '1', amount: 1000, sellerState: 'TN' },
        { id: '2', amount: 500, sellerState: 'KA' },
      ];
      const result = calculateCartGST(items, 'TN', 18);

      expect(result.subtotal).toBe(1500);
      expect(result.itemBreakdowns).toHaveLength(2);
      // Item 1: intra-state (TN -> TN)
      expect(result.itemBreakdowns[0].isIntraState).toBe(true);
      // Item 2: inter-state (KA -> TN)
      expect(result.itemBreakdowns[1].isIntraState).toBe(false);
    });

    it('should aggregate GST components', () => {
      const items = [
        { id: '1', amount: 1000, sellerState: 'TN' },
        { id: '2', amount: 1000, sellerState: 'TN' },
      ];
      const result = calculateCartGST(items, 'TN', 18);
      expect(result.totalCgst).toBe(180); // 90 + 90
      expect(result.totalSgst).toBe(180);
      expect(result.totalGst).toBe(360);
      expect(result.grandTotal).toBe(2360);
    });

    it('should handle empty items', () => {
      const result = calculateCartGST([], 'TN', 18);
      expect(result.subtotal).toBe(0);
      expect(result.totalGst).toBe(0);
      expect(result.grandTotal).toBe(0);
      expect(result.itemBreakdowns).toHaveLength(0);
    });

    it('should use buyer state as seller state when not provided', () => {
      const items = [{ id: '1', amount: 1000 }];
      const result = calculateCartGST(items, 'TN', 18);
      // No sellerState, so defaults to buyerState = intra-state
      expect(result.itemBreakdowns[0].isIntraState).toBe(true);
    });
  });

  describe('getCommonGSTRates', () => {
    it('should return all 5 GST rate categories', () => {
      const rates = getCommonGSTRates();
      expect(rates).toHaveProperty('nil');
      expect(rates).toHaveProperty('low');
      expect(rates).toHaveProperty('standard_low');
      expect(rates).toHaveProperty('standard');
      expect(rates).toHaveProperty('luxury');
    });

    it('should have correct rates', () => {
      const rates = getCommonGSTRates();
      expect(rates.nil.rate).toBe(0);
      expect(rates.low.rate).toBe(5);
      expect(rates.standard_low.rate).toBe(12);
      expect(rates.standard.rate).toBe(18);
      expect(rates.luxury.rate).toBe(28);
    });

    it('should have descriptions and examples', () => {
      const rates = getCommonGSTRates();
      Object.values(rates).forEach(rate => {
        expect(rate.description).toBeTruthy();
        expect(rate.examples).toBeInstanceOf(Array);
        expect(rate.examples.length).toBeGreaterThan(0);
      });
    });
  });
});
