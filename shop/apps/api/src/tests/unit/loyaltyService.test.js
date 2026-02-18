const { POINTS_CONFIG } = require('../../services/loyaltyService');

describe('Loyalty Service', () => {
  describe('POINTS_CONFIG', () => {
    it('should have earning rates', () => {
      expect(POINTS_CONFIG.POINTS_PER_RUPEE).toBe(1);
      expect(POINTS_CONFIG.SIGNUP_BONUS).toBe(100);
      expect(POINTS_CONFIG.REFERRAL_BONUS).toBe(200);
      expect(POINTS_CONFIG.REVIEW_BONUS).toBe(50);
      expect(POINTS_CONFIG.BIRTHDAY_BONUS).toBe(500);
    });

    it('should have tier upgrade bonuses', () => {
      expect(POINTS_CONFIG.TIER_UPGRADE_BONUS.silver).toBe(100);
      expect(POINTS_CONFIG.TIER_UPGRADE_BONUS.gold).toBe(250);
      expect(POINTS_CONFIG.TIER_UPGRADE_BONUS.platinum).toBe(500);
      expect(POINTS_CONFIG.TIER_UPGRADE_BONUS.diamond).toBe(1000);
    });

    it('should have redemption rates', () => {
      expect(POINTS_CONFIG.POINTS_TO_RUPEE_RATIO).toBe(1);
      expect(POINTS_CONFIG.MIN_REDEMPTION_POINTS).toBe(100);
      expect(POINTS_CONFIG.MAX_REDEMPTION_PERCENT).toBe(50);
    });

    it('should have expiration period', () => {
      expect(POINTS_CONFIG.POINTS_EXPIRY_DAYS).toBe(365);
    });

    it('should have tier thresholds in ascending order', () => {
      const thresholds = POINTS_CONFIG.TIER_THRESHOLDS;
      expect(thresholds.bronze).toBe(0);
      expect(thresholds.silver).toBe(500);
      expect(thresholds.gold).toBe(2000);
      expect(thresholds.platinum).toBe(5000);
      expect(thresholds.diamond).toBe(10000);

      // Verify ascending order
      expect(thresholds.bronze).toBeLessThan(thresholds.silver);
      expect(thresholds.silver).toBeLessThan(thresholds.gold);
      expect(thresholds.gold).toBeLessThan(thresholds.platinum);
      expect(thresholds.platinum).toBeLessThan(thresholds.diamond);
    });
  });

  describe('calculatePointsForOrder (static, pure function)', () => {
    // We can test this by importing the class
    const { LoyaltyService } = require('../../services/loyaltyService');

    it('should calculate points at 1 point per rupee', () => {
      expect(LoyaltyService.calculatePointsForOrder(1000)).toBe(1000);
    });

    it('should floor decimal amounts', () => {
      expect(LoyaltyService.calculatePointsForOrder(99.9)).toBe(99);
    });

    it('should return 0 for zero amount', () => {
      expect(LoyaltyService.calculatePointsForOrder(0)).toBe(0);
    });

    it('should handle large amounts', () => {
      expect(LoyaltyService.calculatePointsForOrder(50000)).toBe(50000);
    });
  });
});
