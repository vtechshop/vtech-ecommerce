// FILE: apps/api/src/controllers/checkoutController.js
const ShippingZone = require('../models/ShippingZone');
const Tax = require('../models/Tax');
const AppError = require('../utils/AppError');
const Product = require('../models/Product');
const shippingService = require('../services/shippingService');
const env = require('../config/env');
const logger = require('../config/logger');

// Get shipping quotes — uses Delhivery API with pincode + weight
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

    // Calculate total weight in grams from cart items
    let totalWeight = 500; // default 500g fallback
    if (items && items.length > 0) {
      const productIds = items.map(i => i.productId).filter(Boolean);
      if (productIds.length > 0) {
        const products = await Product.find({ _id: { $in: productIds } }).select('weight');
        totalWeight = items.reduce((sum, item) => {
          const product = products.find(p => p._id.toString() === item.productId?.toString());
          return sum + ((product?.weight || 500) * (item.qty || item.quantity || 1));
        }, 0);
      }
    }

    const originPin = env.DEFAULT_ORIGIN_ZIP || '110001';
    const quotes = [];

    // Try Delhivery live rates
    try {
      const delhivery = shippingService.getCarrier('delhivery');

      // Surface rate (cheaper, 5-7 days)
      try {
        const surface = await delhivery.calculateRate(originPin, destinationPin, totalWeight, 'Prepaid', 'S');
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
        logger.warn('Delhivery Surface rate unavailable:', e.message);
      }

      // Express rate (faster, 2-3 days)
      try {
        const express = await delhivery.calculateRate(originPin, destinationPin, totalWeight, 'Prepaid', 'E');
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
        logger.warn('Delhivery Express rate unavailable:', e.message);
      }
    } catch (carrierErr) {
      logger.warn('Delhivery carrier not available:', carrierErr.message);
    }

    // Fallback: weight-based fixed rates if Delhivery API fails
    if (quotes.length === 0) {
      const weightKg = totalWeight / 1000;
      let cost;
      if (weightKg <= 0.5)       cost = 60;
      else if (weightKg <= 1)    cost = 100;
      else if (weightKg <= 2)    cost = 150;
      else if (weightKg <= 5)    cost = 250;
      else if (weightKg <= 10)   cost = 450;
      else if (weightKg <= 20)   cost = 800;
      else cost = 800 + Math.ceil((weightKg - 20) / 5) * 100;

      quotes.push({
        id: 'standard',
        name: 'Standard Shipping',
        description: '5-7 business days',
        cost,
        estimatedDays: 7,
      });

      logger.warn(`Delhivery unavailable — using weight-based fallback rate ₹${cost} for ${weightKg.toFixed(2)}kg`);
    }

    res.json({ success: true, data: { quotes, totalWeightGrams: totalWeight } });
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