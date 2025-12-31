const crypto = require('crypto');
const axios = require('axios');
const logger = require('../config/logger');
const Order = require('../models/Order');
const WebhookEvent = require('../models/WebhookEvent');

// PhonePe Configuration
const getPhonePeConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    saltKey: process.env.PHONEPE_SALT_KEY,
    saltIndex: process.env.PHONEPE_SALT_INDEX || '1',
    baseUrl: isProduction
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox',
  };
};

// Generate PhonePe checksum
const generateChecksum = (payload, endpoint, saltKey, saltIndex) => {
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const string = base64Payload + endpoint + saltKey;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return `${sha256}###${saltIndex}`;
};

// Verify PhonePe callback checksum
const verifyChecksum = (base64Response, xVerify, saltKey, saltIndex) => {
  const string = base64Response + saltKey;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  const expectedChecksum = `${sha256}###${saltIndex}`;
  return xVerify === expectedChecksum;
};

// Create PhonePe payment
exports.createPayment = async (req, res, next) => {
  try {
    const { amount, orderId, customerPhone, customerEmail } = req.body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Amount must be a positive number' }
      });
    }

    // Validate max amount (10 lakh rupees)
    if (amount > 1000000) {
      return res.status(400).json({
        success: false,
        error: { code: 'AMOUNT_TOO_LARGE', message: 'Amount exceeds maximum allowed (₹10,00,000)' }
      });
    }

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ORDER', message: 'Order ID is required' }
      });
    }

    const config = getPhonePeConfig();

    if (!config.merchantId || !config.saltKey) {
      logger.error('PhonePe credentials not configured');
      return res.status(500).json({
        success: false,
        error: { code: 'CONFIG_ERROR', message: 'Payment gateway not configured' }
      });
    }

    const transactionId = `TXN_${orderId}_${Date.now()}`;
    const callbackUrl = `${process.env.APP_URL}/api/payments/phonepe/callback`;
    const redirectUrl = `${process.env.CLIENT_URL}/order-status/${orderId}`;

    const payload = {
      merchantId: config.merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: req.user?._id?.toString() || 'guest',
      amount: Math.round(amount * 100), // Convert to paise
      redirectUrl: redirectUrl,
      redirectMode: 'REDIRECT',
      callbackUrl: callbackUrl,
      mobileNumber: customerPhone || '',
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const endpoint = '/pg/v1/pay';
    const checksum = generateChecksum(payload, endpoint, config.saltKey, config.saltIndex);

    const response = await axios.post(
      `${config.baseUrl}${endpoint}`,
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
        timeout: 30000,
      }
    );

    if (response.data.success) {
      // Update order with transaction ID
      await Order.findOneAndUpdate(
        { orderId: orderId },
        {
          'payment.transactionId': transactionId,
          'payment.provider': 'phonepe',
          'payment.status': 'pending',
        }
      );

      res.json({
        success: true,
        data: {
          transactionId,
          redirectUrl: response.data.data.instrumentResponse.redirectInfo.url,
        }
      });
    } else {
      logger.error('PhonePe payment initiation failed:', response.data);
      res.status(400).json({
        success: false,
        error: { code: 'PAYMENT_FAILED', message: response.data.message || 'Payment initiation failed' }
      });
    }
  } catch (error) {
    logger.error('PhonePe createPayment error:', error.message);
    next(error);
  }
};

// PhonePe callback/webhook handler
exports.phonePeCallback = async (req, res, next) => {
  try {
    const config = getPhonePeConfig();
    const xVerify = req.headers['x-verify'];
    const base64Response = req.body.response;

    // Verify checksum
    if (!verifyChecksum(base64Response, xVerify, config.saltKey, config.saltIndex)) {
      logger.error('PhonePe callback signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Decode response
    const decodedResponse = JSON.parse(Buffer.from(base64Response, 'base64').toString('utf-8'));
    const { merchantTransactionId, transactionId, amount, code, state } = decodedResponse.data || {};

    logger.info(`PhonePe callback received: ${merchantTransactionId}, state: ${state}, code: ${code}`);

    // Check for duplicate event
    const existingEvent = await WebhookEvent.findOne({ eventId: transactionId, provider: 'phonepe' });
    if (existingEvent) {
      logger.warn(`Duplicate PhonePe callback rejected: ${transactionId}`);
      return res.json({ status: 'ok', note: 'duplicate_event_ignored' });
    }

    // Record webhook event
    await WebhookEvent.create({
      eventId: transactionId,
      provider: 'phonepe',
      eventType: code,
      processedAt: new Date(),
      metadata: {
        merchantTransactionId,
        amount,
        state,
        code,
      },
    });

    // Find order by transaction ID
    const order = await Order.findOne({ 'payment.transactionId': merchantTransactionId });

    if (!order) {
      logger.error(`Order not found for transaction: ${merchantTransactionId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Handle payment status
    if (code === 'PAYMENT_SUCCESS' && state === 'COMPLETED') {
      // SECURITY: Validate amount (amount in paise from PhonePe)
      const expectedAmount = Math.round(order.totals.total * 100);
      const receivedAmount = parseInt(amount, 10); // Ensure integer comparison

      // Allow 1 paise tolerance for rounding errors (₹0.01 tolerance)
      if (Math.abs(receivedAmount - expectedAmount) > 1) {
        logger.error(`Payment amount mismatch for order ${order.orderId}: expected ${expectedAmount} paise, got ${receivedAmount} paise`);
        return res.status(400).json({ error: 'Payment amount mismatch' });
      }

      order.status = 'paid';
      order.payment.status = 'completed';
      order.payment.paidAt = new Date();
      order.payment.phonePeTransactionId = transactionId;
      order.events.push({
        status: 'paid',
        description: 'Payment confirmed via PhonePe',
        timestamp: new Date()
      });
      await order.save();
      logger.info(`Order ${order.orderId} marked as paid via PhonePe`);
    } else if (code === 'PAYMENT_ERROR' || code === 'PAYMENT_DECLINED') {
      order.payment.status = 'failed';
      order.events.push({
        status: 'payment_failed',
        description: `Payment failed: ${code}`,
        timestamp: new Date()
      });
      await order.save();
      logger.warn(`Order ${order.orderId} payment failed via PhonePe: ${code}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    logger.error('PhonePe callback error:', error.message);
    next(error);
  }
};

// Check payment status
exports.checkPaymentStatus = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSACTION', message: 'Transaction ID is required' }
      });
    }

    const config = getPhonePeConfig();
    const endpoint = `/pg/v1/status/${config.merchantId}/${transactionId}`;
    const string = endpoint + config.saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = `${sha256}###${config.saltIndex}`;

    const response = await axios.get(
      `${config.baseUrl}${endpoint}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'X-MERCHANT-ID': config.merchantId,
        },
        timeout: 30000,
      }
    );

    res.json({
      success: true,
      data: {
        status: response.data.code,
        state: response.data.data?.state,
        transactionId: response.data.data?.transactionId,
        amount: response.data.data?.amount,
      }
    });
  } catch (error) {
    logger.error('PhonePe status check error:', error.message);
    next(error);
  }
};

// Refund payment
exports.refundPayment = async (req, res, next) => {
  try {
    const { originalTransactionId, amount, reason } = req.body;

    if (!originalTransactionId || !amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Transaction ID and amount are required' }
      });
    }

    const config = getPhonePeConfig();
    const refundTransactionId = `REFUND_${originalTransactionId}_${Date.now()}`;

    const payload = {
      merchantId: config.merchantId,
      merchantUserId: req.user?._id?.toString() || 'admin',
      originalTransactionId: originalTransactionId,
      merchantTransactionId: refundTransactionId,
      amount: Math.round(amount * 100), // Convert to paise
      callbackUrl: `${process.env.APP_URL}/api/payments/phonepe/refund-callback`,
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const endpoint = '/pg/v1/refund';
    const checksum = generateChecksum(payload, endpoint, config.saltKey, config.saltIndex);

    const response = await axios.post(
      `${config.baseUrl}${endpoint}`,
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
        timeout: 30000,
      }
    );

    if (response.data.success) {
      logger.info(`Refund initiated: ${refundTransactionId} for ${originalTransactionId}`);
      res.json({
        success: true,
        data: {
          refundTransactionId,
          status: response.data.code,
        }
      });
    } else {
      logger.error('PhonePe refund failed:', response.data);
      res.status(400).json({
        success: false,
        error: { code: 'REFUND_FAILED', message: response.data.message || 'Refund failed' }
      });
    }
  } catch (error) {
    logger.error('PhonePe refund error:', error.message);
    next(error);
  }
};
