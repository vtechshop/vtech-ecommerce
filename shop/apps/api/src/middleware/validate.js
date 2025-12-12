// FILE: middleware/validate.js
const Joi = require('joi');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

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

/**
 * Middleware to validate MongoDB ObjectId in route parameters
 * Usage: router.get('/:id', validateObjectId('id'), controller.getById)
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError(`Invalid ${paramName} format`, 400, 'INVALID_OBJECT_ID'));
    }

    next();
  };
};

/**
 * Middleware to validate multiple ObjectIds in route parameters
 * Usage: router.post('/', validateObjectIds(['userId', 'productId']), controller.create)
 */
const validateObjectIds = (paramNames = []) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const id = req.params[paramName] || req.body[paramName] || req.query[paramName];

      if (id && !mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError(`Invalid ${paramName} format`, 400, 'INVALID_OBJECT_ID'));
      }
    }

    next();
  };
};

module.exports = { validate, validateObjectId, validateObjectIds };
