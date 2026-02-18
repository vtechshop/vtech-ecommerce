const ttl = require('../../config/ttl');

describe('TTL Configuration', () => {
  it('should have all required TTL constants', () => {
    expect(ttl.USER_SESSION_TTL).toBeDefined();
    expect(ttl.USER_CACHE_TTL).toBeDefined();
    expect(ttl.GENERAL_CACHE_TTL).toBeDefined();
    expect(ttl.PRODUCT_CACHE_TTL).toBeDefined();
    expect(ttl.CATEGORY_CACHE_TTL).toBeDefined();
    expect(ttl.CART_CACHE_TTL).toBeDefined();
    expect(ttl.SEARCH_CACHE_TTL).toBeDefined();
    expect(ttl.RATE_LIMIT_WINDOW).toBeDefined();
    expect(ttl.AD_CLICK_SESSION_TTL).toBeDefined();
  });

  it('should have correct time constants', () => {
    expect(ttl.ONE_MONTH).toBe(30 * 24 * 60 * 60); // 2,592,000
    expect(ttl.ONE_WEEK).toBe(7 * 24 * 60 * 60);   // 604,800
    expect(ttl.ONE_DAY).toBe(24 * 60 * 60);          // 86,400
    expect(ttl.ONE_HOUR).toBe(60 * 60);               // 3,600
    expect(ttl.FIFTEEN_MINUTES).toBe(15 * 60);        // 900
    expect(ttl.FIVE_MINUTES).toBe(5 * 60);            // 300
  });

  it('should have session TTL of 1 month', () => {
    expect(ttl.USER_SESSION_TTL).toBe(ttl.ONE_MONTH);
  });

  it('should have general cache TTL of 5 minutes', () => {
    expect(ttl.GENERAL_CACHE_TTL).toBe(ttl.FIVE_MINUTES);
  });

  it('should have product cache TTL of 1 hour', () => {
    expect(ttl.PRODUCT_CACHE_TTL).toBe(ttl.ONE_HOUR);
  });

  it('should have cart TTL of 1 week', () => {
    expect(ttl.CART_CACHE_TTL).toBe(ttl.ONE_WEEK);
  });

  it('should have search cache TTL of 15 minutes', () => {
    expect(ttl.SEARCH_CACHE_TTL).toBe(ttl.FIFTEEN_MINUTES);
  });

  it('should have all values as positive numbers', () => {
    Object.values(ttl).forEach(value => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });
  });

  it('should have appropriate ordering: search < product < cart < session', () => {
    expect(ttl.SEARCH_CACHE_TTL).toBeLessThan(ttl.PRODUCT_CACHE_TTL);
    expect(ttl.PRODUCT_CACHE_TTL).toBeLessThan(ttl.CART_CACHE_TTL);
    expect(ttl.CART_CACHE_TTL).toBeLessThan(ttl.USER_SESSION_TTL);
  });
});
