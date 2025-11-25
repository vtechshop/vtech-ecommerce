// FILE: apps/api/src/routes/checkout.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { authenticate } = require('../middleware/auth');
const checkoutController = require('../controllers/checkoutController');

// Get shipping quotes (no auth required for guest checkout)
router.post(
  '/shipping-quotes',
  [
    body('addressId').optional().isMongoId(),
    body('address').optional().isObject(),
  ],
  validate,
  checkoutController.getShippingQuotes
);

// Calculate taxes (no auth required)
router.post('/taxes', checkoutController.calculateTaxes);

// Create payment intent (requires authentication)
router.post(
  '/payment-intent',
  authenticate,
  checkoutController.createPaymentIntent
);

module.exports = router;