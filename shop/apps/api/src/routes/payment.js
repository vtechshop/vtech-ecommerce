const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const razorpayController = require('../controllers/razorpayController');
const { authenticate, authorize } = require('../middleware/auth');
const { paymentLimiter, webhookLimiter } = require('../middleware/rateLimiter');

// PhonePe payment routes
router.post('/phonepe/create', authenticate, paymentLimiter, paymentController.createPayment);
router.get('/phonepe/status/:transactionId', authenticate, paymentController.checkPaymentStatus);
router.post('/phonepe/refund', authenticate, authorize(['admin']), paymentController.refundPayment);

// PhonePe callback/webhook (no authentication - verified by checksum, but rate limited)
router.post('/phonepe/callback', webhookLimiter, paymentController.phonePeCallback);

// Razorpay payment routes
router.post('/razorpay/create-order', authenticate, paymentLimiter, razorpayController.createOrder);
router.post('/razorpay/verify', authenticate, paymentLimiter, razorpayController.verifyPayment);
router.post('/razorpay/failure', authenticate, paymentLimiter, razorpayController.paymentFailure);
router.get('/razorpay/key', authenticate, razorpayController.getRazorpayKey);

// Razorpay webhook (no authentication - verified by signature, but rate limited)
router.post('/razorpay/webhook', webhookLimiter, razorpayController.webhook);

module.exports = router;
