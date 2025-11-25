// FILE: apps/api/src/utils/gstCalculator.test.js
// Tests for GST calculator

const { calculateGST, formatGSTBreakdown, calculateCartGST, getCommonGSTRates } = require('./gstCalculator');

describe('GST Calculator', () => {
  describe('calculateGST', () => {
    test('should calculate CGST + SGST for intra-state transaction', () => {
      const result = calculateGST(10000, 'MH', 'MH', 18);

      expect(result.isIntraState).toBe(true);
      expect(result.cgst).toBe(900); // 9%
      expect(result.sgst).toBe(900); // 9%
      expect(result.igst).toBe(0);
      expect(result.totalGst).toBe(1800); // 18%
      expect(result.totalAmount).toBe(11800);
    });

    test('should calculate CGST + UTGST for Union Territory intra-state transaction', () => {
      const result = calculateGST(10000, 'DL', 'DL', 18);

      expect(result.isIntraState).toBe(true);
      expect(result.cgst).toBe(900); // 9%
      expect(result.sgst).toBe(900); // 9% (Delhi uses SGST, not UTGST)
      expect(result.utgst).toBe(0);
      expect(result.totalGst).toBe(1800);
    });

    test('should calculate CGST + UTGST for actual Union Territory', () => {
      const result = calculateGST(10000, 'CH', 'CH', 18); // Chandigarh

      expect(result.isIntraState).toBe(true);
      expect(result.cgst).toBe(900); // 9%
      expect(result.utgst).toBe(900); // 9%
      expect(result.sgst).toBe(0);
      expect(result.totalGst).toBe(1800);
    });

    test('should calculate IGST for inter-state transaction', () => {
      const result = calculateGST(10000, 'MH', 'DL', 18);

      expect(result.isIntraState).toBe(false);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.utgst).toBe(0);
      expect(result.igst).toBe(1800); // 18%
      expect(result.totalGst).toBe(1800);
      expect(result.totalAmount).toBe(11800);
    });

    test('should work with different GST rates', () => {
      const result5 = calculateGST(10000, 'MH', 'MH', 5);
      expect(result5.totalGst).toBe(500);

      const result12 = calculateGST(10000, 'MH', 'MH', 12);
      expect(result12.totalGst).toBe(1200);

      const result28 = calculateGST(10000, 'MH', 'MH', 28);
      expect(result28.totalGst).toBe(2800);
    });
  });

  describe('formatGSTBreakdown', () => {
    test('should format intra-state GST with SGST', () => {
      const breakdown = calculateGST(10000, 'MH', 'MH', 18);
      const formatted = formatGSTBreakdown(breakdown);
      expect(formatted).toBe('CGST 9% + SGST 9%');
    });

    test('should format intra-state GST with UTGST', () => {
      const breakdown = calculateGST(10000, 'CH', 'CH', 18);
      const formatted = formatGSTBreakdown(breakdown);
      expect(formatted).toBe('CGST 9% + UTGST 9%');
    });

    test('should format inter-state GST', () => {
      const breakdown = calculateGST(10000, 'MH', 'DL', 18);
      const formatted = formatGSTBreakdown(breakdown);
      expect(formatted).toBe('IGST 18%');
    });
  });

  describe('calculateCartGST', () => {
    test('should calculate GST for cart with single seller (intra-state)', () => {
      const items = [
        { id: '1', amount: 5000, sellerState: 'MH' },
        { id: '2', amount: 3000, sellerState: 'MH' },
      ];

      const result = calculateCartGST(items, 'MH', 18);

      expect(result.subtotal).toBe(8000);
      expect(result.totalCgst).toBe(720); // 9% of 8000
      expect(result.totalSgst).toBe(720); // 9% of 8000
      expect(result.totalGst).toBe(1440); // 18% of 8000
      expect(result.grandTotal).toBe(9440);
    });

    test('should calculate GST for cart with multiple sellers (mixed)', () => {
      const items = [
        { id: '1', amount: 5000, sellerState: 'MH' }, // Intra-state
        { id: '2', amount: 3000, sellerState: 'DL' }, // Inter-state
      ];

      const result = calculateCartGST(items, 'MH', 18);

      expect(result.subtotal).toBe(8000);
      expect(result.totalCgst).toBe(450); // 9% of 5000 only (intra-state)
      expect(result.totalSgst).toBe(450); // 9% of 5000 only (intra-state)
      expect(result.totalIgst).toBe(540); // 18% of 3000 (inter-state)
      expect(result.totalGst).toBe(1440);
      expect(result.grandTotal).toBe(9440);
    });
  });

  describe('getCommonGSTRates', () => {
    test('should return all GST rate categories', () => {
      const rates = getCommonGSTRates();

      expect(rates.nil.rate).toBe(0);
      expect(rates.low.rate).toBe(5);
      expect(rates.standard_low.rate).toBe(12);
      expect(rates.standard.rate).toBe(18);
      expect(rates.luxury.rate).toBe(28);
    });
  });
});
