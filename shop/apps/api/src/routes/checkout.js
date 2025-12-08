// FILE: apps/api/src/routes/checkout.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { authenticate } = require('../middleware/auth');
const { checkoutLimiter } = require('../middleware/rateLimiter');
const checkoutController = require('../controllers/checkoutController');

// Get shipping quotes (no auth required for guest checkout) - rate limited
router.post(
  '/shipping-quotes',
  checkoutLimiter,
  [
    body('addressId').optional().isMongoId(),
    body('address').optional().isObject(),
  ],
  validate,
  checkoutController.getShippingQuotes
);

// Calculate taxes (no auth required) - rate limited
router.post('/taxes', checkoutLimiter, checkoutController.calculateTaxes);

// Create payment intent (requires authentication)
router.post(
  '/payment-intent',
  authenticate,
  checkoutController.createPaymentIntent
);

module.exports = router;