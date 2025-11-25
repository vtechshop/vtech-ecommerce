/**
 * TTL (Time To Live) Configuration
 * Centralized expiration times for Redis cache and sessions
 * All values in seconds unless otherwise noted
 */

// 1 MONTH = 30 days in seconds
const ONE_MONTH_SECONDS = 30 * 24 * 60 * 60; // 2,592,000 seconds

module.exports = {
  // User session TTL - 1 month
  USER_SESSION_TTL: ONE_MONTH_SECONDS,

  // User data cache TTL - 1 month
  USER_CACHE_TTL: ONE_MONTH_SECONDS,

  // General cache TTL - 5 minutes (for product listings, etc.)
  GENERAL_CACHE_TTL: 5 * 60, // 300 seconds

  // Product cache TTL - 1 hour
  PRODUCT_CACHE_TTL: 60 * 60, // 3600 seconds

  // Category cache TTL - 1 hour
  CATEGORY_CACHE_TTL: 60 * 60, // 3600 seconds

  // Cart cache TTL - 1 week (shorter than session)
  CART_CACHE_TTL: 7 * 24 * 60 * 60, // 604,800 seconds

  // Search cache TTL - 15 minutes
  SEARCH_CACHE_TTL: 15 * 60, // 900 seconds

  // Rate limiting window - 15 minutes
  RATE_LIMIT_WINDOW: 15 * 60, // 900 seconds

  // Ad click session TTL - 30 minutes
  AD_CLICK_SESSION_TTL: 30 * 60, // 1800 seconds

  // Constants for easy reference
  ONE_MONTH: ONE_MONTH_SECONDS,
  ONE_WEEK: 7 * 24 * 60 * 60,
  ONE_DAY: 24 * 60 * 60,
  ONE_HOUR: 60 * 60,
  FIFTEEN_MINUTES: 15 * 60,
  FIVE_MINUTES: 5 * 60,
};
