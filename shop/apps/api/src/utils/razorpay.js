// FILE: apps/api/src/utils/razorpay.js
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance only if credentials are configured
let razorpay = null;
const isConfigured = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;

if (isConfigured) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('[INFO] Razorpay payment service initialized');
} else {
  console.log('[WARN] Razorpay not configured - payment features will be disabled');
}

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in INR (will be converted to paise)
 * @param {string} currency - Currency code (default: INR)
 * @param {object} options - Additional options
 * @returns {Promise<object>} Razorpay order object
 */
const createOrder = async (amount, currency = 'INR', options = {}) => {
  if (!isConfigured) {
    return {
      success: false,
      error: 'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
    };
  }

  try {
    // Convert amount to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    const orderOptions = {
      amount: amountInPaise,
      currency,
      receipt: options.receipt || `receipt_${Date.now()}`,
      notes: options.notes || {},
      ...options,
    };

    const order = await razorpay.orders.create(orderOptions);
    return {
      success: true,
      order,
    };
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Verify Razorpay payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean} Whether signature is valid
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  if (!isConfigured) {
    console.error('Razorpay is not configured - cannot verify signature');
    return false;
  }

  try {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generatedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<object>} Payment details
 */
const fetchPayment = async (paymentId) => {
  if (!isConfigured) {
    return {
      success: false,
      error: 'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
    };
  }

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      success: true,
      payment,
    };
  } catch (error) {
    console.error('Fetch payment error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Fetch order details from Razorpay
 * @param {string} orderId - Razorpay order ID
 * @returns {Promise<object>} Order details
 */
const fetchOrder = async (orderId) => {
  if (!isConfigured) {
    return {
      success: false,
      error: 'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
    };
  }

  try {
    const order = await razorpay.orders.fetch(orderId);
    return {
      success: true,
      order,
    };
  } catch (error) {
    console.error('Fetch order error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Create a refund
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Amount to refund in INR (optional, full refund if not specified)
 * @returns {Promise<object>} Refund details
 */
const createRefund = async (paymentId, amount = null) => {
  if (!isConfigured) {
    return {
      success: false,
      error: 'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
    };
  }

  try {
    const refundOptions = {
      payment_id: paymentId,
    };

    if (amount) {
      refundOptions.amount = Math.round(amount * 100); // Convert to paise
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    return {
      success: true,
      refund,
    };
  } catch (error) {
    console.error('Refund creation error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  razorpay,
  isConfigured,
  createOrder,
  verifyPaymentSignature,
  fetchPayment,
  fetchOrder,
  createRefund,
};
