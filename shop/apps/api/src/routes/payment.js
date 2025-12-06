const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

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

// PhonePe payment routes
router.post('/phonepe/create', authenticate, paymentLimiter, paymentController.createPayment);
router.get('/phonepe/status/:transactionId', authenticate, paymentController.checkPaymentStatus);
router.post('/phonepe/refund', authenticate, authorize(['admin']), paymentController.refundPayment);

// PhonePe callback/webhook (no authentication - verified by checksum)
router.post('/phonepe/callback', paymentController.phonePeCallback);

module.exports = router;
