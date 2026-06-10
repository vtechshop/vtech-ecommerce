// FILE: apps/api/src/controllers/razorpayController.js
const {
  createOrder: createRazorpayOrder,
  verifyPaymentSignature,
  fetchPayment,
  createTransfers,
} = require('../utils/razorpay');
const Order = require('../models/Order');
const Commission = require('../models/Commission');
const Vendor = require('../models/Vendor');
const Affiliate = require('../models/Affiliate');
const crypto = require('crypto');
const logger = require('../config/logger');
const notificationHelper = require('../services/notificationHelper');
const notificationService = require('../services/notificationService');
const { activateWarrantiesForOrder } = require('./adminController');
const socketService = require('../services/socketService');
const whatsappService = require('../services/whatsappService');

/**
 * Send order confirmation + vendor/admin notifications after payment
 * Shared by verifyPayment and handlePaymentCaptured webhook
 */
async function sendPostPaymentNotifications(order) {
  // Send order confirmation email (only if not already sent)
  if (!order.confirmationEmailSent) {
    try {
      const User = require('../models/User');

      let userInfo;
      if (order.userId && !order.isGuest) {
        const user = await User.findById(order.userId);
        if (user) {
          userInfo = { name: user.name, email: user.email };
        }
      } else if (order.isGuest && order.guestEmail) {
        userInfo = { name: order.shipTo?.fullName || 'Guest', email: order.guestEmail };
      }

      if (userInfo) {
        await notificationService.sendOrderConfirmation(userInfo, order);
        order.confirmationEmailSent = true;
        order.confirmationEmailSentAt = new Date();
        await order.save();
        logger.info(`Order confirmation email sent: ${userInfo.email}`);
      }
    } catch (emailError) {
      logger.error('Failed to send order confirmation email:', emailError);
    }
  }

  // Send vendor and admin notifications (only if not already sent)
  if (!order.vendorNotificationSent) {
    try {
      const vendorItemsMap = {};
      for (const item of order.items) {
        if (item.vendorId) {
          const vendorIdStr = item.vendorId.toString();
          if (!vendorItemsMap[vendorIdStr]) vendorItemsMap[vendorIdStr] = [];
          vendorItemsMap[vendorIdStr].push(item);
        }
      }

      for (const [vendorIdStr, vendorItems] of Object.entries(vendorItemsMap)) {
        try {
          const vendor = await Vendor.findById(vendorIdStr).populate('userId', 'email name');
          if (vendor && vendor.userId?.email) {
            await notificationService.sendVendorOrderNotification(vendor, order, vendorItems);
            logger.info(`Vendor email notification sent to ${vendor.storeName} (${vendor.userId.email})`);

            await notificationHelper.notifyVendorNewOrder({
              vendorUserId: vendor.userId._id,
              order: { _id: order._id, orderNumber: order.orderId },
              items: vendorItems.map(item => ({ quantity: item.qty, price: item.priceSnapshot })),
            });
          }
          await notificationService.sendAdminOrderNotification(order, vendorItems, vendor?.userId, vendor);
        } catch (vendorError) {
          logger.error(`Failed to send vendor notification to ${vendorIdStr}:`, vendorError);
        }
      }

      // Single admin in-app notification
      try {
        const vendorNames = Object.keys(vendorItemsMap).length > 0
          ? (await Promise.all(
              Object.keys(vendorItemsMap).map(async (vid) => {
                const v = await Vendor.findById(vid).select('storeName').lean();
                return v?.storeName;
              })
            )).filter(Boolean).join(', ')
          : 'Direct Sale';

        await notificationHelper.notifyAdminNewOrder({
          order: {
            _id: order._id,
            orderNumber: order.orderId,
            shippingAddress: { name: order.shipTo?.fullName },
            totalAmount: order.totals?.total,
          },
          vendorName: vendorNames,
        });
      } catch (adminNotifError) {
        logger.error('Failed to create admin in-app notification:', adminNotifError);
      }

      order.vendorNotificationSent = true;
      order.vendorNotificationSentAt = new Date();
      await order.save();
      logger.info(`Vendor/admin notifications sent for order ${order.orderId}`);

      // Real-time socket notifications to vendors
      try {
        for (const [vendorIdStr, vendorItems] of Object.entries(vendorItemsMap)) {
          const vendor = await Vendor.findById(vendorIdStr).select('userId storeName').lean();
          if (vendor?.userId) {
            socketService.emitToUser(vendor.userId.toString(), 'new_order', {
              orderId: order._id,
              orderNumber: order.orderId,
              itemCount: vendorItems.length,
              total: order.totals?.total,
            });
          }
        }
      } catch (socketErr) {
        logger.error('Failed to emit vendor socket notification:', socketErr);
      }
    } catch (notifError) {
      logger.error('Failed to send vendor/admin notifications:', notifError);
    }
  }

  // WhatsApp order confirmation to customer (fire-and-forget)
  try {
    const customerPhone = order.shipTo?.phone;
    const customerName = order.shipTo?.fullName || 'Customer';
    if (customerPhone) {
      whatsappService.sendOrderConfirmation(
        customerPhone,
        customerName,
        order.orderId,
        order.totals?.total
      );
    }
  } catch (waErr) {
    logger.error('Failed to send WhatsApp order confirmation:', waErr);
  }

  // Real-time socket notification to customer
  try {
    if (order.userId) {
      socketService.emitToUser(order.userId.toString(), 'order_confirmed', {
        orderId: order._id,
        orderNumber: order.orderId,
        total: order.totals?.total,
      });
    }
  } catch (socketErr) {
    logger.error('Failed to emit customer socket notification:', socketErr);
  }
}

/**
 * Helper function to restore stock when payment fails
 * @param {Object} order - Order object
 */
const restoreStockOnPaymentFailure = async (order) => {
  try {
    logger.info(`Restoring stock for failed payment on order ${order._id}`);

    for (const item of order.items) {
      const Product = require('../models/Product');
      const product = await Product.findById(item.productId);

      if (!product) {
        logger.warn(`Product not found for stock restoration: ${item.productId}`);
        continue;
      }

      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (variant) {
          variant.stock += item.qty;
          logger.info(`Restored ${item.qty} stock for variant ${item.variantId} of product ${product.title}`);
        } else {
          logger.warn(`Variant ${item.variantId} not found for stock restoration`);
        }
      } else {
        product.stock += item.qty;
        logger.info(`Restored ${item.qty} stock for product ${product.title}`);
      }

      await product.save();
    }

    logger.info(`Stock restoration completed for order ${order._id}`);
  } catch (error) {
    logger.error(`Failed to restore stock for order ${order._id}:`, error);
  }
};

/**
 * Create Razorpay order
 * POST /api/payment/razorpay/create-order
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { orderId, amount } = req.body;

    // Validate input
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'orderId and amount are required',
        },
      });
    }

    // Verify order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    // Verify order ownership (with fallback for recent orders if auth expires during payment)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isRecentOrder = order.createdAt >= oneHourAgo;

    if (order.isGuest) {
      // Guest orders: allow payment if user is not logged in, or if logged in user's email matches
      if (req.user && order.guestEmail && req.user.email !== order.guestEmail) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot pay for orders placed by another guest',
          },
        });
      }
    } else if (order.userId) {
      // Registered user orders: check ownership
      if (req.user) {
        // If logged in, must match userId
        if (order.userId.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You can only pay for your own orders',
            },
          });
        }
      } else if (!isRecentOrder) {
        // If not logged in and order is old, require login
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Please login to pay for this order',
          },
        });
      }
      // If not logged in but order is recent (within 1 hour), allow payment
      // This handles token expiration during checkout flow
    }

    // Check if order is already paid
    if (order.payment?.status === 'paid' || order.payment?.status === 'captured') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_PAID',
          message: 'Order is already paid',
        },
      });
    }

    // SECURITY: Use the order's actual total from database, not the amount from request
    // This prevents malicious users from manipulating the payment amount
    const orderTotal = order.totals?.total;
    if (!orderTotal || orderTotal <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER_TOTAL',
          message: 'Order has invalid total amount',
        },
      });
    }

    // Log if frontend amount differs from order total (for debugging)
    if (amount !== orderTotal) {
      logger.warn(`Amount mismatch for order ${orderId}: frontend=${amount}, order=${orderTotal}. Using order total.`);
    }

    // Create Razorpay order with order total from database
    const result = await createRazorpayOrder(orderTotal, 'INR', {
      receipt: `order_${orderId}`,
      notes: {
        orderId: orderId.toString(),
        userId: req.user?._id?.toString() || 'guest',
        userEmail: req.user?.email || order.guestEmail || '',
        userName: req.user?.name || order.shipTo?.fullName || 'Guest',
      },
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'RAZORPAY_ERROR',
          message: result.error || 'Failed to create Razorpay order',
        },
      });
    }

    // Update order with Razorpay order ID
    order.payment = order.payment || {};
    order.payment.method = 'razorpay';
    order.payment.razorpayOrderId = result.order.id;
    await order.save();

    res.json({
      success: true,
      data: {
        orderId: result.order.id,
        amount: result.order.amount,
        currency: result.order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    logger.error('Create Razorpay order error:', error);
    next(error);
  }
};

/**
 * Verify Razorpay payment
 * POST /api/payment/razorpay/verify
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    // Validate input
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'All payment details are required',
        },
      });
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Payment signature verification failed',
        },
      });
    }

    // Fetch payment details from Razorpay
    const paymentResult = await fetchPayment(razorpayPaymentId);
    if (!paymentResult.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_FETCH_ERROR',
          message: 'Failed to fetch payment details',
        },
      });
    }

    const payment = paymentResult.payment;

    // Find and update order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    // Verify order ownership (with fallback for recent orders if auth expires during payment)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isRecentOrder = order.createdAt >= oneHourAgo;

    if (order.isGuest) {
      // Guest orders: allow verification if user is not logged in, or if emails match
      if (req.user && order.guestEmail && req.user.email !== order.guestEmail) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot verify payment for orders placed by another guest',
          },
        });
      }
    } else if (order.userId) {
      // Registered user orders: check ownership
      if (req.user) {
        // If logged in, must match userId
        if (order.userId.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Unauthorized access to order',
            },
          });
        }
      } else if (!isRecentOrder) {
        // If not logged in and order is old, require login
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Please login to verify this payment',
          },
        });
      }
      // If not logged in but order is recent (within 1 hour), allow verification
      // This handles token expiration during checkout flow
    }

    // Check for double processing - if payment is already captured/paid, skip processing
    if (order.payment?.status === 'captured' || order.payment?.status === 'paid') {
      logger.warn(`Payment ${razorpayPaymentId} already processed for order ${orderId}, skipping duplicate processing`);
      return res.json({
        success: true,
        data: {
          orderId: order._id,
          paymentStatus: 'already_processed',
          orderStatus: order.status,
          message: 'Payment already processed',
        },
      });
    }

    // Update order with payment details
    order.payment = {
      method: 'razorpay',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      status: payment.status,
      amount: payment.amount / 100, // Convert from paise to rupees
      currency: payment.currency,
      paidAt: payment.status === 'captured' ? new Date() : null,
      cardDetails: payment.card ? {
        network: payment.card.network,
        last4: payment.card.last4,
        type: payment.card.type,
      } : null,
      method: payment.method,
      email: payment.email,
      contact: payment.contact,
    };

    // Update order status if payment is successful (captured or authorized)
    // Note: With payment_capture: 1, payments should auto-capture, but handle 'authorized' for edge cases
    const isPaymentSuccessful = payment.status === 'captured' || payment.status === 'authorized';

    if (isPaymentSuccessful) {
      // Change from pending_payment to paid
      if (order.status === 'pending' || order.status === 'pending_payment' || order.status === 'placed') {
        order.status = 'paid';
        // Add event to order history
        order.events.push({
          status: 'paid',
          description: `Payment ${payment.status} successfully`,
          timestamp: new Date(),
        });
      }

      // Activate warranties for products in this order
      try {
        await activateWarrantiesForOrder(order);
        logger.info(`Warranties activated for order ${order.orderId}`);
      } catch (warrantyError) {
        logger.error(`Failed to activate warranties for order ${order.orderId}:`, warrantyError);
      }
    }

    await order.save();

    // Create commission records and process automatic transfers after payment
    if (isPaymentSuccessful) {
      // Create commission records first, then process transfers (sequential to avoid race condition)
      createCommissionsAfterPayment(order)
        .then(() => processAutomaticTransfers(order, razorpayPaymentId))
        .catch(error => {
          logger.error(`Failed to create commissions/transfers for order ${order._id}:`, error);
        });

      // Send order confirmation + vendor/admin notifications
      await sendPostPaymentNotifications(order);
    }

    res.json({
      success: true,
      data: {
        orderId: order._id,
        paymentStatus: order.payment?.status === 'captured' ? 'paid' : order.payment?.status,
        orderStatus: order.status,
      },
    });
  } catch (error) {
    logger.error('Payment verification error:', error);
    next(error);
  }
};

/**
 * Get Razorpay key
 * GET /api/payment/razorpay/key
 */
exports.getRazorpayKey = (req, res) => {
  res.json({
    success: true,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
};

/**
 * Handle payment failure
 * POST /api/payment/razorpay/failure
 */
exports.paymentFailure = async (req, res, next) => {
  try {
    const { orderId, error } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'orderId is required',
        },
      });
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    // Verify order ownership (with fallback for recent orders if auth expires during payment)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isRecentOrder = order.createdAt >= oneHourAgo;

    if (order.isGuest) {
      // Guest orders: allow if user is not logged in, or if emails match
      if (req.user && order.guestEmail && req.user.email !== order.guestEmail) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Unauthorized access to order',
          },
        });
      }
    } else if (order.userId) {
      // Registered user orders: check ownership
      if (req.user) {
        // If logged in, must match userId
        if (order.userId.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Unauthorized access to order',
            },
          });
        }
      } else if (!isRecentOrder) {
        // If not logged in and order is old, require login
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Please login to access this order',
          },
        });
      }
      // If not logged in but order is recent (within 1 hour), allow access
    }

    // Update order with failure details
    order.payment = order.payment || {};
    order.payment.status = 'failed';
    order.payment.error = error;
    order.payment.failedAt = new Date();

    await order.save();

    // Restore stock since payment failed
    await restoreStockOnPaymentFailure(order);

    res.json({
      success: true,
      message: 'Payment failure recorded',
    });
  } catch (error) {
    logger.error('Payment failure handler error:', error);
    next(error);
  }
};

/**
 * Razorpay webhook handler
 * POST /api/payment/razorpay/webhook
 */
exports.webhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook signature',
        });
      }
    }

    const event = req.body.event;

    // Handle different webhook events
    // Note: payload structure varies by event type
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(req.body.payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(req.body.payload.payment.entity);
        break;
      case 'refund.created':
        await handleRefundCreated(req.body.payload.payment.entity);
        break;
      case 'transfer.processed':
        await handleTransferProcessed(req.body.payload.transfer.entity);
        break;
      case 'transfer.failed':
        await handleTransferFailed(req.body.payload.transfer.entity);
        break;
      case 'transfer.reversed':
        await handleTransferReversed(req.body.payload.transfer.entity);
        break;
      case 'account.under_review':
      case 'account.activated':
      case 'account.suspended':
      case 'account.funds_hold':
      case 'account.funds_unhold':
        await handleAccountStatusChange(event, req.body.payload.account?.entity);
        break;
      default:
        logger.warn(`Unhandled webhook event: ${event}`);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    next(error);
  }
};

// Helper function to handle payment captured
async function handlePaymentCaptured(payload) {
  try {
    const orderId = payload.notes?.orderId;
    if (!orderId) return;

    const order = await Order.findById(orderId);
    if (!order) return;

    order.payment = order.payment || {};
    order.payment.status = 'paid';
    order.payment.paidAt = new Date();

    // Update status from pending_payment to paid
    if (order.status === 'pending' || order.status === 'pending_payment' || order.status === 'placed') {
      order.status = 'paid';
      order.events.push({
        status: 'paid',
        description: 'Payment captured successfully',
        timestamp: new Date(),
      });

      // Activate warranties for products in this order (safety net if not done in verifyPayment)
      try {
        await activateWarrantiesForOrder(order);
        logger.info(`[Webhook] Warranties activated for order ${orderId}`);
      } catch (warrantyError) {
        logger.error(`[Webhook] Failed to activate warranties for order ${orderId}:`, warrantyError);
      }
    }

    await order.save();
    logger.info(`Payment captured for order ${orderId}`);

    // Safety net: Create commissions and transfers if not already created by verifyPayment
    const existingCommissions = await Commission.countDocuments({ orderId: order._id });
    if (existingCommissions === 0) {
      logger.info(`[Webhook] No commissions found for order ${orderId}, creating now (safety net)...`);
      try {
        await createCommissionsAfterPayment(order);
        const razorpayPaymentId = payload.id;
        if (razorpayPaymentId) {
          await processAutomaticTransfers(order, razorpayPaymentId);
        }
      } catch (commissionError) {
        logger.error(`[Webhook] Failed to create commissions/transfers for order ${orderId}:`, commissionError);
      }
    }

    // Send order confirmation + vendor/admin notifications
    await sendPostPaymentNotifications(order);
  } catch (error) {
    logger.error('Error handling payment captured:', error);
  }
}

// Helper function to handle payment failed
async function handlePaymentFailed(payload) {
  try {
    const orderId = payload.notes?.orderId;
    if (!orderId) return;

    const order = await Order.findById(orderId);
    if (!order) return;

    order.payment = order.payment || {};
    order.payment.status = 'failed';
    order.payment.error = payload.error_description;

    await order.save();
    logger.info(`Payment failed for order ${orderId}`);

    // Restore stock since payment failed via webhook
    await restoreStockOnPaymentFailure(order);
  } catch (error) {
    logger.error('Error handling payment failed:', error);
  }
}

// Helper function to handle refund created
async function handleRefundCreated(payload) {
  try {
    const paymentId = payload.payment_id;
    // Find order by payment ID and update refund status
    const order = await Order.findOne({ 'payment.razorpayPaymentId': paymentId });
    if (!order) return;

    order.payment = order.payment || {};
    order.payment.refund = {
      id: payload.id,
      amount: payload.amount / 100,
      status: payload.status,
      createdAt: new Date(payload.created_at * 1000),
    };

    await order.save();
    logger.info(`Refund created for order ${order._id}`);
  } catch (error) {
    logger.error('Error handling refund created:', error);
  }
}

// Webhook handler for transfer processed
async function handleTransferProcessed(payload) {
  try {
    const transferId = payload.id;
    const orderId = payload.notes?.orderId;

    logger.info(`Transfer processed webhook: ${transferId} for order ${orderId}`);

    if (!orderId) {
      logger.warn('Transfer webhook missing orderId in notes');
      return;
    }

    // Update commission record
    const commission = await Commission.findOne({ 'transfer.transferId': transferId });

    if (commission) {
      commission.transfer.status = 'processed';
      commission.transfer.processedAt = new Date();
      commission.status = 'paid';
      commission.paidAt = new Date();
      await commission.save();

      // Update vendor/affiliate earnings
      if (commission.type === 'vendor') {
        await Vendor.findByIdAndUpdate(commission.subjectId, {
          $inc: {
            pendingEarnings: -commission.amount,
            totalEarnings: commission.amount,
          },
        });
      } else if (commission.type === 'affiliate') {
        await Affiliate.findByIdAndUpdate(commission.subjectId, {
          $inc: {
            pendingEarnings: -commission.amount,
            paidEarnings: commission.amount,
            totalEarnings: commission.amount,
          },
        });
      }

      logger.info(`Commission ${commission._id} marked as paid, earnings updated`);
    } else {
      logger.warn(`Commission not found for transfer ${transferId}`);
    }
  } catch (error) {
    logger.error('Error handling transfer processed:', error);
  }
}

// Webhook handler for transfer failed
async function handleTransferFailed(payload) {
  try {
    const transferId = payload.id;
    const failureReason = payload.error?.description || 'Unknown error';

    logger.error(`Transfer failed webhook: ${transferId} - ${failureReason}`);

    // Update commission record
    const commission = await Commission.findOne({ 'transfer.transferId': transferId });

    if (commission) {
      commission.transfer.status = 'failed';
      commission.transfer.failureReason = failureReason;
      commission.status = 'pending'; // Reset to pending for manual processing
      await commission.save();

      logger.info(`Commission ${commission._id} marked as failed: ${failureReason}`);

      // Send email alert to admin and vendor about failed transfer
      try {
        const User = require('../models/User');

        // Notify vendor
        if (commission.type === 'vendor') {
          const vendor = await Vendor.findById(commission.subjectId).populate('userId', 'email name');
          if (vendor?.userId?.email) {
            await notificationService.sendTransferAlert(vendor.userId.email, vendor.userId.name || vendor.storeName, {
              type: 'transfer_failed',
              transferId,
              amount: commission.amount,
              failureReason,
              storeName: vendor.storeName,
              orderId: commission.orderId,
            });
          }
        }

        // Notify admins
        const admins = await User.find({ role: 'admin' }).select('email name').lean();
        for (const admin of admins) {
          await notificationService.sendTransferAlert(admin.email, admin.name, {
            type: 'transfer_failed_admin',
            transferId,
            amount: commission.amount,
            failureReason,
            commissionType: commission.type,
            subjectId: commission.subjectId,
            orderId: commission.orderId,
          });
        }
      } catch (emailErr) {
        logger.error(`Failed to send transfer failure email alerts:`, emailErr);
      }
    } else {
      logger.warn(`Commission not found for failed transfer ${transferId}`);
    }
  } catch (error) {
    logger.error('Error handling transfer failed:', error);
  }
}

// Webhook handler for transfer reversed (refund scenario)
async function handleTransferReversed(payload) {
  try {
    const transferId = payload.id;
    const reversalId = payload.reversal?.id;

    logger.info(`Transfer reversed webhook: ${transferId}, reversal: ${reversalId}`);

    // Update commission record
    const commission = await Commission.findOne({ 'transfer.transferId': transferId });

    if (commission) {
      commission.transfer.status = 'reversed';
      commission.status = 'cancelled';
      await commission.save();

      // Reverse vendor/affiliate earnings
      if (commission.type === 'vendor') {
        await Vendor.findByIdAndUpdate(commission.subjectId, {
          $inc: {
            totalEarnings: -commission.amount,
            pendingEarnings: commission.amount, // Add back to pending if it was paid
          },
        });
      } else if (commission.type === 'affiliate') {
        await Affiliate.findByIdAndUpdate(commission.subjectId, {
          $inc: {
            paidEarnings: -commission.amount,
            totalEarnings: -commission.amount,
          },
        });
      }

      logger.info(`Commission ${commission._id} reversed, earnings adjusted`);
    } else {
      logger.warn(`Commission not found for reversed transfer ${transferId}`);
    }
  } catch (error) {
    logger.error('Error handling transfer reversed:', error);
  }
}

// Webhook handler for linked account status changes
async function handleAccountStatusChange(event, payload) {
  try {
    if (!payload) {
      logger.warn(`Account status webhook missing payload for event: ${event}`);
      return;
    }

    const accountId = payload.id;
    const newStatus = event.replace('account.', ''); // activated, suspended, etc.

    logger.info(`Account status webhook: ${accountId} -> ${newStatus}`);

    // Try to find vendor with this Razorpay account
    const vendor = await Vendor.findOne({ 'razorpay.accountId': accountId });
    if (vendor) {
      vendor.razorpay.accountStatus = newStatus;
      if (newStatus === 'activated') {
        vendor.razorpay.kycStatus = 'verified';
      } else if (newStatus === 'suspended') {
        vendor.razorpay.kycStatus = 'rejected';
      }
      await vendor.save();
      logger.info(`Vendor ${vendor.storeName} Razorpay status updated to ${newStatus}`);

      // Notify vendor about account status change
      try {
        const User = require('../models/User');
        const user = await User.findById(vendor.userId);
        if (user?.email) {
          await notificationService.sendTransferAlert(user.email, user.name || vendor.storeName, {
            type: 'account_status',
            status: newStatus,
            storeName: vendor.storeName,
            accountId,
          });
        }
      } catch (emailErr) {
        logger.error(`Failed to send account status email to vendor:`, emailErr);
      }
      return;
    }

    // Try affiliate
    const affiliate = await Affiliate.findOne({ 'razorpay.accountId': accountId });
    if (affiliate) {
      affiliate.razorpay.accountStatus = newStatus;
      await affiliate.save();
      logger.info(`Affiliate ${affiliate.code} Razorpay status updated to ${newStatus}`);
      return;
    }

    logger.warn(`No vendor or affiliate found for Razorpay account ${accountId}`);
  } catch (error) {
    logger.error('Error handling account status change:', error);
  }
}

/**
 * Create commissions for a successfully paid order
 * This function calculates and creates commission records after payment verification
 */
async function createCommissionsAfterPayment(order) {
  try {
    logger.info(`Creating commissions for paid order ${order._id}`);

    const commissionRecords = [];

    // Get unique vendors from order items (for multi-vendor orders)
    // Group items by vendorId and calculate subtotal per vendor
    const vendorSubtotals = {};
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.vendorId) {
          const vendorIdStr = item.vendorId.toString();
          if (!vendorSubtotals[vendorIdStr]) {
            vendorSubtotals[vendorIdStr] = 0;
          }
          // Calculate item subtotal (price * qty)
          vendorSubtotals[vendorIdStr] += (item.priceSnapshot || 0) * (item.qty || 1);
        }
      }
    }

    // Process each vendor's commission
    const vendorIds = Object.keys(vendorSubtotals);
    for (const vendorIdStr of vendorIds) {
      const Vendor = require('../models/Vendor');
      const Product = require('../models/Product');

      const vendor = await Vendor.findById(vendorIdStr);

      if (vendor) {
        // Batch fetch products for this vendor to avoid N+1 queries
        const vendorItems = order.items.filter(item => item.vendorId.toString() === vendorIdStr);
        const productIds = vendorItems.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } }).populate('categoryIds');

        // Create a map for quick product lookup
        const productMap = new Map(products.map(p => [p._id.toString(), p]));

        // Calculate commissions for each item
        for (const item of vendorItems) {
          const product = productMap.get(item.productId.toString());
          if (!product) continue;

          // Commission calculation logic
          let commissionPercentage = null;

          if (product.vendorCommissionPercentage !== undefined && product.vendorCommissionPercentage !== null) {
            commissionPercentage = product.vendorCommissionPercentage;
          }

          if (commissionPercentage === null && product.categoryIds && product.categoryIds.length > 0 &&
              product.vendorCommissionRules && product.vendorCommissionRules.length > 0) {
            for (const categoryId of product.categoryIds) {
              const rule = product.vendorCommissionRules.find(r => r.categoryId.toString() === categoryId._id.toString());
              if (rule && rule.percentage !== undefined && rule.percentage !== null) {
                commissionPercentage = rule.percentage;
                break;
              }
            }
          }

          if (commissionPercentage === null && product.categoryIds && product.categoryIds.length > 0 &&
              vendor.commissionRules && vendor.commissionRules.length > 0) {
            for (const categoryId of product.categoryIds) {
              const rule = vendor.commissionRules.find(r => r.categoryId.toString() === categoryId._id.toString());
              if (rule && rule.percentage !== undefined && rule.percentage !== null) {
                commissionPercentage = rule.percentage;
                break;
              }
            }
          }

          if (commissionPercentage === null) {
            commissionPercentage = vendor.defaultCommissionPercentage || 15;
          }

          // commissionPercentage = platform's cut (e.g. 15%)
          // Vendor earns (100 - platformCut)% of the item total
          const itemTotal = item.priceSnapshot * item.qty;
          const vendorEarningsPercentage = 100 - commissionPercentage;
          const vendorEarnings = (itemTotal * vendorEarningsPercentage) / 100;

          commissionRecords.push({
            type: 'vendor',
            subjectId: item.vendorId,
            subjectModel: 'Vendor',
            orderId: order._id,
            orderItemId: item._id,
            amount: vendorEarnings,
            percentage: commissionPercentage, // Platform's commission %
            status: 'pending',
          });
        }

        logger.info(`Created ${commissionRecords.length} commission records for vendor ${vendor.storeName}`);
      }
    }

    // Check if order has affiliate tracking and create affiliate commission
    if (order.affiliateCode) {
      const Affiliate = require('../models/Affiliate');
      const affiliate = await Affiliate.findOne({ code: order.affiliateCode });

      if (affiliate) {
        let totalAffiliateCommission = 0;

        for (const item of order.items) {
          const Product = require('../models/Product');
          const product = await Product.findById(item.productId).populate('categoryIds');
          let commissionPercentage = null;

          if (product.affiliateCommissionPercentage !== undefined && product.affiliateCommissionPercentage !== null) {
            commissionPercentage = product.affiliateCommissionPercentage;
          }

          if (commissionPercentage === null && product.categoryIds && product.categoryIds.length > 0 &&
              product.affiliateCommissionRules && product.affiliateCommissionRules.length > 0) {
            for (const categoryId of product.categoryIds) {
              const rule = product.affiliateCommissionRules.find(r => r.categoryId.toString() === categoryId._id.toString());
              if (rule && rule.percentage !== undefined && rule.percentage !== null) {
                commissionPercentage = rule.percentage;
                break;
              }
            }
          }

          if (commissionPercentage === null && product.categoryIds && product.categoryIds.length > 0 &&
              affiliate.commissionRules && affiliate.commissionRules.length > 0) {
            for (const categoryId of product.categoryIds) {
              const rule = affiliate.commissionRules.find(r => r.categoryId.toString() === categoryId._id.toString());
              if (rule && rule.percentage !== undefined && rule.percentage !== null) {
                commissionPercentage = rule.percentage;
                break;
              }
            }
          }

          if (commissionPercentage === null) {
            commissionPercentage = affiliate.commissionPercentage || 5;
          }

          const itemTotal = item.priceSnapshot * item.qty;
          const itemCommission = (itemTotal * commissionPercentage) / 100;
          totalAffiliateCommission += itemCommission;
        }

        commissionRecords.push({
          type: 'affiliate',
          subjectId: affiliate._id,
          subjectModel: 'Affiliate',
          orderId: order._id,
          amount: totalAffiliateCommission,
          percentage: affiliate.commissionPercentage,
          status: 'pending',
        });

        // Update affiliate stats
        affiliate.totalConversions += 1;
        affiliate.pendingEarnings += totalAffiliateCommission;
        await affiliate.save();

        logger.info(`Created affiliate commission: ₹${totalAffiliateCommission} for ${affiliate.code}`);
      }
    }

    // Save all commission records
    if (commissionRecords.length > 0) {
      await Commission.insertMany(commissionRecords);
      logger.info(`Successfully created ${commissionRecords.length} commission records for order ${order._id}`);
      return commissionRecords;
    } else {
      logger.info(`No commission records to create for order ${order._id}`);
      return [];
    }

  } catch (error) {
    logger.error(`Failed to create commissions for order ${order._id}:`, error);
    return [];
  }
}

/**
 * Process automatic Razorpay Route transfers to vendors and affiliates
 * Commission records are created separately by createCommissionsAfterPayment().
 * This function only handles Razorpay transfers and updates existing commission records.
 */
async function processAutomaticTransfers(order, razorpayPaymentId) {
  try {
    logger.info(`Processing automatic transfers for order ${order._id}`);

    const transfers = [];

    // Group items by vendorId
    const vendorSubtotals = {};
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.vendorId) {
          const vendorIdStr = item.vendorId.toString();
          if (!vendorSubtotals[vendorIdStr]) vendorSubtotals[vendorIdStr] = 0;
          vendorSubtotals[vendorIdStr] += (item.priceSnapshot || 0) * (item.qty || 1);
        }
      }
    }

    // Process each vendor's transfer (only for vendors with Razorpay accounts)
    for (const vendorIdStr of Object.keys(vendorSubtotals)) {
      const vendor = await Vendor.findById(vendorIdStr);

      if (vendor && vendor.razorpay?.accountId && vendor.razorpay?.accountStatus === 'activated') {
        const vendorCommissionPercentage = vendor.razorpay.settlementPercentage || 85;
        const vendorItemsSubtotal = vendorSubtotals[vendorIdStr];
        const vendorAmount = (vendorItemsSubtotal * vendorCommissionPercentage) / 100;

        // Hold transfers until delivery (default: hold for 7 days or until manually released)
        const holdUntilDelivery = vendor.razorpay.holdUntilDelivery !== false; // default true
        const holdDays = vendor.razorpay.holdDays || 7;
        const holdUntilTimestamp = holdUntilDelivery
          ? Math.floor(Date.now() / 1000) + (holdDays * 24 * 60 * 60)
          : null;

        transfers.push({
          accountId: vendor.razorpay.accountId,
          amount: vendorAmount,
          currency: 'INR',
          on_hold: holdUntilDelivery,
          on_hold_until: holdUntilTimestamp,
          notes: {
            orderId: order._id.toString(),
            orderNumber: order.orderId,
            vendorId: vendor._id.toString(),
            storeName: vendor.storeName,
            type: 'vendor_commission',
          },
        });

        logger.info(`Added vendor transfer: ${vendor.storeName} - ₹${vendorAmount}`);
      } else {
        logger.warn(`Vendor ${vendorIdStr} doesn't have activated Razorpay account. Skipping automatic transfer.`);
      }
    }

    // Check if order has affiliate with Razorpay account
    if (order.affiliateCode) {
      const affiliate = await Affiliate.findOne({ code: order.affiliateCode });

      if (affiliate && affiliate.razorpay?.accountId && affiliate.razorpay?.accountStatus === 'activated') {
        const affiliateCommissionPercentage = affiliate.commissionPercentage || 5;
        const affiliateAmount = (order.totals.subtotal * affiliateCommissionPercentage) / 100;

        transfers.push({
          accountId: affiliate.razorpay.accountId,
          amount: affiliateAmount,
          currency: 'INR',
          on_hold: true,
          on_hold_until: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
          notes: {
            orderId: order._id.toString(),
            orderNumber: order.orderId,
            affiliateId: affiliate._id.toString(),
            affiliateCode: affiliate.code,
            type: 'affiliate_commission',
          },
        });

        logger.info(`Added affiliate transfer: ${affiliate.code} - ₹${affiliateAmount}`);
      }
    }

    if (transfers.length === 0) {
      logger.info(`No Razorpay transfers to process for order ${order._id}`);
      return { success: true, message: 'No transfers needed' };
    }

    logger.info(`Creating ${transfers.length} transfer(s) for payment ${razorpayPaymentId}`);

    try {
      const transferResult = await createTransfers(razorpayPaymentId, transfers);

      if (transferResult.success && transferResult.successfulTransfers?.length > 0) {
        logger.info(`Successfully created ${transferResult.successfulTransfers.length} transfer(s)`);

        // Update existing commission records with transfer details
        for (const transfer of transferResult.successfulTransfers) {
          const commissionType = transfer.notes.type;
          const updateData = {
            transfer: {
              transferId: transfer.transferId,
              status: transfer.status,
              processedAt: new Date(),
              linkedAccountId: transfer.accountId,
            },
            status: transfer.status === 'processed' ? 'paid' : 'approved',
            approvedAt: new Date(),
          };
          if (transfer.status === 'processed') updateData.paidAt = new Date();

          try {
            if (commissionType === 'vendor_commission') {
              await Commission.findOneAndUpdate(
                { orderId: order._id, subjectId: transfer.notes.vendorId, type: 'vendor' },
                { $set: updateData }
              );
              await Vendor.findByIdAndUpdate(transfer.notes.vendorId, {
                $inc: { pendingEarnings: transfer.amount },
                'razorpay.lastSettlementAt': new Date(),
              });
            } else if (commissionType === 'affiliate_commission') {
              await Commission.findOneAndUpdate(
                { orderId: order._id, subjectId: transfer.notes.affiliateId, type: 'affiliate' },
                { $set: updateData }
              );
              await Affiliate.findByIdAndUpdate(transfer.notes.affiliateId, {
                $inc: { pendingEarnings: transfer.amount },
                'razorpay.lastSettlementAt': new Date(),
              });
            }
          } catch (updateError) {
            logger.error(`Failed to update commission for ${commissionType}: ${updateError.message}`);
          }
        }
      } else if (!transferResult.success) {
        logger.error(`Transfer creation failed: ${transferResult.error}`);
      }

      if (transferResult.failedTransfers?.length > 0) {
        logger.error(`Failed transfers (${transferResult.failedTransfers.length}):`);
        transferResult.failedTransfers.forEach((ft, i) => {
          logger.error(`  ${i + 1}. Account: ${ft.accountId}, Amount: ₹${ft.amount}, Error: ${ft.error || 'Unknown'}`);
        });
      }

      return transferResult;
    } catch (transferError) {
      logger.error(`Critical error during transfer processing: ${transferError.message}`, transferError);
      return { success: false, error: `Transfer processing failed: ${transferError.message}` };
    }
  } catch (error) {
    logger.error(`Error processing automatic transfers: ${error.message}`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Release held transfers when order is delivered
 * Call this from order status update when status changes to 'delivered'
 */
async function releaseHeldTransfers(orderId) {
  try {
    const { fetchTransfer } = require('../utils/razorpay');
    const axios = require('axios');
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

    // Find all commissions for this order that have held transfers
    const commissions = await Commission.find({
      orderId,
      'transfer.transferId': { $exists: true },
      'transfer.status': { $in: ['created', 'pending'] },
    });

    if (commissions.length === 0) {
      logger.info(`No held transfers to release for order ${orderId}`);
      return { success: true, released: 0 };
    }

    let released = 0;
    for (const commission of commissions) {
      try {
        // Modify transfer to release hold via Razorpay API
        await axios.patch(
          `https://api.razorpay.com/v1/transfers/${commission.transfer.transferId}`,
          { on_hold: false },
          { headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` } }
        );

        commission.transfer.status = 'processed';
        commission.transfer.processedAt = new Date();
        commission.status = 'paid';
        commission.paidAt = new Date();
        await commission.save();

        released++;
        logger.info(`Released held transfer ${commission.transfer.transferId} for order ${orderId}`);
      } catch (releaseErr) {
        logger.error(`Failed to release transfer ${commission.transfer.transferId}:`, releaseErr.response?.data || releaseErr.message);
      }
    }

    return { success: true, released };
  } catch (error) {
    logger.error(`Error releasing held transfers for order ${orderId}:`, error);
    return { success: false, error: error.message };
  }
}

// Export releaseHeldTransfers for use in order status updates
exports.releaseHeldTransfers = releaseHeldTransfers;
