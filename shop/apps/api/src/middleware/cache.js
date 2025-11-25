const cache = require('../utils/cache');
const logger = require('../config/logger');
const TTL = require('../config/ttl');

/**
 * Cache middleware for Express routes
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Optional function to generate cache key from req
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (ttl = TTL.GENERAL_CACHE_TTL, keyGenerator = null) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : `cache:${req.originalUrl || req.url}`;

      // Try to get cached response
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit for key: ${cacheKey}`);
        return res.status(200).json(cachedData);
      }

      logger.debug(`Cache miss for key: ${cacheKey}`);

      // Store original res.json to intercept the response
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl).catch((err) => {
            logger.error(`Failed to cache response for ${cacheKey}:`, err);
          });
        }

        // Call original res.json
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Cache key pattern
 * @returns {Function} Express middleware
 */
const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    try {
      const cachePattern = typeof pattern === 'function' ? pattern(req) : pattern;
      await cache.delPattern(cachePattern);
      logger.debug(`Cache invalidated for pattern: ${cachePattern}`);
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
    next();
  };
};

/**
 * Cache helper for specific user data
 * @param {number} ttl - Time to live in seconds (default: 1 month)
 * @returns {Function} Express middleware
 */
const cacheUserData = (ttl = TTL.USER_CACHE_TTL) => {
  return cacheMiddleware(ttl, (req) => {
    const userId = req.user?.id || 'anonymous';
    return `cache:user:${userId}:${req.originalUrl || req.url}`;
  });
};

/**
 * Invalidate user-specific cache
 * @returns {Function} Express middleware
 */
const invalidateUserCache = () => {
  return invalidateCache((req) => {
    const userId = req.user?.id;
    return userId ? `cache:user:${userId}:*` : 'cache:*';
  });
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  cacheUserData,
  invalidateUserCache,
};
