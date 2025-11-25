// Development-only logger utility
// Prevents console logs in production for security

const isDevelopment = import.meta.env.MODE === 'development';

// Safe logger that only works in development
const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },

  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  // For debugging specific features (can be toggled independently)
  feature: (feature, ...args) => {
    if (isDevelopment && import.meta.env[`VITE_DEBUG_${feature.toUpperCase()}`]) {
      console.log(`[${feature}]`, ...args);
    }
  },
};

// Sanitize sensitive data before logging
export const sanitizeForLog = (data) => {
  if (!data) return data;

  const sensitiveFields = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'accountNumber',
    'cardNumber',
    'cvv',
    'pin',
    'ssn',
    'taxId',
  ];

  const sanitized = { ...data };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  });

  return sanitized;
};

export default logger;
