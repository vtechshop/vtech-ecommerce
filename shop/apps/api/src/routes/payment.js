const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const { paymentLimiter, webhookLimiter } = require('../middleware/rateLimiter');

// PhonePe payment routes
router.post('/phonepe/create', authenticate, paymentLimiter, paymentController.createPayment);
router.get('/phonepe/status/:transactionId', authenticate, paymentController.checkPaymentStatus);
router.post('/phonepe/refund', authenticate, authorize(['admin']), paymentController.refundPayment);

// PhonePe callback/webhook (no authentication - verified by checksum, but rate limited)
router.post('/phonepe/callback', webhookLimiter, paymentController.phonePeCallback);

module.exports = router;
