const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// Payment rate limiter - stricter for payment operations
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 payment attempts per 15 minutes per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many payment attempts. Please try again later.',
    },
  },
});

// Create payment intent
router.post('/intent', authenticate, paymentLimiter, paymentController.createPaymentIntent);

// Confirm payment
router.post('/confirm', authenticate, paymentLimiter, paymentController.confirmPayment);

// Webhooks (no authentication - verified by signature)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);
router.post('/webhook/razorpay', paymentController.razorpayWebhook);

module.exports = router;