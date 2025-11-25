// FILE: apps/api/src/middleware/sanitize.js
const mongoSanitize = require('express-mongo-sanitize');

/**
 * XSS and NoSQL Injection Protection Middleware
 *
 * This middleware provides protection against:
 * 1. NoSQL injection attacks (using express-mongo-sanitize)
 * 2. XSS attacks (by sanitizing user input)
 */

// Simple XSS sanitizer for strings
function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  // Remove HTML tags and dangerous characters (but preserve @ for emails)
  return str
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframes
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // Remove inline event handlers
    // Note: NOT removing all HTML tags to preserve emails and other content
}

// Recursively sanitize object properties
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }

  return sanitized;
}

// XSS Sanitization Middleware
function xssSanitize(req, res, next) {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

module.exports = {
  xssSanitize,
  mongoSanitize: mongoSanitize(),
};
