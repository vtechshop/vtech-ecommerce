// FILE: apps/api/src/controllers/checkoutController.js
const ShippingZone = require('../models/ShippingZone');
const Tax = require('../models/Tax');
const AppError = require('../utils/AppError');
const Product = require('../models/Product');
const shippingService = require('../services/shippingService');
const env = require('../config/env');
const logger = require('../config/logger');

// MSS Transport rates for Tamil Nadu (weight in kg → ₹)
function getMSSRate(weightKg) {
  if (weightKg <= 0.5)       return 50;
  if (weightKg <= 1)         return 80;
  if (weightKg <= 2)         return 120;
  if (weightKg <= 5)         return 180;
  if (weightKg <= 10)        return 300;
  if (weightKg <= 20)        return 500;
  return 500 + Math.ceil((weightKg - 20) / 5) * 80;
}

// Weight-based fallback rates for other states (when Delhivery API fails)
function getWeightFallbackRate(weightKg) {
  if (weightKg <= 0.5)       return 60;
  if (weightKg <= 1)         return 100;
  if (weightKg <= 2)         return 150;
  if (weightKg <= 5)         return 250;
  if (weightKg <= 10)        return 450;
  if (weightKg <= 20)        return 800;
  return 800 + Math.ceil((weightKg - 20) / 5) * 100;
}

const TN_NAMES = ['tamil nadu', 'tamilnadu', 'tn'];
function isTamilNadu(state = '') {
  return TN_NAMES.includes(state.trim().toLowerCase());
}

// Get shipping quotes — TN uses MSS Transport, other states use Delhivery API
exports.getShippingQuotes = async (req, res, next) => {
  try {
    const { address, items } = req.body;

    if (!address || typeof address !== 'object') {
      return next(new AppError('Address is required', 400, 'MISSING_ADDRESS'));
    }

    const destinationPin = address.zipCode;
    if (!destinationPin) {
      return next(new AppError('Destination pincode is required', 400, 'MISSING_PINCODE'));
    }

    // Fetch products for weight + fixed shipping charge
    let totalWeightKg = 0.5; // default 500g fallback
    let fixedChargeOverride = 0;

    if (items && items.length > 0) {
      const productIds = items.map(i => i.productId).filter(Boolean);
      if (productIds.length > 0) {
        const products = await Product.find({ _id: { $in: productIds } }).select('weight shippingCharge');
        totalWeightKg = items.reduce((sum, item) => {
          const product = products.find(p => p._id.toString() === item.productId?.toString());
          const weightKg = product?.weight || 0.5; // default 0.5kg if not set
          return sum + (weightKg * (item.qty || item.quantity || 1));
        }, 0);

        // If any product has a fixed shipping charge, use the highest one
        const maxFixed = items.reduce((max, item) => {
          const product = products.find(p => p._id.toString() === item.productId?.toString());
          return Math.max(max, product?.shippingCharge || 0);
        }, 0);
        fixedChargeOverride = maxFixed;
      }
    }

    const quotes = [];

    // If product has a fixed shipping charge, use it directly
    if (fixedChargeOverride > 0) {
      quotes.push({
        id: 'fixed',
        name: 'Standard Delivery',
        description: '3-7 business days',
        cost: fixedChargeOverride,
        estimatedDays: 7,
        carrier: 'Standard',
      });
      return res.json({ success: true, data: { quotes, totalWeightKg } });
    }

    // Tamil Nadu → MSS Transport (local transport, cheaper & faster)
    if (isTamilNadu(address.state)) {
      const cost = getMSSRate(totalWeightKg);
      quotes.push({
        id: 'mss-standard',
        name: 'MSS Transport',
        description: '2-4 business days (Tamil Nadu)',
        cost,
        estimatedDays: 4,
        carrier: 'MSS Transport',
      });
      logger.info(`MSS Transport rate ₹${cost} for ${totalWeightKg.toFixed(2)}kg → TN`);
      return res.json({ success: true, data: { quotes, totalWeightKg } });
    }

    // Other states → Delhivery API
    const originPin = env.DEFAULT_ORIGIN_ZIP || '627001';
    try {
      const delhivery = shippingService.getCarrier('delhivery');
      const totalWeightGrams = Math.round(totalWeightKg * 1000);

      try {
        const surface = await delhivery.calculateRate(originPin, destinationPin, totalWeightGrams, 'Prepaid', 'S');
        if (surface.rate > 0) {
          quotes.push({
            id: 'delhivery-surface',
            name: 'Delhivery Surface',
            description: '5-7 business days',
            cost: Math.round(surface.rate),
            estimatedDays: 7,
            carrier: 'Delhivery',
          });
        }
      } catch (e) {
        logger.warn('Delhivery Surface unavailable:', e.message);
      }

      try {
        const express = await delhivery.calculateRate(originPin, destinationPin, totalWeightGrams, 'Prepaid', 'E');
        if (express.rate > 0) {
          quotes.push({
            id: 'delhivery-express',
            name: 'Delhivery Express',
            description: '2-3 business days',
            cost: Math.round(express.rate),
            estimatedDays: 3,
            carrier: 'Delhivery',
          });
        }
      } catch (e) {
        logger.warn('Delhivery Express unavailable:', e.message);
      }
    } catch (carrierErr) {
      logger.warn('Delhivery carrier not available:', carrierErr.message);
    }

    // Fallback if Delhivery fails
    if (quotes.length === 0) {
      const cost = getWeightFallbackRate(totalWeightKg);
      quotes.push({
        id: 'standard',
        name: 'Standard Shipping',
        description: '5-7 business days',
        cost,
        estimatedDays: 7,
      });
      logger.warn(`Delhivery unavailable — fallback rate ₹${cost} for ${totalWeightKg.toFixed(2)}kg`);
    }

    res.json({ success: true, data: { quotes, totalWeightKg } });
  } catch (error) {
    next(error);
  }
};

// Calculate taxes
exports.calculateTaxes = async (req, res, next) => {
  try {
    const { subtotal, address } = req.body;

    // SECURITY: Validate subtotal is provided and is a positive number
    if (!subtotal || typeof subtotal !== 'number' || subtotal < 0) {
      return next(new AppError('Valid subtotal amount is required', 400, 'INVALID_SUBTOTAL'));
    }

    // SECURITY: Prevent unreasonably large subtotal values (max 100 million)
    if (subtotal > 100000000) {
      return next(new AppError('Subtotal amount is too large', 400, 'SUBTOTAL_TOO_LARGE'));
    }

    // SECURITY: Validate address if provided
    if (address && typeof address !== 'object') {
      return next(new AppError('Address must be an object', 400, 'INVALID_ADDRESS'));
    }

    // Calculate tax based on environment configuration
    // Use DEFAULT_TAX_RATE from .env (set to 0 to disable tax)
    const taxRate = parseFloat(process.env.DEFAULT_TAX_RATE || 0);
    const taxAmount = subtotal * taxRate;

    res.json({
      success: true,
      data: {
        taxRate,
        taxAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create payment intent (Stripe)
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { amount, currency = 'INR' } = req.body;

    // If Stripe is configured, use real payment intent
    if (process.env.STRIPE_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_KEY);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents/paise
        currency: currency.toLowerCase(),
        metadata: {
          userId: req.user?._id?.toString() || 'guest',
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        },
      });
    } else {
      // Mock response for testing without Stripe
      const paymentIntent = {
        id: 'pi_mock_' + Date.now(),
        client_secret: 'secret_mock_' + Date.now(),
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
      };

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};