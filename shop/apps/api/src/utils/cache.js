const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Cache utility functions with Redis + In-Memory fallback
 * Uses in-memory cache when Redis is unavailable for better performance
 */

// In-memory cache fallback (LRU-like with max size)
const memoryCache = new Map();
const MEMORY_CACHE_MAX_SIZE = 500;
const MEMORY_CACHE_DEFAULT_TTL = 300; // 5 minutes

/**
 * Clean up expired entries from memory cache
 */
const cleanupMemoryCache = () => {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (value.expiresAt && value.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
  // If still over limit, remove oldest entries
  if (memoryCache.size > MEMORY_CACHE_MAX_SIZE) {
    const entriesToRemove = memoryCache.size - MEMORY_CACHE_MAX_SIZE;
    const keys = Array.from(memoryCache.keys()).slice(0, entriesToRemove);
    keys.forEach(key => memoryCache.delete(key));
  }
};

// Run cleanup every 60 seconds
const cleanupInterval = setInterval(cleanupMemoryCache, 60000);
// Allow Node.js to exit even if interval is active (prevents Jest hanging)
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Get from memory cache
 */
const memGet = (key) => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
};

/**
 * Set in memory cache
 */
const memSet = (key, data, ttl = MEMORY_CACHE_DEFAULT_TTL) => {
  if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
    cleanupMemoryCache();
  }
  memoryCache.set(key, {
    data,
    expiresAt: ttl ? Date.now() + (ttl * 1000) : null
  });
};

/**
 * Delete from memory cache
 */
const memDel = (key) => {
  memoryCache.delete(key);
};

/**
 * Get cached data (Redis with in-memory fallback)
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Parsed cached data or null
 */
const get = async (key) => {
  try {
    const client = getRedisClient();

    // Try Redis first
    if (client) {
      const data = await client.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        // Also store in memory for faster subsequent access
        memSet(key, parsed, 60);
        return parsed;
      }
    }

    // Fallback to memory cache
    return memGet(key);
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    // Try memory cache on error
    return memGet(key);
  }
};

/**
 * Set cached data (Redis with in-memory fallback)
 * @param {string} key - Cache key
 * @param {any} value - Data to cache
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {Promise<boolean>} Success status
 */
const set = async (key, value, ttl = null) => {
  // Always set in memory cache for fast access
  memSet(key, value, ttl || MEMORY_CACHE_DEFAULT_TTL);

  try {
    const client = getRedisClient();
    if (!client) return true; // Memory cache is set, consider success

    const serialized = JSON.stringify(value);

    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }

    return true;
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
    return true; // Memory cache is still set
  }
};

/**
 * Delete cached data (from both Redis and memory)
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
const del = async (key) => {
  // Always delete from memory cache
  memDel(key);

  try {
    const client = getRedisClient();
    if (!client) return true;

    await client.del(key);
    return true;
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
    return true;
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
