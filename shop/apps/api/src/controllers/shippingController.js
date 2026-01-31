// FILE: apps/api/src/controllers/shippingController.js
const Order = require('../models/Order');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const logger = require('../config/logger');
const shippingService = require('../services/shippingService');
const delhiveryService = require('../services/delhiveryService');
const trackingSyncService = require('../services/trackingSyncService');

// ============================================
// ADMIN: Get Available Shipping Carriers
// ============================================
exports.getAvailableCarriers = async (req, res, next) => {
  try {
    const carriers = shippingService.getAvailableCarriers();

    res.json({
      success: true,
      data: {
        carriers,
        count: carriers.length,
        message: carriers.length === 0
          ? 'No carriers configured. Please add carrier credentials to .env file.'
          : `${carriers.length} carrier(s) available`
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN: Get Shipping Rate Quotes for Order
// ============================================
exports.getShippingQuotesForOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Support both MongoDB _id and readable orderId
    const mongoose = require('mongoose');
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { orderId };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    if (!order.shipTo || !order.shipTo.zipCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER',
          message: 'Order does not have valid shipping address',
        },
      });
    }

    // Calculate total weight from order items
    const totalWeight = order.items.reduce((sum, item) => {
      // Assume 500g per item if not specified
      const itemWeight = item.weight || 500;
      return sum + (itemWeight * item.qty);
    }, 0);

    // Get rates from all available carriers
    const rates = await shippingService.calculateShippingRates(
      { zipCode: '110001' }, // Your warehouse/store pincode (should come from settings)
      { zipCode: order.shipTo.zipCode },
      { weight: totalWeight },
      order.totals.total // For COD calculation
    );

    logger.info(`Shipping quotes fetched for order ${orderId}: ${rates.length} options`);

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        destination: {
          city: order.shipTo.city,
          state: order.shipTo.state,
          zipCode: order.shipTo.zipCode
        },
        weight: totalWeight,
        rates: rates,
        recommended: rates[0] // Cheapest option
      }
    });
  } catch (error) {
    logger.error('Error getting shipping quotes:', error);
    next(error);
  }
};

// ============================================
// ADMIN/VENDOR: Assign Carrier to Order
// ============================================
exports.assignCarrierToOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { carrier } = req.body; // e.g., "delhivery", "shiprocket", "bluedart"

    if (!carrier) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Carrier name is required',
        },
      });
    }

    // Support both MongoDB _id and readable orderId
    const mongoose = require('mongoose');
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { orderId };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    // Check if vendor owns this order (unless admin)
    if (req.user.role === 'vendor') {
      const user = await User.findById(req.user._id).populate('vendorProfile');
      if (!user || !user.vendorProfile) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Vendor profile not found' },
        });
      }
      const hasItem = order.items.some(
        item => item.vendorId && item.vendorId.toString() === user.vendorProfile._id.toString()
      );
      if (!hasItem) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized' },
        });
      }
    }

    // Verify carrier is available
    if (!shippingService.isCarrierConfigured(carrier)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CARRIER',
          message: `Carrier "${carrier}" is not configured. Available carriers: ${shippingService.getAvailableCarriers().map(c => c.id).join(', ')}`,
        },
      });
    }

    // Create shipment with selected carrier
    const orderData = {
      orderId: order.orderId,
      shipTo: order.shipTo,
      items: order.items,
      totals: order.totals,
      payment: order.payment,
      guestEmail: order.guestEmail,
      customerNotes: order.customerNotes,
      weight: order.items.reduce((sum, item) => sum + ((item.weight || 500) * item.qty), 0),
      dimensions: { length: 30, width: 20, height: 10 }, // Default dimensions
    };

    const shipment = await shippingService.createShipment(orderData, carrier);

    // Update order with shipment details
    order.shipment = {
      carrier: shipment.carrier,
      awb: shipment.awb,
      trackingUrl: shipment.trackingUrl,
      shippedAt: null,
      deliveredAt: null,
      events: [{
        code: 'CREATED',
        description: `Shipment created with ${carrier}`,
        timestamp: new Date(),
      }],
    };

    order.events.push({
      status: 'processing',
      description: `Shipping label created via ${carrier}`,
      timestamp: new Date(),
    });

    await order.save();

    logger.info(`✅ Order ${orderId} assigned to ${carrier} - AWB: ${shipment.awb}`);

    res.json({
      success: true,
      message: `Order assigned to ${carrier} successfully`,
      data: {
        orderId: order.orderId,
        carrier: shipment.carrier,
        awb: shipment.awb,
        trackingUrl: shipment.trackingUrl,
        shipment: shipment
      }
    });
  } catch (error) {
    logger.error('Error assigning carrier to order:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SHIPMENT_CREATION_FAILED',
        message: error.message || 'Failed to create shipment with carrier',
      },
    });
  }
};

// ============================================
// ADMIN: Get Recommended Carrier for Order
// ============================================
exports.getRecommendedCarrier = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { priority = 'cost' } = req.query; // 'cost' or 'speed'

    // Support both MongoDB _id and readable orderId
    const mongoose = require('mongoose');
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { orderId };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    const totalWeight = order.items.reduce((sum, item) =>
      sum + ((item.weight || 500) * item.qty), 0
    );

    const recommended = await shippingService.getRecommendedCarrier(
      { zipCode: '110001' },
      { zipCode: order.shipTo.zipCode },
      { weight: totalWeight },
      priority
    );

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        recommended: recommended,
        priority: priority,
        message: `Best ${priority} option: ${recommended.carrier} - ₹${recommended.rate}`
      }
    });
  } catch (error) {
    logger.error('Error getting recommended carrier:', error);
    next(error);
  }
};

// ============================================
// ADMIN: Check Carrier Status/Health
// ============================================
exports.getCarrierStatus = async (req, res, next) => {
  try {
    const { carrier } = req.params;

    const status = await shippingService.getCarrierStatus(carrier);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error checking carrier status:', error);
    next(error);
  }
};

// ============================================
// LEGACY: Set carrier and AWB manually
// ============================================
exports.setCarrierAndAwb = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { carrier, awb } = req.body;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    // Check if vendor owns this order (unless admin)
    if (req.user.role === 'vendor') {
      const user = await User.findById(req.user._id).populate('vendorProfile');
      if (!user || !user.vendorProfile) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Vendor profile not found' },
        });
      }
      const hasItem = order.items.some(
        item => item.vendorId && item.vendorId.toString() === user.vendorProfile._id.toString()
      );
      if (!hasItem) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Not authorized' },
        });
      }
    }

    order.shipment = {
      carrier,
      awb,
      events: [{
        code: 'CREATED',
        description: 'Shipping label created manually',
        timestamp: new Date(),
      }],
    };

    await order.save();

    logger.info(`Manual shipping info added to order: ${orderId}`);

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Mark as packed
// ============================================
exports.markAsPacked = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    order.status = 'packed';
    order.events.push({
      status: 'packed',
      description: 'Order packed and ready for pickup',
      timestamp: new Date(),
    });

    if (order.shipment) {
      order.shipment.events.push({
        code: 'PACKED',
        description: 'Order packed',
        timestamp: new Date(),
      });
    }

    await order.save();

    logger.info(`Order marked as packed: ${orderId}`);

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Mark as shipped
// ============================================
exports.markAsShipped = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    order.status = 'shipped';
    order.events.push({
      status: 'shipped',
      description: 'Order shipped',
      timestamp: new Date(),
    });

    if (order.shipment) {
      order.shipment.shippedAt = new Date();
      order.shipment.events.push({
        code: 'SHIPPED',
        description: 'Order shipped',
        timestamp: new Date(),
      });
    }

    await order.save();

    logger.info(`Order marked as shipped: ${orderId}`);

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Generate shipping label
// ============================================
exports.generateLabel = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    if (!order.shipment || !order.shipment.awb) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_SHIPMENT',
          message: 'Order does not have shipping information. Assign a carrier first.',
        },
      });
    }

    // Get label from carrier
    const label = await shippingService.getLabel(
      order.shipment.awb,
      order.shipment.carrier
    );

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        awb: order.shipment.awb,
        carrier: order.shipment.carrier,
        label: label
      }
    });
  } catch (error) {
    logger.error('Error generating label:', error);
    next(error);
  }
};

// ============================================
// Carrier webhook handler
// ============================================
exports.carrierWebhook = async (req, res, next) => {
  try {
    const { carrier } = req.params;

    logger.info(`Webhook received from ${carrier}:`, req.body);

    // Process webhook based on carrier
    // Each carrier has different webhook format
    // This is a placeholder - implement based on carrier documentation

    res.json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    logger.error('Webhook error:', error);
    next(error);
  }
};

// ============================================
// DELHIVERY SPECIFIC ROUTES (Legacy)
// ============================================

// Get tracking information
exports.getTrackingInfo = async (req, res, next) => {
  try {
    const { awb, carrier } = req.query;

    if (!awb) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'AWB number is required' },
      });
    }

    const tracking = await shippingService.trackShipment(awb, carrier || null);

    res.json({
      success: true,
      data: tracking
    });
  } catch (error) {
    logger.error('Tracking error:', error);
    next(error);
  }
};

// Sync tracking data
exports.syncTrackingData = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Support both MongoDB _id and readable orderId
    const mongoose = require('mongoose');
    const query = mongoose.Types.ObjectId.isValid(orderId)
      ? { _id: orderId }
      : { orderId };

    const order = await Order.findOne(query);

    if (!order || !order.shipment || !order.shipment.awb) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order or shipment not found' },
      });
    }

    // Use tracking sync service to get updated status
    const syncResult = await trackingSyncService.syncOrderTracking(order);

    if (!syncResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'SYNC_FAILED', message: syncResult.message }
      });
    }

    // Update order with latest tracking info and status
    if (syncResult.tracking) {
      order.shipment.carrierStatus = syncResult.tracking.status;
      order.shipment.currentLocation = syncResult.tracking.currentLocation;
      order.shipment.estimatedDelivery = syncResult.tracking.estimatedDelivery;
      order.shipment.trackingLastSynced = syncResult.tracking.lastUpdated;
      order.shipment.events = syncResult.tracking.events;
    }

    // Update order status if it changed
    if (syncResult.statusChanged) {
      const oldStatus = order.status;
      order.status = syncResult.newStatus;

      // Add status change event
      order.events.push({
        status: syncResult.newStatus,
        description: `Status automatically updated from carrier: ${syncResult.tracking.status}`,
        timestamp: new Date()
      });

      // Set deliveredAt timestamp if order is delivered
      if (syncResult.newStatus === 'delivered' && !order.shipment.deliveredAt) {
        order.shipment.deliveredAt = new Date();
      }

      logger.info(`✅ Order ${order.orderId} status automatically updated: ${oldStatus} → ${syncResult.newStatus}`);
    }

    await order.save();

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        statusChanged: syncResult.statusChanged,
        oldStatus: syncResult.oldStatus,
        newStatus: syncResult.newStatus,
        tracking: syncResult.tracking,
        message: syncResult.statusChanged
          ? `Order status automatically updated to ${syncResult.newStatus}`
          : 'Tracking data synced successfully'
      }
    });
  } catch (error) {
    logger.error('❌ Sync tracking error:', error.message);
    next(error);
  }
};

// Calculate shipping rate
exports.calculateShippingRate = async (req, res, next) => {
  try {
    const { originPin, destinationPin, weight } = req.body;

    const rates = await shippingService.calculateShippingRates(
      { zipCode: originPin },
      { zipCode: destinationPin },
      { weight: weight }
    );

    res.json({
      success: true,
      data: { rates }
    });
  } catch (error) {
    next(error);
  }
};

// Schedule pickup (Delhivery)
exports.schedulePickup = async (req, res, next) => {
  try {
    const pickupDetails = req.body;

    // For now, use Delhivery for pickup
    // In future, can detect carrier from order
    const result = await delhiveryService.raisePickupRequest(pickupDetails);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Create shipment/waybill (Delhivery)
exports.createShipment = async (req, res, next) => {
  try {
    const shipmentData = req.body;

    const result = await delhiveryService.createShipment(shipmentData);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Get Delhivery service status
exports.getServiceStatus = async (req, res, next) => {
  try {
    const status = await delhiveryService.getServiceStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};
