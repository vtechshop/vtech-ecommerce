// FILE: apps/api/src/routes/orders.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const invoiceController = require('../controllers/invoiceController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { checkoutLimiter, orderTrackingLimiter, orderCreationLimiter } = require('../middleware/rateLimiter');

// Public - Stricter rate limiting to prevent email enumeration (10 attempts per 15 min)
router.post('/track', orderTrackingLimiter, orderController.trackOrder);
router.post('/track-awb', orderTrackingLimiter, orderController.trackOrderByAwb);

// SECURITY: Create order - supports both authenticated and guest checkout with strict rate limiting
router.post('/', orderCreationLimiter, optionalAuth, orderController.createOrder);

// Authenticated only
router.get('/', authenticate, orderController.getOrders);
router.get('/:id/invoice', authenticate, invoiceController.downloadInvoice);
router.get('/:id', optionalAuth, orderController.getOrderById);  // Support guest checkout
router.post('/:id/cancel', authenticate, orderController.cancelOrder);
router.post('/:id/return', authenticate, orderController.requestReturn);

// SECURITY NOTE: Webhook routes have been moved to payment.js
// See src/routes/payment.js for secure webhook implementations

module.exports = router;
