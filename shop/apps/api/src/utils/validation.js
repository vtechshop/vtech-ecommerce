// FILE: apps/api/src/utils/validation.js
const { body, param, query } = require('express-validator');

// Common validations
const idValidation = param('id').isMongoId().withMessage('Invalid ID format');

const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Invalid email address');

// SECURITY: Strong password validation
const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/[a-z]/)
  .withMessage('Password must contain at least one lowercase letter')
  .matches(/[A-Z]/)
  .withMessage('Password must contain at least one uppercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number')
  .matches(/[!@#$%^&*(),.?":{}|<>]/)
  .withMessage('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// SECURITY: Input sanitization for search parameters
const searchValidation = query('search')
  .optional()
  .trim()
  .isLength({ max: 100 })
  .withMessage('Search query must be less than 100 characters')
  .matches(/^[a-zA-Z0-9\s@._-]+$/)
  .withMessage('Search query contains invalid characters');

// Admin-specific validations
const updateUserValidation = [
  idValidation,
  body('email').optional().isEmail().normalizeEmail(),
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('role').optional().isIn(['guest', 'customer', 'vendor', 'affiliate', 'support', 'admin']),
  body('isActive').optional().isBoolean(),
];

const updateSettingValidation = [
  param('key').trim().isLength({ min: 1, max: 100 }).matches(/^[a-zA-Z0-9_.-]+$/),
  body('value').exists().withMessage('Value is required'),
  body('type').optional().isIn(['string', 'number', 'boolean', 'json', 'array']),
  body('category').optional().isIn(['general', 'payment', 'shipping', 'email', 'seo', 'security', 'notifications', 'features', 'maintenance', 'integrations']),
];

const orderStatusValidation = [
  idValidation,
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  body('description').optional().trim().isLength({ max: 500 }),
];

const vendorActionValidation = [
  idValidation,
  body('reason').optional().trim().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters'),
];

const createCategoryValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('description').optional().trim().isLength({ max: 1000 }),
];

module.exports = {
  idValidation,
  emailValidation,
  passwordValidation,
  paginationValidation,
  searchValidation,
  updateUserValidation,
  updateSettingValidation,
  orderStatusValidation,
  vendorActionValidation,
  createCategoryValidation,
};