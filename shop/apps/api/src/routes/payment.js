const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const razorpayController = require('../controllers/razorpayController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { paymentLimiter, webhookLimiter } = require('../middleware/rateLimiter');

// PhonePe payment routes - Support guest checkout
router.post('/phonepe/create', optionalAuth, paymentLimiter, paymentController.createPayment);
router.get('/phonepe/status/:transactionId', optionalAuth, paymentController.checkPaymentStatus);
router.post('/phonepe/refund', authenticate, authorize(['admin']), paymentController.refundPayment);

// PhonePe callback/webhook (no authentication - verified by checksum, but rate limited)
router.post('/phonepe/callback', webhookLimiter, paymentController.phonePeCallback);

// Razorpay payment routes - Support guest checkout
router.post('/razorpay/create-order', optionalAuth, paymentLimiter, razorpayController.createOrder);
router.post('/razorpay/verify', optionalAuth, paymentLimiter, razorpayController.verifyPayment);
router.post('/razorpay/failure', optionalAuth, paymentLimiter, razorpayController.paymentFailure);
router.get('/razorpay/key', razorpayController.getRazorpayKey);

// Razorpay webhook (no authentication - verified by signature, but rate limited)
router.post('/razorpay/webhook', webhookLimiter, razorpayController.webhook);

module.exports = router;
