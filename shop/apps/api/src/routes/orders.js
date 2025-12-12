// FILE: apps/api/src/routes/orders.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { checkoutLimiter, orderTrackingLimiter } = require('../middleware/rateLimiter');

// Public - Stricter rate limiting to prevent email enumeration (10 attempts per 15 min)
router.post('/track', orderTrackingLimiter, orderController.trackOrder);

// Create order - supports both authenticated and guest checkout
router.post('/', optionalAuth, orderController.createOrder);

// Authenticated only
router.get('/', authenticate, orderController.getOrders);
router.get('/:id', optionalAuth, orderController.getOrderById);  // Support guest checkout
router.post('/:id/cancel', authenticate, orderController.cancelOrder);
router.post('/:id/return', authenticate, orderController.requestReturn);

// SECURITY NOTE: Webhook routes have been moved to payment.js
// See src/routes/payment.js for secure webhook implementations

module.exports = router;
