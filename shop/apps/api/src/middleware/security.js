// FILE: apps/api/src/middleware/security.js
/**
 * Security Middleware - Protection against common attacks
 * Implements: Rate limiting, XSS protection, NoSQL injection prevention, etc.
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

// ===========================
// RATE LIMITING CONFIGURATION
// ===========================

/**
 * General API Rate Limiter
 * Prevents DDoS and brute force attacks on all API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

/**
 * Strict Login Rate Limiter
 * Prevents brute force password attacks
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    success: false,
    error: {
      message: 'Too many login attempts. Please try again in 15 minutes.',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * Registration Rate Limiter
 * Prevents spam account creation
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 registrations per hour per IP
  message: {
    success: false,
    error: {
      message: 'Too many accounts created from this IP. Please try again later.',
      code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * Password Reset Rate Limiter
 * Prevents password reset spam
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 password reset requests per hour
  message: {
    success: false,
    error: {
      message: 'Too many password reset attempts. Please try again later.',
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * File Upload Rate Limiter
 * Prevents abuse of file upload endpoints
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 uploads per 15 minutes
  message: {
    success: false,
    error: {
      message: 'Too many file uploads. Please try again later.',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    },
  },
});

// ===========================
// HELMET SECURITY HEADERS
// ===========================

/**
 * Helmet Configuration
 * Sets secure HTTP headers to prevent common attacks
 */
const helmetConfig = helmet({
  // Content Security Policy - Prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Razorpay and some React inline scripts
        'checkout.razorpay.com',
        'cdn.razorpay.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled-components and inline styles
      ],
      imgSrc: [
        "'self'",
        'data:',
        'https:',
        'blob:',
      ],
      connectSrc: [
        "'self'",
        'api.razorpay.com',
        'checkout.razorpay.com',
      ],
      frameSrc: [
        'checkout.razorpay.com',
      ],
      fontSrc: [
        "'self'",
        'data:',
        'https:',
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
    },
  },

  // Strict Transport Security - Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // Prevent clickjacking attacks
  frameguard: {
    action: 'deny',
  },

  // Prevent MIME type sniffing
  noSniff: true,

  // Disable X-Powered-By header (hide Express)
  hidePoweredBy: true,

  // XSS Protection (legacy browsers)
  xssFilter: true,
});

// ===========================
// CORS CONFIGURATION
// ===========================

/**
 * CORS Configuration
 * Controls which origins can access the API
 */
const getCorsOptions = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
      ];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
};

// ===========================
// SECURITY MIDDLEWARE EXPORTS
// ===========================

module.exports = {
  // Security headers
  helmet: helmetConfig,

  // CORS protection
  cors: getCorsOptions(),

  // NoSQL injection prevention
  mongoSanitize: mongoSanitize({
    replaceWith: '_', // Replace prohibited characters
    onSanitize: ({ req, key }) => {
      console.warn(`Potential NoSQL injection attempt detected: ${key}`);
    },
  }),

  // XSS attack prevention
  xssClean: xss(),

  // HTTP Parameter Pollution prevention
  hpp: hpp({
    whitelist: [
      'page',
      'limit',
      'sort',
      'fields',
      'price',
      'rating',
      'category',
      'brand',
      'status',
    ],
  }),

  // Rate limiters
  apiLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  uploadLimiter,
};
