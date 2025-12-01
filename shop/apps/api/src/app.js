const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./config/logger');
const env = require('./config/env');
const { xssSanitize, mongoSanitize } = require('./middleware/sanitize');
const { doubleCsrfProtection, csrfErrorHandler, getCsrfToken } = require('./middleware/csrf');

const app = express();

// Trust proxy for Render/Vercel deployment (required for rate limiting, secure cookies)
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware with properly configured CSP
// Different CSP policies for development and production
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: env.NODE_ENV === 'production'
    ? ["'self'"] // Strict in production - no unsafe-eval or unsafe-inline
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Relaxed in development
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
  imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
  connectSrc: ["'self'", env.CLIENT_URL || "http://localhost:3000"],
  frameSrc: ["'self'", "https://js.stripe.com", "https://api.razorpay.com"], // Payment iframes
  objectSrc: ["'none'"],
  upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: cspDirectives,
  },
  // HSTS - Force HTTPS in production (1 year)
  hsts: env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  } : false,
  // Prevent clickjacking attacks
  frameguard: { action: 'deny' },
  // Prevent MIME type sniffing
  noSniff: true,
  // XSS filter for older browsers
  xssFilter: true,
  // Don't expose server info
  hidePoweredBy: true,
  // Referrer policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS configuration - Allow multiple origins for development and production
const allowedOrigins = [
  'http://localhost:5173',                    // Local development
  'http://localhost:3000',                    // Alternative local port
  'https://vtech-ecommerce.vercel.app',       // Vercel production
  'https://loquacious-sfogliatella-745014.netlify.app',  // Netlify production
];

// Add CLIENT_URL from environment if it exists and not already in list
if (env.CLIENT_URL && !allowedOrigins.includes(env.CLIENT_URL)) {
  allowedOrigins.push(env.CLIENT_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);

    // In development, allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      const localNetworkPattern = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
      if (localNetworkPattern.test(origin)) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security: NoSQL injection protection (always applied)
app.use(mongoSanitize);

// Security: XSS sanitization (skip for auth routes to preserve email format)
app.use((req, res, next) => {
  const skipPatterns = [
    '/api/auth',
    '/api/csrf-token',
    '/health',
  ];

  // Check if URL starts with any skip pattern
  const shouldSkip = skipPatterns.some(pattern => req.url.startsWith(pattern));

  if (shouldSkip) {
    return next();
  }

  return xssSanitize(req, res, next);
});

// Security: CSRF protection (disabled in development and test, enabled in production)
app.use((req, res, next) => {
  // Skip CSRF completely in development and test
  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
    return next();
  }

  // In production, skip only GET requests and specific routes
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Skip CSRF for specific routes that handle their own security
  // These routes are already protected by JWT authentication with role verification
  const skipPatterns = [
    '/api/auth',       // Auth has its own flow
    '/api/csrf-token', // CSRF token endpoint itself
    '/api/cart',       // Session-based, not user-specific
    '/api/admin',      // Protected by JWT + admin role check
    '/api/vendors',    // Protected by JWT + vendor role check
    '/api/orders',     // Protected by JWT authentication
    '/api/affiliates', // Protected by JWT + affiliate role check
    '/api/contact',    // Public contact form - rate limited separately
    '/api/checkout',   // Checkout flow - needs to work for guests
    '/api/ads',        // Ad tracking (impressions/clicks) - public analytics
    '/api/upload',     // File uploads - protected by JWT authentication
    '/health',         // Health check
  ];

  const shouldSkip = skipPatterns.some(pattern => req.url.startsWith(pattern));

  if (shouldSkip) {
    return next();
  }

  // CSRF protection now applies to:
  // - /api/admin/* (all admin operations)
  // - /api/vendors/* (all vendor operations)
  // - /api/upload/* (file uploads)
  // - All other POST/PUT/DELETE/PATCH requests
  return doubleCsrfProtection(req, res, next);
});

// Rate limiting - more lenient in development/test environments
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 1000 : (env.NODE_ENV === 'test' ? 100000 : 10000), // 1000 in production, very high in dev/test
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for auth routes in development/test to allow Cypress tests
    if (env.NODE_ENV !== 'production' && req.url.startsWith('/auth')) {
      return true;
    }
    return false;
  },
});
app.use('/api/', limiter);

// Simple request logging (No pino-http needed)
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    }
  };

  const statusCode = health.services.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Security audit endpoint (for checking security headers) - public for testing tools
app.get('/api/security-check', (_req, res) => {
  const securityFeatures = {
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    headers: {
      hsts: env.NODE_ENV === 'production' ? 'enabled (1 year)' : 'disabled (development)',
      csp: 'enabled',
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      xssFilter: 'enabled',
      referrerPolicy: 'strict-origin-when-cross-origin',
    },
    authentication: {
      passwordHashing: 'bcrypt (12 rounds)',
      refreshTokenHashing: 'SHA-256 with timing-safe comparison',
      jwtAccessTokenTTL: '15 minutes',
      jwtRefreshTokenTTL: '7 days',
      accountLockout: '5 failed attempts, 15 min lockout',
    },
    rateLimiting: {
      general: '100 req/15min (production)',
      auth: '5 req/15min',
      passwordReset: '3 req/15min',
      emailVerification: '5 req/hour',
    },
    inputValidation: {
      xssSanitization: 'enabled',
      noSqlInjectionProtection: 'enabled',
      passwordComplexity: 'uppercase, lowercase, digit, special char required',
    },
    csrf: env.NODE_ENV === 'production' ? 'enabled (double submit cookie)' : 'disabled (development)',
  };

  res.json({
    success: true,
    data: securityFeatures,
  });
});

// CSRF token endpoint with rate limiting
const csrfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many CSRF token requests. Please try again later.',
    },
  },
});
app.get('/api/csrf-token', csrfLimiter, getCsrfToken);

// API Routes - Use centralized routes
app.use('/api', require('./routes/index'));

// Static files (uploads)
app.use('/uploads', express.static('uploads'));

// SPA Fallback for Production (Render deployment)
// Serve frontend static files and handle client-side routing
if (env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../web/dist');

  // Serve static files from the React build
  app.use(express.static(frontendPath));

  // Handle SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip if it's an API route
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404 handler (only for API routes in production, all routes in development)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// CSRF error handler (must be before general error handler)
app.use(csrfErrorHandler);

// Error handler
app.use((err, req, res, next) => {
  logger.error(err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.errors,
      },
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      },
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: 'Resource already exists',
      },
    });
  }

  // MongoDB connection errors
  if (err.name === 'MongoServerError' || err.name === 'MongoNetworkError') {
    logger.error('Database connection error:', err);
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database temporarily unavailable. Please try again.',
      },
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
});

module.exports = app;