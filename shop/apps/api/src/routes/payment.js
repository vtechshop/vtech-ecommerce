const express = require('express');
const router = express.Router();
const razorpayController = require('../controllers/razorpayController');
const { optionalAuth } = require('../middleware/auth');
const { paymentLimiter, webhookLimiter } = require('../middleware/rateLimiter');

// Razorpay payment routes - Support guest checkout
router.post('/razorpay/create-order', optionalAuth, paymentLimiter, razorpayController.createOrder);
router.post('/razorpay/verify', optionalAuth, paymentLimiter, razorpayController.verifyPayment);
router.post('/razorpay/failure', optionalAuth, paymentLimiter, razorpayController.paymentFailure);
router.get('/razorpay/key', razorpayController.getRazorpayKey);

// Razorpay webhook (no authentication - verified by signature, but rate limited)
router.post('/razorpay/webhook', webhookLimiter, razorpayController.webhook);

module.exports = router;
