// FILE: apps/api/src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { getRedisClient } = require('../config/redis');

// Lazy initialization of Redis store - only created when first used
let redisStoreInstance = null;
let redisStoreInitialized = false;

const getOrCreateRedisStore = () => {
  // Only try to initialize once to avoid repeated warnings
  if (redisStoreInitialized) {
    return redisStoreInstance;
  }

  redisStoreInitialized = true;
  const client = getRedisClient();

  // Return Redis store if client is available, otherwise use default memory store
  if (client) {
    redisStoreInstance = new RedisStore({
      sendCommand: (...args) => client.call(...args),
      prefix: 'rl:',
    });
  }

  return redisStoreInstance; // Will be undefined if Redis not available
};

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : (process.env.NODE_ENV === 'test' ? 10000 : 1000), // 100 in production, 10000 in test, 1000 in dev
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => false, // Never skip, but use lazy store initialization
  store: undefined, // Will be set on first request
});

// Stricter rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100000, // Limit each IP to 5 in production, essentially unlimited in dev/test
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
  skipSuccessfulRequests: true,
  skip: (req) => process.env.NODE_ENV !== 'production', // Skip rate limiting entirely in non-production
  store: undefined, // Lazy initialization
});

// Payment rate limiter
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment attempts per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many payment attempts, please try again later',
    },
  },
  store: undefined, // Lazy initialization
});

// SECURITY: Strict rate limiter for password reset - prevent email bombing
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Only 3 requests per 15 minutes per IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many password reset attempts. Please try again in 15 minutes.',
    },
  },
  skipSuccessfulRequests: false, // Count all requests
  standardHeaders: true,
  legacyHeaders: false,
  store: undefined, // Lazy initialization
});

// Email verification resend rate limiter
const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many verification email requests. Please try again later.',
    },
  },
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: undefined, // Lazy initialization
});

module.exports = {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  getOrCreateRedisStore, // Export for testing if needed
};