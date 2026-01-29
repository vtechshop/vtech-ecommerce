// FILE: apps/api/src/utils/razorpay.js
const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../config/logger');

// Initialize Razorpay instance only if credentials are configured
let razorpay = null;
const isConfigured = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;

if (isConfigured) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  logger.info('Razorpay payment service initialized');
} else {
  logger.warn('Razorpay not configured - payment features will be disabled');
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
    logger.error('Razorpay order creation error:', error);
    return {
      success: false,
      error: 'Payment order creation failed',
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
    logger.error('Razorpay is not configured - cannot verify signature');
    return false;
  }

  try {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    if (generatedSignature.length !== signature.length) {
      return false;
    }
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    logger.error('Signature verification error:', error);
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
    logger.error('Fetch payment error:', error);
    return {
      success: false,
      error: 'Failed to fetch payment details',
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
    logger.error('Fetch order error:', error);
    return {
      success: false,
      error: 'Failed to fetch order details',
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
    logger.error('Refund creation error:', error);
    return {
      success: false,
      error: 'Failed to process refund',
    };
  }
};

/**
 * Create a Razorpay Linked Account (for Route/Marketplace)
 * This allows automatic payment splits to vendors/affiliates
 * @param {object} accountData - Account details
 * @returns {Promise<object>} Linked account details
 */
const createLinkedAccount = async (accountData) => {
  if (!isConfigured) {
    return {
      success: false,
      error: 'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
    };
  }

  try {
    const {
      email,
      phone,
      businessName,
      businessType = 'individual', // or 'proprietorship', 'partnership', 'private_limited', etc.
      legalInfo = {},
    } = accountData;

    const accountOptions = {
      email,
      phone,
      type: 'route', // Route type for marketplace
      reference_id: accountData.reference_id || `ref_${Date.now()}`,
      legal_business_name: businessName,
      business_type: businessType,
      contact_name: accountData.contactName,
      profile: {
        category: accountData.category || 'ecommerce',
        subcategory: accountData.subcategory || 'retail',
        addresses: accountData.addresses || {},
      },
      legal_info: legalInfo,
    };

    const account = await razorpay.accounts.create(accountOptions);
    return {
      success: true,
      account,
    };
  } catch (error) {
    logger.error('Razorpay linked account creation error:', error);
    return {
      success: false,
      error: 'Failed to create linked account',
    };
  }
};

/**
 * Fetch Razorpay Linked Account details
 * @param {string} accountId - Razorpay account ID
 * @returns {Promise<object>} Account details
 */
const fetchLinkedAccount = async (accountId) => {
  if (!isConfigured) {
    return {
      success: false,
      error: 'Razorpay is not configured',
    };
  }

  try {
    const account = await razorpay.accounts.fetch(accountId);
    return {
      success: true,
      account,
    };
  } catch (error) {
    logger.error('Fetch linked account error:', error);
    return {
      success: false,
      error: 'Failed to fetch linked account',
    };
  }
};

/**
 * Create transfers (payment splits) to linked accounts
 * This is used for automatic vendor/affiliate payouts
 * @param {string} paymentId - Razorpay payment ID
 * @param {array} transfers - Array of transfer objects
 * @returns {Promise<object>} Transfer results
 */
const createTransfers = async (paymentId, transfers) => {
  if (!isConfigured) {
    return {
      success: false,
      error: 'Razorpay is not configured',
    };
  }

  try {
    const transferPromises = transfers.map(transfer => {
      const amountInPaise = Math.round(transfer.amount * 100);

      return razorpay.payments.transfer(paymentId, {
        account: transfer.accountId,
        amount: amountInPaise,
        currency: transfer.currency || 'INR',
        notes: transfer.notes || {},
        linked_account_notes: transfer.linked_account_notes || [],
        on_hold: transfer.on_hold || false, // Set to true to hold settlement
        on_hold_until: transfer.on_hold_until || null, // Unix timestamp for hold release
      });
    });

    const results = await Promise.allSettled(transferPromises);

    const successfulTransfers = [];
    const failedTransfers = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulTransfers.push({
          ...transfers[index],
          transferId: result.value.id,
          status: result.value.status,
        });
      } else {
        failedTransfers.push({
          ...transfers[index],
          error: result.reason.message,
        });
      }
    });

    return {
      success: failedTransfers.length === 0,
      successfulTransfers,
      failedTransfers,
      totalTransfers: transfers.length,
    };
  } catch (error) {
    logger.error('Create transfers error:', error);
    return {
      success: false,
      error: 'Failed to create transfers',
    };
  }
};

/**
 * Fetch transfer details
 * @param {string} transferId - Razorpay transfer ID
 * @returns {Promise<object>} Transfer details
 */
const fetchTransfer = async (transferId) => {
  if (!isConfigured) {
    return {
      success: false,
      error: 'Razorpay is not configured',
    };
  }

  try {
    const transfer = await razorpay.transfers.fetch(transferId);
    return {
      success: true,
      transfer,
    };
  } catch (error) {
    logger.error('Fetch transfer error:', error);
    return {
      success: false,
      error: 'Failed to fetch transfer details',
    };
  }
};

/**
 * Reverse a transfer (refund to platform account)
 * @param {string} transferId - Razorpay transfer ID
 * @param {number} amount - Amount to reverse (optional, full reversal if not specified)
 * @returns {Promise<object>} Reversal details
 */
const reverseTransfer = async (transferId, amount = null) => {
  if (!isConfigured) {
    return {
      success: false,
      error: 'Razorpay is not configured',
    };
  }

  try {
    const reversalOptions = {};
    if (amount) {
      reversalOptions.amount = Math.round(amount * 100);
    }

    const reversal = await razorpay.transfers.reverse(transferId, reversalOptions);
    return {
      success: true,
      reversal,
    };
  } catch (error) {
    logger.error('Reverse transfer error:', error);
    return {
      success: false,
      error: 'Failed to reverse transfer',
    };
  }
};

/**
 * Create a Razorpay Payout (RazorpayX) to a bank account
 * Used for admin-initiated payouts to vendors/affiliates
 * Requires RazorpayX to be enabled on the account
 * @param {object} payoutData - Payout details
 * @returns {Promise<object>} Payout result
 */
const createPayout = async (payoutData) => {
  if (!isConfigured) {
    return {
      success: false,
      error: 'Razorpay is not configured',
    };
  }

  try {
    const {
      accountNumber, // Razorpay account number (RazorpayX)
      amount,
      currency = 'INR',
      mode = 'NEFT', // NEFT, RTGS, IMPS, UPI
      purpose = 'payout',
      beneficiaryName,
      beneficiaryAccountNumber,
      beneficiaryIfsc,
      referenceId,
      narration,
    } = payoutData;

    // RazorpayX Fund Account + Payout via API
    const axios = require('axios');
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    };

    // Step 1: Create a contact
    const contactRes = await axios.post('https://api.razorpay.com/v1/contacts', {
      name: beneficiaryName,
      type: 'vendor',
      reference_id: referenceId,
    }, { headers });

    const contactId = contactRes.data.id;

    // Step 2: Create a fund account
    const fundAccountRes = await axios.post('https://api.razorpay.com/v1/fund_accounts', {
      contact_id: contactId,
      account_type: 'bank_account',
      bank_account: {
        name: beneficiaryName,
        ifsc: beneficiaryIfsc,
        account_number: beneficiaryAccountNumber,
      },
    }, { headers });

    const fundAccountId = fundAccountRes.data.id;

    // Step 3: Create payout
    const payoutRes = await axios.post('https://api.razorpay.com/v1/payouts', {
      account_number: accountNumber || process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id: fundAccountId,
      amount: Math.round(amount * 100), // paise
      currency,
      mode,
      purpose,
      narration: narration || `Commission payout - ${referenceId}`,
      reference_id: referenceId,
    }, { headers });

    return {
      success: true,
      payout: payoutRes.data,
      payoutId: payoutRes.data.id,
      status: payoutRes.data.status,
      contactId,
      fundAccountId,
    };
  } catch (error) {
    logger.error('Razorpay payout error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.description || error.message || 'Failed to create payout',
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
  // Razorpay Route (Linked Accounts & Transfers)
  createLinkedAccount,
  fetchLinkedAccount,
  createTransfers,
  fetchTransfer,
  reverseTransfer,
  // RazorpayX Payouts
  createPayout,
};
