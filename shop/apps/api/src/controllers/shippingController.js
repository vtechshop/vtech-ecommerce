// FILE: apps/api/src/controllers/shippingController.js
const Order = require('../models/Order');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const logger = require('../config/logger');
const delhiveryService = require('../services/delhiveryService');

// Set carrier and AWB
exports.setCarrierAndAwb = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { carrier, awb } = req.body;

    const order = await Order.findOne({ orderId });

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
      // Load vendor profile from database
      const user = await User.findById(req.user._id).select('vendorProfile');
      if (!user || !user.vendorProfile) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Vendor profile not found',
          },
        });
      }
      const hasItem = order.items.some(
        item => item.vendorId && item.vendorId.toString() === user.vendorProfile.toString()
      );
      if (!hasItem) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Not authorized',
          },
        });
      }
    }

    order.shipment = {
      carrier,
      awb,
      events: [{
        code: 'CREATED',
        description: 'Shipping label created',
        timestamp: new Date(),
      }],
    };

    await order.save();

    logger.info(`Shipping info added to order: ${orderId}`);

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Mark as packed
exports.markAsPacked = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
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
        description: 'Package packed',
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

// Mark as shipped
exports.markAsShipped = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
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
        description: 'Package picked up by carrier',
        timestamp: new Date(),
      });
    }

    await order.save();

    const notificationService = require('../services/notificationService');
    const User = require('../models/User');
    const user = await User.findById(order.userId);
    await notificationService.sendShippingNotification(user, order);

    logger.info(`Order marked as shipped: ${orderId}`);

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Generate shipping label (mock)
exports.generateLabel = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    // In production, generate actual label via carrier API
    const mockLabel = {
      url: `https://example.com/labels/${orderId}.pdf`,
      format: 'pdf',
      generatedAt: new Date(),
    };

    res.json({
      success: true,
      data: mockLabel,
    });
  } catch (error) {
    next(error);
  }
};

// Carrier webhook (receives tracking updates)
exports.carrierWebhook = async (req, res, next) => {
  try {
    const { carrier } = req.params;
    const { awb, event_code, description, location, timestamp } = req.body;

    // Find order by AWB
    const order = await Order.findOne({ 'shipment.awb': awb });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    // Add tracking event
    order.shipment.events.push({
      code: event_code,
      description,
      location,
      timestamp: timestamp || new Date(),
    });

    // Update order status based on event
    const statusMap = {
      IN_TRANSIT: 'shipped',
      OUT_FOR_DELIVERY: 'out_for_delivery',
      DELIVERED: 'delivered',
      FAILED: 'shipped', // Keep as shipped, but failed delivery attempt
    };

    if (statusMap[event_code]) {
      order.status = statusMap[event_code];
      order.events.push({
        status: statusMap[event_code],
        description,
        timestamp: timestamp || new Date(),
      });

      if (event_code === 'DELIVERED') {
        order.shipment.deliveredAt = timestamp || new Date();
        
        // Approve commissions on delivery
        const Commission = require('../models/Commission');
        await Commission.updateMany(
          { orderId: order._id, status: 'pending' },
          { 
            status: 'approved',
            approvedAt: new Date(),
          }
        );
      }
    }

    await order.save();

    logger.info(`Tracking update received for order: ${order.orderId} - ${event_code}`);

    res.json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    next(error);
  }
};

// ==================== DELHIVERY TRACKING INTEGRATION ====================

/**
 * Get tracking information for a shipment
 * Public endpoint - can track with order ID or AWB
 *
 * Query params:
 * - orderId: Order ID
 * - awb: AWB tracking number
 * - email: Email for verification (optional for logged-in users)
 */
exports.getTrackingInfo = async (req, res, next) => {
  try {
    const { orderId, awb, email } = req.query;
    const userId = req.user?._id;

    // Must provide either orderId or awb
    if (!orderId && !awb) {
      return res.status(400).json({
        success: false,
        message: 'Please provide order ID or tracking number (AWB)',
      });
    }

    let order;

    // Find order by orderId or awb
    if (orderId) {
      order = await Order.findOne({ orderId });
    } else if (awb) {
      order = await Order.findOne({ 'shipment.awb': awb });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Authorization check
    // Allow if: user owns order, is guest with correct email, or is admin/vendor
    const isOwner = userId && order.userId && order.userId.toString() === userId.toString();
    const isGuest = order.isGuest && email && order.guestEmail === email.toLowerCase();
    const isAdmin = req.user?.role === 'admin';
    const isVendor = req.user?.role === 'vendor' && order.items.some(
      item => item.vendorId && item.vendorId.toString() === req.user.vendorProfile?._id?.toString()
    );

    if (!isOwner && !isGuest && !isAdmin && !isVendor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this tracking information',
      });
    }

    // If no AWB yet, return order status only
    if (!order.shipment?.awb) {
      return res.json({
        success: true,
        order: {
          orderId: order.orderId,
          status: order.status,
          events: order.events,
          shipment: null,
        },
        tracking: null,
        message: 'Shipment has not been dispatched yet',
      });
    }

    // Fetch real-time tracking from Delhivery
    const tracking = await delhiveryService.trackShipment(order.shipment.awb);

    // Update order with latest tracking data if successful
    if (tracking.success && tracking.scans) {
      order.shipment.events = tracking.scans;
      order.shipment.carrier = 'Delhivery';

      // Update order status based on tracking
      if (tracking.status === 'delivered' && order.status !== 'delivered') {
        order.status = 'delivered';
        order.shipment.deliveredAt = tracking.deliveredDate || new Date();
        order.events.push({
          status: 'delivered',
          description: 'Order delivered successfully',
          timestamp: tracking.deliveredDate || new Date(),
        });

        // Approve commissions on delivery
        const Commission = require('../models/Commission');
        await Commission.updateMany(
          { orderId: order._id, status: 'pending' },
          {
            status: 'approved',
            approvedAt: new Date(),
          }
        );
      } else if (tracking.status === 'out_for_delivery' && order.status === 'shipped') {
        order.status = 'out_for_delivery';
        order.events.push({
          status: 'out_for_delivery',
          description: 'Out for delivery',
          timestamp: new Date(),
        });
      }

      await order.save();
    }

    res.json({
      success: true,
      order: {
        orderId: order.orderId,
        status: order.status,
        events: order.events,
        shipment: {
          carrier: order.shipment.carrier,
          awb: order.shipment.awb,
          shippedAt: order.shipment.shippedAt,
          deliveredAt: order.shipment.deliveredAt,
        },
      },
      tracking: tracking.success ? {
        status: tracking.status,
        statusDescription: tracking.statusDescription,
        scans: tracking.scans,
        origin: tracking.origin,
        destination: tracking.destination,
        estimatedDelivery: tracking.estimatedDelivery,
        deliveredDate: tracking.deliveredDate,
      } : null,
      error: tracking.success ? null : tracking.error,
    });

  } catch (error) {
    logger.error('Tracking info error:', error);
    next(error);
  }
};

/**
 * Sync tracking data for an order (Admin/Vendor only)
 * POST /api/shipping/orders/:orderId/sync
 */
exports.syncTrackingData = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userRole = req.user.role;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check authorization
    const isAdmin = userRole === 'admin';
    const isVendor = userRole === 'vendor' && order.items.some(
      item => item.vendorId && item.vendorId.toString() === req.user.vendorProfile?._id?.toString()
    );

    if (!isAdmin && !isVendor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to sync tracking data',
      });
    }

    if (!order.shipment?.awb) {
      return res.status(400).json({
        success: false,
        message: 'Order does not have a tracking number',
      });
    }

    // Fetch latest tracking data
    const tracking = await delhiveryService.trackShipment(order.shipment.awb);

    if (!tracking.success) {
      return res.status(400).json({
        success: false,
        message: tracking.error || 'Unable to sync tracking data',
      });
    }

    // Update order with latest data
    order.shipment.events = tracking.scans;

    // Update status if delivered
    if (tracking.status === 'delivered' && order.status !== 'delivered') {
      order.status = 'delivered';
      order.shipment.deliveredAt = tracking.deliveredDate || new Date();
      order.events.push({
        status: 'delivered',
        description: 'Order delivered successfully',
        timestamp: tracking.deliveredDate || new Date(),
      });

      // Approve commissions on delivery
      const Commission = require('../models/Commission');
      await Commission.updateMany(
        { orderId: order._id, status: 'pending' },
        {
          status: 'approved',
          approvedAt: new Date(),
        }
      );
    } else if (tracking.status === 'out_for_delivery' && order.status === 'shipped') {
      order.status = 'out_for_delivery';
      order.events.push({
        status: 'out_for_delivery',
        description: 'Out for delivery',
        timestamp: new Date(),
      });
    }

    await order.save();

    res.json({
      success: true,
      message: 'Tracking data synced successfully',
      order: {
        orderId: order.orderId,
        status: order.status,
        shipment: order.shipment,
      },
      tracking,
    });

  } catch (error) {
    logger.error('Sync tracking data error:', error);
    next(error);
  }
};

/**
 * Calculate shipping rate (Public endpoint)
 * POST /api/shipping/calculate-rate
 */
exports.calculateShippingRate = async (req, res, next) => {
  try {
    const { originPin, destinationPin, weight, cod } = req.body;

    if (!originPin || !destinationPin || !weight) {
      return res.status(400).json({
        success: false,
        message: 'Origin PIN, destination PIN, and weight are required',
      });
    }

    const rateData = await delhiveryService.calculateRate({
      originPin,
      destinationPin,
      weight,
      cod: cod || false,
    });

    res.json(rateData);

  } catch (error) {
    logger.error('Calculate shipping rate error:', error);
    next(error);
  }
};

/**
 * Schedule pickup (Vendor only)
 * POST /api/shipping/schedule-pickup
 */
exports.schedulePickup = async (req, res, next) => {
  try {
    const pickupData = req.body;

    // Vendor authorization check done by middleware
    const pickup = await delhiveryService.schedulePickup(pickupData);

    res.json(pickup);

  } catch (error) {
    logger.error('Schedule pickup error:', error);
    next(error);
  }
};

/**
 * Create shipment/waybill (Vendor only)
 * POST /api/shipping/create-shipment
 */
exports.createShipment = async (req, res, next) => {
  try {
    const shipmentData = req.body;

    // Vendor authorization check done by middleware
    const shipment = await delhiveryService.createShipment(shipmentData);

    res.json(shipment);

  } catch (error) {
    logger.error('Create shipment error:', error);
    next(error);
  }
};

/**
 * Get Delhivery service status
 * GET /api/shipping/status
 */
exports.getServiceStatus = async (req, res, next) => {
  try {
    res.json({
      success: true,
      enabled: delhiveryService.isEnabled(),
      message: delhiveryService.isEnabled()
        ? 'Delhivery tracking service is active'
        : 'Delhivery tracking service is disabled (using mock data)',
    });
  } catch (error) {
    logger.error('Get service status error:', error);
    next(error);
  }
};