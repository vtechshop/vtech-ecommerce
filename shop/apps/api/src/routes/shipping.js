// FILE: apps/api/src/routes/shipping.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validator');
const { validateObjectId } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { webhookLimiter } = require('../middleware/rateLimiter');
const shippingController = require('../controllers/shippingController');

// Set carrier and AWB (Admin or Vendor) - Vendors can assign courier for their own orders
router.post(
  '/orders/:orderId/carrier',
  authenticate,
  authorize(['admin', 'vendor']),
  validateObjectId('orderId'),
  [
    body('carrier').notEmpty().withMessage('Carrier is required'),
    body('awb').notEmpty().withMessage('AWB is required'),
  ],
  validate,
  shippingController.setCarrierAndAwb
);

// Mark as packed - SECURITY: Added ObjectId validation
router.post(
  '/orders/:orderId/packed',
  authenticate,
  authorize(['vendor', 'admin']),
  validateObjectId('orderId'),
  shippingController.markAsPacked
);

// Mark as shipped - SECURITY: Added ObjectId validation
router.post(
  '/orders/:orderId/shipped',
  authenticate,
  authorize(['vendor', 'admin']),
  validateObjectId('orderId'),
  shippingController.markAsShipped
);

// Generate shipping label (mock) - SECURITY: Added ObjectId validation
router.get(
  '/orders/:orderId/label',
  authenticate,
  authorize(['vendor', 'admin']),
  validateObjectId('orderId'),
  shippingController.generateLabel
);

// Shipping webhook (carrier updates) - rate limited to prevent DoS
router.post('/webhooks/:carrier', webhookLimiter, shippingController.carrierWebhook);

// ==================== DELHIVERY TRACKING ROUTES ====================

// Get tracking information (Public/Protected - uses optionalAuth)
const { optionalAuth } = require('../middleware/auth');
router.get('/tracking', optionalAuth, shippingController.getTrackingInfo);

// Sync tracking data from Delhivery (Admin/Vendor only) - SECURITY: Added ObjectId validation
router.post(
  '/orders/:orderId/sync',
  authenticate,
  authorize(['vendor', 'admin']),
  validateObjectId('orderId'),
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
  authorize(['admin']),
  shippingController.getServiceStatus
);

// ==================== ADMIN CARRIER SELECTION ROUTES ====================

// Get all available carriers (Admin or Vendor)
router.get(
  '/carriers',
  authenticate,
  authorize(['admin', 'vendor']),
  shippingController.getAvailableCarriers
);

// Get shipping quotes for specific order (Admin/Vendor) - SECURITY: Added ObjectId validation
router.get(
  '/orders/:orderId/quotes',
  authenticate,
  authorize(['admin', 'vendor']),
  validateObjectId('orderId'),
  shippingController.getShippingQuotesForOrder
);

// Assign carrier to order and create shipment (Admin or Vendor)
router.post(
  '/orders/:orderId/assign-carrier',
  authenticate,
  authorize(['admin', 'vendor']),
  validateObjectId('orderId'),
  [
    body('carrier').notEmpty().withMessage('Carrier is required'),
  ],
  validate,
  shippingController.assignCarrierToOrder
);

// Get recommended carrier for order (Admin or Vendor)
router.get(
  '/orders/:orderId/recommended',
  authenticate,
  authorize(['admin', 'vendor']),
  validateObjectId('orderId'),
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