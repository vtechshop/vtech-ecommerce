// FILE: apps/api/src/controllers/checkoutController.js
const ShippingZone = require('../models/ShippingZone');
const Tax = require('../models/Tax');

// Get shipping quotes
exports.getShippingQuotes = async (req, res, next) => {
  try {
    const { addressId, address, items } = req.body;

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

    // In a real app, calculate based on address and tax rules
    // For now, return 18% GST (standard rate in India)
    const taxRate = 0.18;
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