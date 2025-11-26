// FILE: apps/api/src/middleware/csrf.js
const { doubleCsrf } = require('csrf-csrf');
const logger = require('../config/logger');

// SECURITY: Validate CSRF secret on startup
function getCSRFSecret() {
  const secret = process.env.CSRF_SECRET;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // In production, CSRF_SECRET MUST be set and strong
  if (!isDevelopment && (!secret || secret.length < 64)) {
    throw new Error(
      'CRITICAL SECURITY ERROR: CSRF_SECRET must be set in .env and be at least 64 characters long in production.\n' +
      'Generate a secure secret using: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  // In development, allow fallback but warn
  if (!secret) {
    logger.warn('⚠️  CSRF_SECRET not set - using development fallback (NOT SECURE FOR PRODUCTION)');
    return 'development-csrf-secret-do-not-use-in-production-' + require('crypto').randomBytes(32).toString('hex');
  }

  return secret;
}

// CSRF Protection Configuration
const csrfProtection = doubleCsrf({
  getSecret: getCSRFSecret,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => {
    // Check for CSRF token in headers or body
    return req.headers['x-csrf-token'] || req.body._csrf;
  },
});

// Export middleware functions
const {
  invalidCsrfTokenError,
  generateToken,
  doubleCsrfProtection,
} = csrfProtection;

// Custom error handler for CSRF violations
function csrfErrorHandler(err, req, res, next) {
  if (err === invalidCsrfTokenError) {
    logger.warn('CSRF token validation failed:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'Invalid CSRF token. Please refresh the page and try again.',
      },
    });
  }

  next(err);
}

// Endpoint to get CSRF token
function getCsrfToken(req, res) {
  try {
    // Generate token using the correct method from csrf-csrf library
    const token = generateToken(req, res);
    res.json({
      success: true,
      data: { csrfToken: token },
    });
  } catch (error) {
    logger.error('Failed to generate CSRF token:', error);

    // In production, return error - don't expose dummy tokens
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        success: false,
        error: {
          code: 'CSRF_GENERATION_FAILED',
          message: 'Failed to generate security token. Please try again.',
        },
      });
    }

    // Only return dummy token in development
    res.json({
      success: true,
      data: { csrfToken: 'development-csrf-token' },
    });
  }
}

module.exports = {
  doubleCsrfProtection,
  csrfErrorHandler,
  getCsrfToken,
  generateToken,
};
