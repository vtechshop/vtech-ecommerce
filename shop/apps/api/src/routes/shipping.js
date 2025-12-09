// FILE: apps/api/src/routes/shipping.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validator');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { webhookLimiter } = require('../middleware/rateLimiter');
const shippingController = require('../controllers/shippingController');

// Set carrier and AWB (vendor/admin only)
router.post(
  '/orders/:orderId/carrier',
  authenticate,
  authorize(['vendor', 'admin']),
  [
    body('carrier').notEmpty().withMessage('Carrier is required'),
    body('awb').notEmpty().withMessage('AWB is required'),
  ],
  validate,
  shippingController.setCarrierAndAwb
);

// Mark as packed
router.post(
  '/orders/:orderId/packed',
  authenticate,
  authorize(['vendor', 'admin']),
  shippingController.markAsPacked
);

// Mark as shipped
router.post(
  '/orders/:orderId/shipped',
  authenticate,
  authorize(['vendor', 'admin']),
  shippingController.markAsShipped
);

// Generate shipping label (mock)
router.get(
  '/orders/:orderId/label',
  authenticate,
  authorize(['vendor', 'admin']),
  shippingController.generateLabel
);

// Shipping webhook (carrier updates) - rate limited to prevent DoS
router.post('/webhooks/:carrier', webhookLimiter, shippingController.carrierWebhook);

// ==================== DELHIVERY TRACKING ROUTES ====================

// Get tracking information (Public/Protected - uses optionalAuth)
const { optionalAuth } = require('../middleware/auth');
router.get('/tracking', optionalAuth, shippingController.getTrackingInfo);

// Sync tracking data from Delhivery (Admin/Vendor only)
router.post(
  '/orders/:orderId/sync',
  authenticate,
  authorize(['vendor', 'admin']),
  shippingController.syncTrackingData
);

// Calculate shipping rate (Public)
router.post(
  '/calculate-rate',
  [
    body('originPin').notEmpty().withMessage('Origin PIN code is required'),
    body('destinationPin').notEmpty().withMessage('Destination PIN code is required'),
    body('weight').isNumeric().withMessage('Weight must be a number'),
  ],
  validate,
  shippingController.calculateShippingRate
);

// Schedule pickup (Vendor only)
router.post(
  '/schedule-pickup',
  authenticate,
  authorize(['vendor', 'admin']),
  shippingController.schedulePickup
);

// Create shipment/waybill (Vendor only)
router.post(
  '/create-shipment',
  authenticate,
  authorize(['vendor', 'admin']),
  shippingController.createShipment
);

// Get Delhivery service status (Admin only)
router.get(
  '/status',
  authenticate,
  authorize('admin'),
  shippingController.getServiceStatus
);

// ==================== ADMIN CARRIER SELECTION ROUTES ====================

// Get all available carriers (Admin)
router.get(
  '/carriers',
  authenticate,
  authorize(['admin']),
  shippingController.getAvailableCarriers
);

// Get shipping quotes for specific order (Admin/Vendor)
router.get(
  '/orders/:orderId/quotes',
  authenticate,
  authorize(['admin', 'vendor']),
  [
    param('orderId').notEmpty().withMessage('Order ID is required'),
  ],
  validate,
  shippingController.getShippingQuotesForOrder
);

// Assign carrier to order and create shipment (Admin/Vendor)
router.post(
  '/orders/:orderId/assign-carrier',
  authenticate,
  authorize(['admin', 'vendor']),
  [
    param('orderId').notEmpty().withMessage('Order ID is required'),
    body('carrier').notEmpty().withMessage('Carrier is required'),
  ],
  validate,
  shippingController.assignCarrierToOrder
);

// Get recommended carrier for order (Admin/Vendor)
router.get(
  '/orders/:orderId/recommended',
  authenticate,
  authorize(['admin', 'vendor']),
  [
    param('orderId').notEmpty().withMessage('Order ID is required'),
  ],
  validate,
  shippingController.getRecommendedCarrier
);

// Check carrier status (Admin)
router.get(
  '/carriers/:carrier/status',
  authenticate,
  authorize(['admin']),
  [
    param('carrier').notEmpty().withMessage('Carrier name is required'),
  ],
  validate,
  shippingController.getCarrierStatus
);

module.exports = router;