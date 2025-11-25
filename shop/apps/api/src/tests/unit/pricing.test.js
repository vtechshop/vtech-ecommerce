// FILE: apps/api/src/tests/unit/pricing.test.js
const { calculateOrderTotals } = require('../../utils/pricing');

describe('Pricing Calculations', () => {
  test('should calculate order totals correctly', () => {
    const items = [
      { price: 100, qty: 2 },
      { price: 50, qty: 1 },
    ];
    
    const totals = calculateOrderTotals(items, 0.1, 5.99, 0);
    
    expect(totals.subtotal).toBe(250);
    expect(totals.tax).toBe(25);
    expect(totals.shipping).toBe(5.99);
    expect(totals.total).toBe(280.99);
  });

  test('should apply discount correctly', () => {
    const items = [{ price: 100, qty: 1 }];
    const totals = calculateOrderTotals(items, 0.1, 0, 10);
    
    expect(totals.discount).toBe(10);
    expect(totals.total).toBe(100);
  });
});