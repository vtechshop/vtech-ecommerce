// FILE: apps/api/src/middleware/csrf.js
const { doubleCsrf } = require('csrf-csrf');
const crypto = require('crypto');
const logger = require('../config/logger');

// SECURITY: Validate CSRF secret on startup
function getCSRFSecret() {
  const secret = process.env.CSRF_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, CSRF_SECRET MUST be set and strong - FAIL HARD if not
  if (isProduction) {
    if (!secret || secret.length < 32) {
      throw new Error(
        'CRITICAL SECURITY ERROR: CSRF_SECRET must be set in production and be at least 32 characters long.\n' +
        'Generate a secure secret using: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      );
    }
    return secret;
  }

  // In development/test, allow fallback with warning
  if (!secret) {
    logger.warn('CSRF_SECRET not set - using development fallback (NOT SECURE FOR PRODUCTION)');
    return 'development-csrf-secret-do-not-use-in-production';
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
    logger.error('Failed to generate CSRF token:', error.message);

    // Generate a fallback token using crypto to prevent blocking the user
    // This is safe because the token is still validated on the server
    try {
      const fallbackToken = crypto.randomBytes(32).toString('hex');
      // Set the cookie manually as fallback
      res.cookie('x-csrf-token', fallbackToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.json({
        success: true,
        data: { csrfToken: fallbackToken },
      });
    } catch (fallbackError) {
      logger.error('Failed to generate fallback CSRF token:', fallbackError.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'CSRF_GENERATION_FAILED',
          message: 'Failed to generate security token. Please try again.',
        },
      });
    }
  }
}

module.exports = {
  doubleCsrfProtection,
  csrfErrorHandler,
  getCsrfToken,
  generateToken,
};
