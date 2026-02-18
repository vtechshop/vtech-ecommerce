const warrantyService = require('../../services/warrantyService');

describe('Warranty Service', () => {
  describe('_generateSummaryText', () => {
    it('should generate active warranty summary', () => {
      const endDate = new Date('2025-12-31');
      const text = warrantyService._generateSummaryText('iPhone 15', endDate, 'active');
      expect(text).toContain('iPhone 15');
      expect(text).toContain('active');
      expect(text).toContain('2025-12-31');
    });

    it('should generate expiring_soon warranty summary', () => {
      const endDate = new Date('2025-06-15');
      const text = warrantyService._generateSummaryText('MacBook', endDate, 'expiring_soon');
      expect(text).toContain('expires soon');
    });

    it('should generate expired warranty summary', () => {
      const endDate = new Date('2024-01-01');
      const text = warrantyService._generateSummaryText('TV', endDate, 'expired');
      expect(text).toContain('expired');
    });

    it('should generate no_warranty summary', () => {
      const endDate = new Date('2024-01-01');
      const text = warrantyService._generateSummaryText('Cable', endDate, 'no_warranty');
      expect(text).toContain('No warranty');
    });

    it('should handle unknown status with fallback', () => {
      const endDate = new Date('2025-12-31');
      const text = warrantyService._generateSummaryText('Product', endDate, 'unknown_status');
      expect(text).toContain('Warranty for Product');
    });
  });

  describe('_generateNotifications', () => {
    it('should generate expired notifications', () => {
      const endDate = new Date('2024-01-01');
      const notifications = warrantyService._generateNotifications(-30, 'expired', 'Laptop', endDate);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.some(n => n.for === 'user')).toBe(true);
      expect(notifications.some(n => n.for === 'admin')).toBe(true);
      expect(notifications[0].when).toBe('on_expiry');
    });

    it('should generate 7-day warning notifications', () => {
      const endDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const notifications = warrantyService._generateNotifications(5, 'expiring_soon', 'Phone', endDate);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.some(n => n.when === '7_days_before')).toBe(true);
    });

    it('should generate 30-day warning notifications', () => {
      const endDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
      const notifications = warrantyService._generateNotifications(20, 'active', 'Tablet', endDate);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.some(n => n.when === '30_days_before')).toBe(true);
    });

    it('should return empty for active warranty with > 30 days', () => {
      const endDate = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000);
      const notifications = warrantyService._generateNotifications(100, 'active', 'Watch', endDate);
      expect(notifications).toHaveLength(0);
    });

    it('should include product name in notification message', () => {
      const endDate = new Date('2024-01-01');
      const notifications = warrantyService._generateNotifications(-1, 'expired', 'Smart TV', endDate);
      expect(notifications[0].message).toContain('Smart TV');
    });
  });

  describe('_hasNotification', () => {
    it('should return true if notification type exists', () => {
      const warranty = {
        notifications: [
          { type: 'expired', sentAt: new Date() },
          { type: '7_days_before', sentAt: new Date() },
        ],
      };
      expect(warrantyService._hasNotification(warranty, 'expired')).toBe(true);
    });

    it('should return false if notification type does not exist', () => {
      const warranty = {
        notifications: [{ type: 'expired' }],
      };
      expect(warrantyService._hasNotification(warranty, '30_days_before')).toBe(false);
    });

    it('should return false for empty notifications', () => {
      const warranty = { notifications: [] };
      expect(warrantyService._hasNotification(warranty, 'expired')).toBe(false);
    });
  });
});
