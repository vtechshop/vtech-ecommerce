'use strict';

const logger = require('../config/logger');
const env = require('../config/env');

module.exports = (err, req, res, next) => {
  logger.error(err);

  // AppError — operational errors with custom status codes
  if (err.isOperational) {
    const errorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details && (env.NODE_ENV !== 'production' || err.code === 'VALIDATION_ERROR')) {
      errorResponse.error.details = err.details;
    }
    return res.status(err.statusCode).json(errorResponse);
  }

  // Mongoose validation error — extract field-specific messages
  if (err.name === 'ValidationError') {
    const fieldErrors = {};
    Object.keys(err.errors).forEach(key => {
      fieldErrors[key] = err.errors[key].message;
    });
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check your input and try again',
        fields: fieldErrors,
      },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: err.name === 'TokenExpiredError'
          ? 'Your session has expired. Please login again.'
          : 'Invalid authentication token. Please login again.',
      },
    });
  }

  // Mongoose duplicate key error — extract field name
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : 'value';
    return res.status(400).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists. Please use a different ${field}.`,
        field,
      },
    });
  }

  // MongoDB connection errors
  if (err.name === 'MongoServerError' || err.name === 'MongoNetworkError') {
    logger.error('Database connection error:', err);
    return res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'We are experiencing technical difficulties. Please try again in a moment.',
      },
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid ${err.path}: ${err.value}`,
      },
    });
  }

  // Default — hide details in production
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later.'
        : err.message,
      ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
};
