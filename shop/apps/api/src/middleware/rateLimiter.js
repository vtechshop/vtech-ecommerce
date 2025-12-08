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
  max: process.env.NODE_ENV === 'production' ? 500 : (process.env.NODE_ENV === 'test' ? 10000 : 1000), // 500 in production (increased from 100), 10000 in test, 1000 in dev
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Lazy initialize Redis store on first request
    if (!apiLimiter.store) {
      const redisStore = getOrCreateRedisStore();
      if (redisStore) {
        apiLimiter.store = redisStore;
      }
    }
    return false;
  },
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
  skip: (req) => {
    // Lazy initialize Redis store on first request
    if (!authLimiter.store && process.env.NODE_ENV === 'production') {
      const redisStore = getOrCreateRedisStore();
      if (redisStore) {
        authLimiter.store = redisStore;
      }
    }
    return process.env.NODE_ENV !== 'production'; // Skip rate limiting entirely in non-production
  },
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
  skip: (req) => {
    // Lazy initialize Redis store on first request
    if (!paymentLimiter.store) {
      const redisStore = getOrCreateRedisStore();
      if (redisStore) {
        paymentLimiter.store = redisStore;
      }
    }
    return false;
  },
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
  skip: (req) => {
    // Lazy initialize Redis store on first request
    if (!passwordResetLimiter.store) {
      const redisStore = getOrCreateRedisStore();
      if (redisStore) {
        passwordResetLimiter.store = redisStore;
      }
    }
    return false;
  },
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
  skip: (req) => {
    // Lazy initialize Redis store on first request
    if (!emailVerificationLimiter.store) {
      const redisStore = getOrCreateRedisStore();
      if (redisStore) {
        emailVerificationLimiter.store = redisStore;
      }
    }
    return false;
  },
});

// Webhook rate limiter - protect against DoS even with signature verification
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP (generous for legitimate webhooks)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many webhook requests. Please try again later.',
    },
  },
  skip: (req) => {
    // Lazy initialize Redis store on first request
    if (!webhookLimiter.store) {
      const redisStore = getOrCreateRedisStore();
      if (redisStore) {
        webhookLimiter.store = redisStore;
      }
    }
    return false;
  },
});

// Content interaction rate limiter (likes, comments, shares)
const contentInteractionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 interactions per minute (like/comment/share)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many interactions. Please slow down and try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Lazy initialize Redis store on first request
    if (!contentInteractionLimiter.store) {
      const redisStore = getOrCreateRedisStore();
      if (redisStore) {
        contentInteractionLimiter.store = redisStore;
      }
    }
    return false;
  },
});

// Upload rate limiter - stricter to prevent storage abuse
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Lazy initialize Redis store on first request
    if (!uploadLimiter.store) {
      const redisStore = getOrCreateRedisStore();
      if (redisStore) {
        uploadLimiter.store = redisStore;
      }
    }
    return false;
  },
});

// Checkout rate limiter - protect public checkout endpoints
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 checkout operations per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many checkout requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Lazy initialize Redis store on first request
    if (!checkoutLimiter.store) {
      const redisStore = getOrCreateRedisStore();
      if (redisStore) {
        checkoutLimiter.store = redisStore;
      }
    }
    return false;
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  webhookLimiter,
  contentInteractionLimiter,
  uploadLimiter,
  checkoutLimiter,
  getOrCreateRedisStore, // Export for testing if needed
};