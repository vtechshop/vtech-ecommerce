const { INVENTORY_CONFIG } = require('../../services/inventoryAlertService');

describe('Inventory Alert Config', () => {
  it('should have correct threshold values', () => {
    expect(INVENTORY_CONFIG.LOW_STOCK_THRESHOLD).toBe(10);
    expect(INVENTORY_CONFIG.CRITICAL_STOCK_THRESHOLD).toBe(5);
    expect(INVENTORY_CONFIG.OUT_OF_STOCK_THRESHOLD).toBe(0);
  });

  it('should have low > critical > out of stock thresholds', () => {
    expect(INVENTORY_CONFIG.LOW_STOCK_THRESHOLD).toBeGreaterThan(INVENTORY_CONFIG.CRITICAL_STOCK_THRESHOLD);
    expect(INVENTORY_CONFIG.CRITICAL_STOCK_THRESHOLD).toBeGreaterThan(INVENTORY_CONFIG.OUT_OF_STOCK_THRESHOLD);
  });

  it('should have reorder point multiplier', () => {
    expect(INVENTORY_CONFIG.REORDER_POINT_MULTIPLIER).toBe(2);
  });
});
