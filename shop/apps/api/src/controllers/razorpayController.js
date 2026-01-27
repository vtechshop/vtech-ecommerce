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

    // Update order status if payment is successful
    if (payment.status === 'captured') {
      // Change from pending_payment to placed (confirmed)
      if (order.status === 'pending' || order.status === 'pending_payment') {
        order.status = 'placed';
        // Add event to order history
        order.events.push({
          status: 'placed',
          description: 'Payment verified successfully',
          timestamp: new Date(),
        });
      }
    }

    await order.save();

    // Process automatic transfers to vendors and affiliates (Razorpay Route)
    if (payment.status === 'captured') {
      // Process transfers asynchronously - don't wait for completion
      processAutomaticTransfers(order, razorpayPaymentId).catch(error => {
        logger.error(`Failed to process automatic transfers for order ${order._id}:`, error);
      });

      // CRITICAL: Send order confirmation email AFTER payment is verified (only if not already sent)
      if (!order.confirmationEmailSent) {
        try {
          const notificationService = require('../services/notificationService');
          const User = require('../models/User');

          // Prepare user info for email
          let userInfo;
          if (order.userId && !order.isGuest) {
            const user = await User.findById(order.userId);
            if (user) {
              userInfo = {
                name: user.name,
                email: user.email,
              };
            }
          } else if (order.isGuest && order.guestEmail) {
            userInfo = {
              name: order.shipTo?.fullName || 'Guest',
              email: order.guestEmail,
            };
          }

          // Send order confirmation email
          if (userInfo) {
            await notificationService.sendOrderConfirmation(userInfo, order);
            // Mark email as sent to prevent duplicates
            order.confirmationEmailSent = true;
            order.confirmationEmailSentAt = new Date();
            await order.save();
            logger.info(`Order confirmation email sent after payment verification: ${userInfo.email}`);
          }
        } catch (emailError) {
          logger.error('Failed to send order confirmation email after payment:', emailError);
          // Don't fail the payment verification if email fails
        }
      }

      // Send vendor and admin notifications (only if not already sent)
      if (!order.vendorNotificationSent) {
        try {
          // Get unique vendors from order items
          const vendorItemsMap = {};
          for (const item of order.items) {
            if (item.vendorId) {
              const vendorIdStr = item.vendorId.toString();
              if (!vendorItemsMap[vendorIdStr]) {
                vendorItemsMap[vendorIdStr] = [];
              }
              vendorItemsMap[vendorIdStr].push(item);
            }
          }

          // Send notification to each vendor
          for (const [vendorIdStr, vendorItems] of Object.entries(vendorItemsMap)) {
            try {
              const vendor = await Vendor.findById(vendorIdStr).populate('userId', 'email name');
              if (vendor && vendor.userId?.email) {
                // Send email notification to vendor
                await notificationService.sendVendorOrderNotification(vendor, order, vendorItems);
                logger.info(`Vendor email notification sent to ${vendor.storeName} (${vendor.userId.email})`);

                // Create in-app notification for vendor
                await notificationHelper.notifyVendorNewOrder({
                  vendorUserId: vendor.userId._id,
                  order: {
                    _id: order._id,
                    orderNumber: order.orderId,
                  },
                  items: vendorItems.map(item => ({
                    quantity: item.qty,
                    price: item.priceSnapshot,
                  })),
                });
                logger.info(`Vendor in-app notification created for ${vendor.storeName}`);
              }

              // Send admin email notification for each vendor's items
              await notificationService.sendAdminOrderNotification(order, vendorItems, vendor?.userId, vendor);
            } catch (vendorError) {
              logger.error(`Failed to send vendor notification to ${vendorIdStr}:`, vendorError);
            }
          }

          // Create single in-app notification for admins (outside vendor loop to avoid duplicates)
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
            logger.info(`Admin in-app notification created for order ${order.orderId}`);
          } catch (adminNotifError) {
            logger.error(`Failed to create admin in-app notification:`, adminNotifError);
          }

          // Mark vendor notifications as sent
          order.vendorNotificationSent = true;
          order.vendorNotificationSentAt = new Date();
          await order.save();
          logger.info(`Vendor/admin notifications sent after payment verification for order ${order.orderId}`);
        } catch (notifError) {
          logger.error('Failed to send vendor/admin notifications after payment:', notifError);
        }
      }
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
    const payload = req.body.payload.payment.entity;

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;
      case 'refund.created':
        await handleRefundCreated(payload);
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

    // Update status from pending_payment to placed
    if (order.status === 'pending' || order.status === 'pending_payment') {
      order.status = 'placed';
      order.events.push({
        status: 'placed',
        description: 'Payment captured successfully via webhook',
        timestamp: new Date(),
      });
    }

    await order.save();
    logger.info(`Payment captured for order ${orderId}`);

    // Send order confirmation email after webhook payment confirmation (only if not already sent)
    if (!order.confirmationEmailSent) {
      try {
        const notificationService = require('../services/notificationService');
        const User = require('../models/User');

        let userInfo;
        if (order.userId && !order.isGuest) {
          const user = await User.findById(order.userId);
          if (user) {
            userInfo = {
              name: user.name,
              email: user.email,
            };
          }
        } else if (order.isGuest && order.guestEmail) {
          userInfo = {
            name: order.shipTo?.fullName || 'Guest',
            email: order.guestEmail,
          };
        }

        if (userInfo) {
          await notificationService.sendOrderConfirmation(userInfo, order);
          // Mark email as sent to prevent duplicates
          order.confirmationEmailSent = true;
          order.confirmationEmailSentAt = new Date();
          await order.save();
          logger.info(`Order confirmation email sent via webhook: ${userInfo.email}`);
        }
      } catch (emailError) {
        logger.error('Failed to send email via webhook:', emailError);
      }
    }

    // Send vendor and admin notifications (only if not already sent)
    if (!order.vendorNotificationSent) {
      try {
        // Get unique vendors from order items
        const vendorItemsMap = {};
        for (const item of order.items) {
          if (item.vendorId) {
            const vendorIdStr = item.vendorId.toString();
            if (!vendorItemsMap[vendorIdStr]) {
              vendorItemsMap[vendorIdStr] = [];
            }
            vendorItemsMap[vendorIdStr].push(item);
          }
        }

        // Send notification to each vendor
        for (const [vendorIdStr, vendorItems] of Object.entries(vendorItemsMap)) {
          try {
            const vendor = await Vendor.findById(vendorIdStr).populate('userId', 'email name');
            if (vendor && vendor.userId?.email) {
              // Send email notification to vendor
              await notificationService.sendVendorOrderNotification(vendor, order, vendorItems);
              logger.info(`Vendor email notification sent via webhook to ${vendor.storeName} (${vendor.userId.email})`);

              // Create in-app notification for vendor
              await notificationHelper.notifyVendorNewOrder({
                vendorUserId: vendor.userId._id,
                order: {
                  _id: order._id,
                  orderNumber: order.orderId,
                },
                items: vendorItems.map(item => ({
                  quantity: item.qty,
                  price: item.priceSnapshot,
                })),
              });
              logger.info(`Vendor in-app notification created via webhook for ${vendor.storeName}`);
            }

            // Send admin email notification for each vendor's items
            await notificationService.sendAdminOrderNotification(order, vendorItems, vendor?.userId, vendor);
          } catch (vendorError) {
            logger.error(`Failed to send vendor notification to ${vendorIdStr}:`, vendorError);
          }
        }

        // Create single in-app notification for admins (outside vendor loop to avoid duplicates)
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
          logger.info(`Admin in-app notification created via webhook for order ${order.orderId}`);
        } catch (adminNotifError) {
          logger.error(`Failed to create admin in-app notification via webhook:`, adminNotifError);
        }

        // Mark vendor notifications as sent
        order.vendorNotificationSent = true;
        order.vendorNotificationSentAt = new Date();
        await order.save();
        logger.info(`Vendor/admin notifications sent via webhook for order ${order.orderId}`);
      } catch (notifError) {
        logger.error('Failed to send vendor/admin notifications via webhook:', notifError);
      }
    }
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

/**
 * Determine if a failed transfer should be retried
 * @param {string} errorCode - Razorpay error code
 * @param {string} failureReason - Failure reason description
 * @returns {boolean} Whether the transfer should be retried
 */
function shouldRetryTransfer(errorCode, failureReason) {
  // Retry for temporary network/server errors, but not for permanent issues
  const retryableErrors = [
    'GATEWAY_ERROR',
    'SERVER_ERROR',
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'RATE_LIMIT_ERROR'
  ];

  const nonRetryableReasons = [
    'insufficient funds',
    'account suspended',
    'invalid account',
    'account not found',
    'kyc pending',
    'kyc failed'
  ];

  // Check if error code suggests retry
  if (errorCode && retryableErrors.includes(errorCode)) {
    return true;
  }

  // Check if failure reason suggests no retry
  if (failureReason) {
    const lowerReason = failureReason.toLowerCase();
    if (nonRetryableReasons.some(reason => lowerReason.includes(reason))) {
      return false;
    }
  }

  // Default to retry for unknown errors (they might be temporary)
  return true;
}

/**
 * Retry a failed transfer
 * @param {Object} commission - Commission record to retry
 */
async function retryFailedTransfer(commission) {
  try {
    logger.info(`Retrying failed transfer for commission ${commission._id}`);

    // Check if commission is still in pending status (not manually processed)
    if (commission.status !== 'pending') {
      logger.info(`Commission ${commission._id} is no longer pending, skipping retry`);
      return;
    }

    // Check retry count to prevent infinite loops
    const retryCount = commission.transfer?.retryCount || 0;
    if (retryCount >= 3) {
      logger.warn(`Commission ${commission._id} has exceeded maximum retry attempts (${retryCount})`);
      return;
    }

    // Get order to recreate transfer
    const Order = require('../models/Order');
    const order = await Order.findById(commission.orderId);
    if (!order) {
      logger.error(`Order not found for commission retry: ${commission.orderId}`);
      return;
    }

    // Get payment ID from order
    const razorpayPaymentId = order.payment?.razorpayPaymentId;
    if (!razorpayPaymentId) {
      logger.error(`Payment ID not found for order ${order._id}`);
      return;
    }

    // Recreate the transfer
    const transferData = {
      accountId: commission.transfer?.linkedAccountId,
      amount: commission.amount,
      currency: 'INR',
      notes: {
        orderId: order._id.toString(),
        orderNumber: order.orderId,
        commissionId: commission._id.toString(),
        retryAttempt: retryCount + 1,
        type: commission.type === 'vendor' ? 'vendor_commission' : 'affiliate_commission',
      },
    };

    const { createTransfers } = require('../utils/razorpay');
    const transferResult = await createTransfers(razorpayPaymentId, [transferData]);

    if (transferResult.success && transferResult.successfulTransfers.length > 0) {
      const newTransfer = transferResult.successfulTransfers[0];

      // Update commission with new transfer details
      commission.transfer.transferId = newTransfer.transferId;
      commission.transfer.status = newTransfer.status;
      commission.transfer.retryCount = retryCount + 1;
      commission.transfer.lastRetryAt = new Date();

      if (newTransfer.status === 'processed') {
        commission.status = 'paid';
        commission.paidAt = new Date();
      } else {
        commission.status = 'approved';
        commission.approvedAt = new Date();
      }

      await commission.save();
      logger.info(`Successfully retried transfer for commission ${commission._id}`);
    } else {
      // Update retry count and schedule next retry if under limit
      commission.transfer.retryCount = retryCount + 1;
      commission.transfer.lastRetryAt = new Date();
      await commission.save();

      if (retryCount + 1 < 3) {
        // Schedule next retry with exponential backoff (5 minutes, 15 minutes, 45 minutes)
        const delays = [5 * 60 * 1000, 15 * 60 * 1000, 45 * 60 * 1000];
        setTimeout(() => retryFailedTransfer(commission), delays[retryCount]);
        logger.info(`Scheduled next retry for commission ${commission._id} in ${delays[retryCount] / 1000 / 60} minutes`);
      } else {
        logger.warn(`Maximum retries exceeded for commission ${commission._id}`);
      }
    }

  } catch (error) {
    logger.error(`Failed to retry transfer for commission ${commission._id}:`, error);
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

          const commissionAmount = (item.priceSnapshot * item.qty * commissionPercentage) / 100;

          commissionRecords.push({
            type: 'vendor',
            subjectId: item.vendorId,
            subjectModel: 'Vendor',
            orderId: order._id,
            orderItemId: item._id,
            amount: commissionAmount,
            percentage: commissionPercentage,
            status: 'pending', // Will be updated when transfer is processed
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
 * Process automatic transfers to vendors and affiliates
 * This function calculates commissions and creates transfers via Razorpay Route
 */
async function processAutomaticTransfers(order, razorpayPaymentId) {
  try {
    logger.info(`Processing automatic transfers for order ${order._id}`);

    const transfers = [];
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

    // Process each vendor's transfer
    const vendorIds = Object.keys(vendorSubtotals);
    for (const vendorIdStr of vendorIds) {
      const vendor = await Vendor.findById(vendorIdStr);

      if (vendor && vendor.razorpay?.accountId && vendor.razorpay?.accountStatus === 'activated') {
        // Calculate vendor commission based on their items' subtotal
        const vendorCommissionPercentage = vendor.razorpay.settlementPercentage || 85;
        const vendorItemsSubtotal = vendorSubtotals[vendorIdStr];
        const vendorAmount = (vendorItemsSubtotal * vendorCommissionPercentage) / 100;

        transfers.push({
          accountId: vendor.razorpay.accountId,
          amount: vendorAmount,
          currency: 'INR',
          notes: {
            orderId: order._id.toString(),
            orderNumber: order.orderId,
            vendorId: vendor._id.toString(),
            storeName: vendor.storeName,
            type: 'vendor_commission',
          },
        });

        // Create commission record
        commissionRecords.push({
          type: 'vendor',
          subjectId: vendor._id,
          subjectModel: 'Vendor',
          orderId: order._id,
          amount: vendorAmount,
          percentage: vendorCommissionPercentage,
          status: 'pending', // Will be updated when transfer is processed
        });

        logger.info(`Added vendor transfer: ${vendor.storeName} - ₹${vendorAmount} (from ₹${vendorItemsSubtotal} subtotal)`);
      } else {
        logger.warn(`Vendor ${vendorIdStr} doesn't have activated Razorpay account. Skipping automatic transfer.`);
      }
    }

    // Check if order has affiliate tracking
    if (order.affiliateCode) {
      const affiliate = await Affiliate.findOne({ code: order.affiliateCode });

      if (affiliate && affiliate.razorpay?.accountId && affiliate.razorpay?.accountStatus === 'activated') {
        // Calculate affiliate commission
        const affiliateCommissionPercentage = affiliate.commissionPercentage || 5;
        const affiliateAmount = (order.totals.subtotal * affiliateCommissionPercentage) / 100;

        transfers.push({
          accountId: affiliate.razorpay.accountId,
          amount: affiliateAmount,
          currency: 'INR',
          notes: {
            orderId: order._id.toString(),
            orderNumber: order.orderId,
            affiliateId: affiliate._id.toString(),
            affiliateCode: affiliate.code,
            type: 'affiliate_commission',
          },
        });

        // Create commission record
        commissionRecords.push({
          type: 'affiliate',
          subjectId: affiliate._id,
          subjectModel: 'Affiliate',
          orderId: order._id,
          amount: affiliateAmount,
          percentage: affiliateCommissionPercentage,
          status: 'pending',
        });

        logger.info(`Added affiliate transfer: ${affiliate.code} - ₹${affiliateAmount}`);
      }
    }

    // If there are transfers to process, create them via Razorpay
    if (transfers.length > 0) {
      logger.info(`Creating ${transfers.length} transfer(s) for payment ${razorpayPaymentId}`);

      try {
        const transferResult = await createTransfers(razorpayPaymentId, transfers);

        if (transferResult.success) {
          logger.info(`Successfully created ${transferResult.successfulTransfers.length} transfer(s)`);

          // Update commission records with transfer details
          for (let i = 0; i < transferResult.successfulTransfers.length; i++) {
            const transfer = transferResult.successfulTransfers[i];
            commissionRecords[i].transfer = {
              transferId: transfer.transferId,
              status: transfer.status,
              processedAt: new Date(),
              linkedAccountId: transfer.accountId,
            };
            commissionRecords[i].status = 'approved';
            commissionRecords[i].approvedAt = new Date();

            // If transfer is already processed, mark as paid
            if (transfer.status === 'processed') {
              commissionRecords[i].status = 'paid';
              commissionRecords[i].paidAt = new Date();
            }
          }

          // Save commission records with error handling
          try {
            await Commission.insertMany(commissionRecords);
            logger.info(`Commission records saved successfully`);
          } catch (commissionError) {
            logger.error(`Failed to save commission records: ${commissionError.message}`, commissionError);
            // Continue processing even if commission save fails
          }

          // Update vendor/affiliate earnings with error handling
          for (const transfer of transferResult.successfulTransfers) {
            try {
              const commissionType = transfer.notes.type;
              if (commissionType === 'vendor_commission') {
                await Vendor.findByIdAndUpdate(transfer.notes.vendorId, {
                  $inc: { pendingEarnings: transfer.amount },
                  'razorpay.lastSettlementAt': new Date(),
                });
                logger.info(`Updated earnings for vendor ${transfer.notes.vendorId}`);
              } else if (commissionType === 'affiliate_commission') {
                await Affiliate.findByIdAndUpdate(transfer.notes.affiliateId, {
                  $inc: { pendingEarnings: transfer.amount },
                  'razorpay.lastSettlementAt': new Date(),
                });
                logger.info(`Updated earnings for affiliate ${transfer.notes.affiliateId}`);
              }
            } catch (earningsError) {
              logger.error(`Failed to update earnings for ${commissionType}: ${earningsError.message}`, earningsError);
              // Continue processing other transfers
            }
          }

          logger.info(`Commission records created and earnings updated`);
        } else {
          logger.error(`Transfer creation failed: ${transferResult.error}`);
          // Save commission records as pending even if transfer failed
          try {
            await Commission.insertMany(commissionRecords);
            logger.info(`Commission records saved as pending after transfer failure`);
          } catch (commissionError) {
            logger.error(`Failed to save commission records after transfer failure: ${commissionError.message}`, commissionError);
          }
        }

        // Log failed transfers with detailed information
        if (transferResult.failedTransfers && transferResult.failedTransfers.length > 0) {
          logger.error(`Failed transfers (${transferResult.failedTransfers.length}):`);
          transferResult.failedTransfers.forEach((failedTransfer, index) => {
            logger.error(`  ${index + 1}. Account: ${failedTransfer.accountId}, Amount: ₹${failedTransfer.amount}, Error: ${failedTransfer.error || 'Unknown'}`);
          });
        }

        return transferResult;

      } catch (transferError) {
        logger.error(`Critical error during transfer processing: ${transferError.message}`, transferError);

        // Save commission records as pending on critical error
        try {
          await Commission.insertMany(commissionRecords);
          logger.info(`Commission records saved as pending after critical transfer error`);
        } catch (commissionError) {
          logger.error(`Failed to save commission records after critical error: ${commissionError.message}`, commissionError);
        }

        return {
          success: false,
          error: `Transfer processing failed: ${transferError.message}`,
          commissionRecordsSaved: true
        };
      }
    } else {
      logger.info(`No transfers to process for order ${order._id}`);
      return { success: true, message: 'No transfers needed' };
    }
  } catch (error) {
    logger.error(`Error processing automatic transfers: ${error.message}`, error);
    return { success: false, error: error.message };
  }
}
