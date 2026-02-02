// FILE: apps/api/src/middleware/advancedSecurity.js
/**
 * ADVANCED SECURITY MIDDLEWARE - Amazon-Level Protection
 *
 * This module provides military-grade security features including:
 * - SQL Injection Prevention
 * - Command Injection Prevention
 * - Path Traversal Prevention
 * - Advanced Request Validation
 * - Suspicious Pattern Detection
 * - Automated Threat Blocking
 */

const logger = require('../config/logger');
const rateLimit = require('express-rate-limit');

// ===========================
// ATTACK PATTERN DETECTION
// ===========================

/**
 * Malicious pattern database
 * These patterns indicate potential attacks
 */
const ATTACK_PATTERNS = {
  // SQL Injection patterns
  // NOTE: Made less strict - only flag when SQL keywords are combined with injection patterns
  sqlInjection: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b.*\b(FROM|WHERE|INTO|TABLE)\b)/gi,
    /(--|\/\*|\*\/|;.*(?:SELECT|INSERT|UPDATE|DELETE|DROP))/gi, // SQL comments with keywords
    /(\bxp_|sp_|0x[0-9a-f]+)/gi,
    /('.*OR.*'|'.*AND.*'|1=1|' OR 1=1)/gi, // Classic SQL injection patterns
  ],

  // NoSQL Injection patterns
  nosqlInjection: [
    /(\$where|\$ne|\$gt|\$lt|\$regex|\$in|\$nin)/gi,
    /(\{.*\$.*\})/gi,
  ],

  // XSS (Cross-Site Scripting) patterns
  xss: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick=, onload=, etc.
    /<iframe[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
  ],

  // Command Injection patterns
  // NOTE: Removed single special chars (&, $, etc.) as they're common in passwords
  // Only detect actual command injection attempts
  commandInjection: [
    /(;\s*(?:rm|curl|wget|nc|bash|sh|cat|ls|cd|mv|cp)\s)/gi, // Commands after semicolon
    /(\|\s*(?:rm|curl|wget|nc|bash|sh|cat|ls|cd|mv|cp)\s)/gi, // Piped commands
    /(`(?:rm|curl|wget|nc|bash|sh|cat|ls|cd|mv|cp)\s)/gi, // Backtick commands
    /(rm\s+-rf|curl\s+http|wget\s+http)/gi, // Specific dangerous commands
  ],

  // Path Traversal patterns
  pathTraversal: [
    /\.\.[\/\\]/g,
    /[\/\\]etc[\/\\]passwd/gi,
    /[\/\\]windows[\/\\]system32/gi,
  ],

  // LDAP Injection patterns
  // NOTE: Removed overly aggressive [*()\\] pattern that blocks normal punctuation
  // Only detect actual LDAP injection attempts with multiple special chars
  ldapInjection: [
    /\(\*[a-zA-Z0-9]*\)/g, // Wildcard LDAP searches like (*) or (*user*)
    /\)\(\&/g, // LDAP AND operator
    /\)\(\|/g, // LDAP OR operator
    /\)\(!/g, // LDAP NOT operator
  ],
};

/**
 * Detect malicious patterns in request
 */
function detectMaliciousPatterns(value, type = 'all') {
  if (!value || typeof value !== 'string') return null;

  const patterns = type === 'all'
    ? Object.values(ATTACK_PATTERNS).flat()
    : ATTACK_PATTERNS[type] || [];

  for (const pattern of patterns) {
    if (pattern.test(value)) {
      return {
        detected: true,
        pattern: pattern.source,
        type,
      };
    }
  }

  return null;
}

/**
 * Recursive scan of object for malicious patterns
 */
function scanObject(obj, path = '') {
  for (const key in obj) {
    const value = obj[key];
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === 'string') {
      const detection = detectMaliciousPatterns(value);
      if (detection) {
        return {
          found: true,
          path: currentPath,
          value: value.substring(0, 100), // First 100 chars only
          ...detection,
        };
      }
    } else if (typeof value === 'object' && value !== null) {
      const result = scanObject(value, currentPath);
      if (result.found) return result;
    }
  }

  return { found: false };
}

// ===========================
// IP BLOCKING SYSTEM
// ===========================

// In-memory store for blocked IPs (use Redis in production for distributed systems)
const blockedIPs = new Map(); // { ip: { until: timestamp, reason: string } }
const suspiciousActivity = new Map(); // { ip: { count: number, lastActivity: timestamp } }

/**
 * Check if IP is blocked
 */
function isIPBlocked(ip) {
  const blocked = blockedIPs.get(ip);
  if (!blocked) return false;

  // Check if block has expired
  if (Date.now() > blocked.until) {
    blockedIPs.delete(ip);
    return false;
  }

  return true;
}

/**
 * Block an IP address temporarily
 */
function blockIP(ip, reason, durationMinutes = 60) {
  const until = Date.now() + (durationMinutes * 60 * 1000);
  blockedIPs.set(ip, { until, reason });

  logger.warn(`🚫 IP BLOCKED: ${ip} - Reason: ${reason} - Duration: ${durationMinutes}m`);
}

/**
 * Track suspicious activity
 */
function trackSuspiciousActivity(ip) {
  const activity = suspiciousActivity.get(ip) || { count: 0, lastActivity: Date.now() };

  // Reset counter if last activity was more than 1 hour ago
  if (Date.now() - activity.lastActivity > 60 * 60 * 1000) {
    activity.count = 0;
  }

  activity.count++;
  activity.lastActivity = Date.now();
  suspiciousActivity.set(ip, activity);

  // Block IP if too many suspicious requests (threshold: 5 in 1 hour)
  if (activity.count >= 5) {
    blockIP(ip, 'Multiple attack attempts detected', 240); // Block for 4 hours
    return true;
  }

  return false;
}

// ===========================
// ADVANCED SECURITY MIDDLEWARE
// ===========================

/**
 * IP Blocking Middleware
 * Blocks requests from banned IP addresses
 */
const ipBlockingMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;

  if (isIPBlocked(ip)) {
    const blocked = blockedIPs.get(ip);
    logger.warn(`🚫 Blocked request from ${ip} - Reason: ${blocked.reason}`);

    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. Your IP has been temporarily blocked due to suspicious activity.',
        code: 'IP_BLOCKED',
      },
    });
  }

  next();
};

/**
 * Attack Detection Middleware
 * Scans requests for malicious patterns
 */
const attackDetectionMiddleware = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;

  // Scan query parameters
  const queryResult = scanObject(req.query, 'query');
  if (queryResult.found) {
    logger.error(`🚨 ATTACK DETECTED in query: ${queryResult.type} from ${ip}`, {
      path: queryResult.path,
      pattern: queryResult.pattern,
      value: queryResult.value,
      url: req.url,
    });

    trackSuspiciousActivity(ip);

    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid request parameters detected.',
        code: 'INVALID_INPUT',
      },
    });
  }

  // Scan body parameters
  const bodyResult = scanObject(req.body, 'body');
  if (bodyResult.found) {
    logger.error(`🚨 ATTACK DETECTED in body: ${bodyResult.type} from ${ip}`, {
      path: bodyResult.path,
      pattern: bodyResult.pattern,
      value: bodyResult.value,
      url: req.url,
    });

    trackSuspiciousActivity(ip);

    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid request data detected.',
        code: 'INVALID_INPUT',
      },
    });
  }

  next();
};

/**
 * Strict Login Rate Limiter (Amazon-level)
 * Only 3 attempts per 15 minutes per IP
 */
const strictLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Only 3 attempts
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    logger.warn(`⚠️ LOGIN RATE LIMIT: ${ip} exceeded 3 login attempts`);

    // Track as suspicious activity
    trackSuspiciousActivity(ip);

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many login attempts. Please try again in 15 minutes.',
        code: 'TOO_MANY_ATTEMPTS',
      },
    });
  },
});

/**
 * Strict Registration Rate Limiter
 * Only 2 accounts per hour per IP
 */
const strictRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2,
  handler: (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    logger.warn(`⚠️ REGISTRATION RATE LIMIT: ${ip} exceeded 2 registrations/hour`);

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many registration attempts. Please try again later.',
        code: 'TOO_MANY_REGISTRATIONS',
      },
    });
  },
});

/**
 * Payment Endpoint Protection
 * Extra rate limiting for payment endpoints
 */
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Max 10 payment attempts per 10 minutes
  handler: (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    logger.warn(`⚠️ PAYMENT RATE LIMIT: ${ip} exceeded 10 payment attempts`);

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many payment attempts. Please contact support if you need assistance.',
        code: 'TOO_MANY_PAYMENT_ATTEMPTS',
      },
    });
  },
});

/**
 * File Upload Size Validation
 */
const validateFileUpload = (maxSizeMB = 5) => {
  return (req, res, next) => {
    if (!req.files && !req.file) return next();

    const files = req.files ? Object.values(req.files).flat() : [req.file];

    for (const file of files) {
      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: {
            message: `File too large. Maximum size is ${maxSizeMB}MB.`,
            code: 'FILE_TOO_LARGE',
          },
        });
      }

      // Check file type (whitelist approach)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp', 'image/tiff', 'image/avif', 'image/heic', 'image/heif'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid file type. Only images (JPEG, PNG, WebP, GIF) are allowed.',
            code: 'INVALID_FILE_TYPE',
          },
        });
      }
    }

    next();
  };
};

/**
 * Request Size Limiter
 * Prevents large payload attacks
 */
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  const maxSize = 15 * 1024 * 1024; // 15MB max

  if (contentLength > maxSize) {
    logger.warn(`⚠️ REQUEST TOO LARGE: ${contentLength} bytes from ${req.ip}`);

    return res.status(413).json({
      success: false,
      error: {
        message: 'Request payload too large.',
        code: 'PAYLOAD_TOO_LARGE',
      },
    });
  }

  next();
};

// ===========================
// SECURITY MONITORING
// ===========================

/**
 * Security Event Logger
 * Logs all security-related events
 */
const securityEventLogger = (event, data) => {
  logger.info(`🔒 SECURITY EVENT: ${event}`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Get Security Statistics
 */
const getSecurityStats = () => {
  return {
    blockedIPs: Array.from(blockedIPs.entries()).map(([ip, data]) => ({
      ip,
      reason: data.reason,
      until: new Date(data.until).toISOString(),
    })),
    suspiciousActivity: Array.from(suspiciousActivity.entries()).map(([ip, data]) => ({
      ip,
      count: data.count,
      lastActivity: new Date(data.lastActivity).toISOString(),
    })),
    totalBlockedIPs: blockedIPs.size,
    totalSuspiciousIPs: suspiciousActivity.size,
  };
};

// ===========================
// EXPORTS
// ===========================

module.exports = {
  // Middleware
  ipBlockingMiddleware,
  attackDetectionMiddleware,
  strictLoginLimiter,
  strictRegisterLimiter,
  paymentLimiter,
  validateFileUpload,
  requestSizeLimiter,

  // Utilities
  blockIP,
  isIPBlocked,
  trackSuspiciousActivity,
  securityEventLogger,
  getSecurityStats,

  // Pattern detection
  detectMaliciousPatterns,
  ATTACK_PATTERNS,
};
