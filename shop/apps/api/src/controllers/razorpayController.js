// FILE: apps/api/src/controllers/razorpayController.js
const { createOrder: createRazorpayOrder, verifyPaymentSignature, fetchPayment } = require('../utils/razorpay');
const Order = require('../models/Order');
const crypto = require('crypto');

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

    if (order.userId.toString() !== req.user._id.toString()) {
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

    // Verify order belongs to user
    if (order.userId.toString() !== req.user._id.toString()) {
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
    if (payment.status === 'captured' && order.status === 'pending') {
      order.status = 'confirmed';
    }

    await order.save();

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

    // Verify order belongs to user
    if (order.userId.toString() !== req.user._id.toString()) {
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

    if (order.status === 'pending') {
      order.status = 'confirmed';
    }

    await order.save();
    console.log(`Payment captured for order ${orderId}`);
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
