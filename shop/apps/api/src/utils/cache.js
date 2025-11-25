const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Cache utility functions for Redis operations
 */

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Parsed cached data or null
 */
const get = async (key) => {
  try {
    const client = getRedisClient();
    if (!client) return null;

    const data = await client.get(key);
    if (!data) return null;

    return JSON.parse(data);
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    return null;
  }
};

/**
 * Set cached data
 * @param {string} key - Cache key
 * @param {any} value - Data to cache
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {Promise<boolean>} Success status
 */
const set = async (key, value, ttl = null) => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    const serialized = JSON.stringify(value);

    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }

    return true;
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete cached data
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
const del = async (key) => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.del(key);
    return true;
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., 'user:*')
 * @returns {Promise<boolean>} Success status
 */
const delPattern = async (pattern) => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }

    return true;
  } catch (error) {
    logger.error(`Cache delete pattern error for ${pattern}:`, error);
    return false;
  }
};

/**
 * Check if key exists
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Existence status
 */
const exists = async (key) => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error(`Cache exists error for key ${key}:`, error);
    return false;
  }
};

/**
 * Set expiration time for a key
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
const expire = async (key, ttl) => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.expire(key, ttl);
    return true;
  } catch (error) {
    logger.error(`Cache expire error for key ${key}:`, error);
    return false;
  }
};

/**
 * Increment a counter
 * @param {string} key - Counter key
 * @param {number} amount - Amount to increment (default: 1)
 * @returns {Promise<number|null>} New counter value or null
 */
const increment = async (key, amount = 1) => {
  try {
    const client = getRedisClient();
    if (!client) return null;

    const result = await client.incrby(key, amount);
    return result;
  } catch (error) {
    logger.error(`Cache increment error for key ${key}:`, error);
    return null;
  }
};

/**
 * Flush all cache data (use with caution!)
 * @returns {Promise<boolean>} Success status
 */
const flushAll = async () => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.flushdb();
    logger.warn('Cache flushed - all data deleted');
    return true;
  } catch (error) {
    logger.error('Cache flush error:', error);
    return false;
  }
};

module.exports = {
  get,
  set,
  del,
  delPattern,
  exists,
  expire,
  increment,
  flushAll,
};
