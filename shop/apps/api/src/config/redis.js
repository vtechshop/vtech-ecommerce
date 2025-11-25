const logger = require('./logger');

let redisClient = null;

const connectRedis = async () => {
  // Skip Redis if not configured or explicitly disabled
  if (!process.env.REDIS_HOST || !process.env.REDIS_PASSWORD) {
    logger.info('Redis not configured - running without caching');
    return null;
  }

  try {
    const Redis = require('ioredis');
    const config = {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 100, 2000);
      },
      lazyConnect: true,
    };

    // Enable TLS for Upstash Redis
    if (process.env.REDIS_HOST.includes('upstash.io')) {
      config.tls = { rejectUnauthorized: false };
    }

    redisClient = new Redis(config);

    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', () => {}); // Suppress error logs
    redisClient.on('ready', () => logger.info('Redis ready'));

    await redisClient.connect();
    await redisClient.ping();
    logger.info('Redis ping successful');

    return redisClient;
  } catch (error) {
    logger.warn('Redis unavailable - running without caching');
    redisClient = null;
    return null;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    logger.warn('Redis client not initialized');
  }
  return redisClient;
};

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis disconnected');
  }
};

module.exports = { connectRedis, getRedisClient, disconnectRedis };
