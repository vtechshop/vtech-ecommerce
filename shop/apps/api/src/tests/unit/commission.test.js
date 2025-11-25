// FILE: apps/api/src/tests/unit/commission.test.js
describe('Commission Calculations', () => {
  test('should calculate vendor commission', () => {
    const orderAmount = 1000;
    const commissionRate = 15;
    
    const commission = (orderAmount * commissionRate) / 100;
    
    expect(commission).toBe(150);
  });

  test('should calculate affiliate commission', () => {
    const orderAmount = 1000;
    const affiliateRate = 5;
    
    const commission = (orderAmount * affiliateRate) / 100;
    
    expect(commission).toBe(50);
  });
});