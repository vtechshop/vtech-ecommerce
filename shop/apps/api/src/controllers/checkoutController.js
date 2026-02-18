// FILE: apps/api/src/controllers/checkoutController.js
const ShippingZone = require('../models/ShippingZone');
const Tax = require('../models/Tax');
const AppError = require('../utils/AppError');

// Get shipping quotes
exports.getShippingQuotes = async (req, res, next) => {
  try {
    const { addressId, address, items } = req.body;

    // SECURITY: Validate that either addressId or address is provided
    if (!addressId && !address) {
      return next(new AppError('Either addressId or address must be provided', 400, 'MISSING_ADDRESS'));
    }

    // SECURITY: Validate address structure if provided
    if (address && typeof address !== 'object') {
      return next(new AppError('Address must be an object', 400, 'INVALID_ADDRESS'));
    }

    // In a real app, you'd get the address and calculate shipping
    // For now, return mock quotes (prices in INR)
    const quotes = [
      {
        id: 'free-shipping',
        name: 'Free Standard Shipping',
        description: '7-10 business days',
        cost: 0,
        estimatedDays: 10,
      },
      {
        id: 'standard',
        name: 'Standard Shipping',
        description: '5-7 business days',
        cost: 499,
        estimatedDays: 7,
      },
      {
        id: 'priority',
        name: 'Priority Shipping',
        description: '3-5 business days',
        cost: 799,
        estimatedDays: 5,
      },
      {
        id: 'express',
        name: 'Express Shipping',
        description: '2-3 business days',
        cost: 1199,
        estimatedDays: 3,
      },
      {
        id: 'two-day',
        name: 'Two-Day Shipping',
        description: 'Guaranteed 2 business days',
        cost: 1599,
        estimatedDays: 2,
      },
      {
        id: 'overnight',
        name: 'Overnight Shipping',
        description: 'Next business day delivery',
        cost: 2399,
        estimatedDays: 1,
      },
      {
        id: 'same-day',
        name: 'Same Day Delivery',
        description: 'Order before 2 PM for same-day delivery',
        cost: 3199,
        estimatedDays: 0,
      },
    ];

    res.json({
      success: true,
      data: quotes,
    });
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