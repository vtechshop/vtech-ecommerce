const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;

const connectRedis = async () => {
  try {
    const config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    };

    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }

    // Enable TLS for Upstash Redis (production cloud Redis)
    const isUpstashRedis = process.env.REDIS_HOST && process.env.REDIS_HOST.includes('upstash.io');
    if (isUpstashRedis) {
      config.tls = {
        rejectUnauthorized: false, // Upstash uses valid certificates
      };
      logger.info('🔒 TLS enabled for Upstash Redis');
    }

    redisClient = new Redis(config);

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.on('ready', () => {
      logger.info('Redis is ready to accept commands');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

    await redisClient.ping();
    logger.info('Redis ping successful');

    return redisClient;
  } catch (error) {
    logger.error('Redis initialization error:', error);
    // Make Redis optional - app can run without it (with degraded caching)
    logger.warn('Continuing without Redis - caching disabled');
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
