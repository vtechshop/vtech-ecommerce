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

    // Verify order ownership (skip for guest orders)
    if (!order.isGuest && order.userId && order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only pay for your own orders',
        },
      });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_PAID',
          message: 'Order is already paid',
        },
      });
    }

    // Create Razorpay order
    const result = await createRazorpayOrder(amount, 'INR', {
      receipt: `order_${orderId}`,
      notes: {
        orderId: orderId.toString(),
        userId: req.user._id.toString(),
        userEmail: req.user.email,
        userName: req.user.name,
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
    console.error('Create Razorpay order error:', error);
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

    // Verify order belongs to user (skip for guest orders)
    if (!order.isGuest && order.userId && order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Unauthorized access to order',
        },
      });
    }

    // Update order with payment details
    order.paymentStatus = payment.status === 'captured' ? 'paid' : 'pending';
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

      // CRITICAL: Send order confirmation email AFTER payment is verified
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
          logger.info(`Order confirmation email sent after payment verification: ${userInfo.email}`);
        }
      } catch (emailError) {
        logger.error('Failed to send order confirmation email after payment:', emailError);
        // Don't fail the payment verification if email fails
      }
    }

    res.json({
      success: true,
      data: {
        orderId: order._id,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
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

    // Verify order belongs to user (skip for guest orders)
    if (!order.isGuest && order.userId && order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Unauthorized access to order',
        },
      });
    }

    // Update order with failure details
    order.paymentStatus = 'failed';
    order.payment = order.payment || {};
    order.payment.error = error;
    order.payment.failedAt = new Date();

    await order.save();

    res.json({
      success: true,
      message: 'Payment failure recorded',
    });
  } catch (error) {
    console.error('Payment failure handler error:', error);
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
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
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

    order.paymentStatus = 'paid';
    order.payment = order.payment || {};
    order.payment.status = 'captured';
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
    console.log(`Payment captured for order ${orderId}`);

    // Send order confirmation email after webhook payment confirmation
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
        logger.info(`Order confirmation email sent via webhook: ${userInfo.email}`);
      }
    } catch (emailError) {
      logger.error('Failed to send email via webhook:', emailError);
    }
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
}

// Helper function to handle payment failed
async function handlePaymentFailed(payload) {
  try {
    const orderId = payload.notes?.orderId;
    if (!orderId) return;

    const order = await Order.findById(orderId);
    if (!order) return;

    order.paymentStatus = 'failed';
    order.payment = order.payment || {};
    order.payment.status = 'failed';
    order.payment.error = payload.error_description;

    await order.save();
    console.log(`Payment failed for order ${orderId}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
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
    console.log(`Refund created for order ${order._id}`);
  } catch (error) {
    console.error('Error handling refund created:', error);
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
 * Process automatic transfers to vendors and affiliates
 * This function calculates commissions and creates transfers via Razorpay Route
 */
async function processAutomaticTransfers(order, razorpayPaymentId) {
  try {
    logger.info(`Processing automatic transfers for order ${order._id}`);

    const transfers = [];
    const commissionRecords = [];

    // Get vendor information if this is a vendor order
    if (order.vendorId) {
      const vendor = await Vendor.findById(order.vendorId);

      if (vendor && vendor.razorpay?.accountId && vendor.razorpay?.accountStatus === 'activated') {
        // Calculate vendor commission
        const vendorCommissionPercentage = vendor.razorpay.settlementPercentage || 85;
        const vendorAmount = (order.totals.subtotal * vendorCommissionPercentage) / 100;

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

        logger.info(`Added vendor transfer: ${vendor.storeName} - ₹${vendorAmount}`);
      } else {
        logger.warn(`Vendor ${order.vendorId} doesn't have activated Razorpay account. Skipping automatic transfer.`);
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

        // Save commission records
        await Commission.insertMany(commissionRecords);

        // Update vendor/affiliate earnings
        for (const transfer of transferResult.successfulTransfers) {
          const commissionType = transfer.notes.type;
          if (commissionType === 'vendor_commission') {
            await Vendor.findByIdAndUpdate(transfer.notes.vendorId, {
              $inc: { pendingEarnings: transfer.amount },
              'razorpay.lastSettlementAt': new Date(),
            });
          } else if (commissionType === 'affiliate_commission') {
            await Affiliate.findByIdAndUpdate(transfer.notes.affiliateId, {
              $inc: { pendingEarnings: transfer.amount },
              'razorpay.lastSettlementAt': new Date(),
            });
          }
        }

        logger.info(`Commission records created and earnings updated`);
      } else {
        logger.error(`Transfer creation failed: ${transferResult.error}`);
        // Save commission records as pending even if transfer failed
        await Commission.insertMany(commissionRecords);
      }

      // Log failed transfers
      if (transferResult.failedTransfers && transferResult.failedTransfers.length > 0) {
        logger.error(`Failed transfers: ${JSON.stringify(transferResult.failedTransfers)}`);
      }

      return transferResult;
    } else {
      logger.info(`No transfers to process for order ${order._id}`);
      return { success: true, message: 'No transfers needed' };
    }
  } catch (error) {
    logger.error(`Error processing automatic transfers: ${error.message}`, error);
    return { success: false, error: error.message };
  }
}
