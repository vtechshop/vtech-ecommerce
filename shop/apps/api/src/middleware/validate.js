// FILE: middleware/validate.js
const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Show all errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn({
        message: 'Validation failed',
        path: req.path,
        errors: errorDetails,
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errorDetails,
        },
      });
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

module.exports = validate;
