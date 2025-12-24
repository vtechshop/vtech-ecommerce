// FILE: apps/api/src/controllers/checkoutController.js
const ShippingZone = require('../models/ShippingZone');
const Tax = require('../models/Tax');
const AppError = require('../utils/AppError');
const ShippingService = require('../services/shippingService');

const shippingService = new ShippingService();

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

    let shippingAddress = address;

    // If addressId provided, fetch the address from the user's addresses
    if (addressId && req.user) {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);
      if (user && user.addresses) {
        shippingAddress = user.addresses.id(addressId);
        if (!shippingAddress) {
          return next(new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND'));
        }
      }
    }

    // Calculate total weight of items (default 500g per item if not specified)
    const totalWeight = items?.reduce((sum, item) => sum + ((item.weight || 500) * (item.qty || 1)), 0) || 500;
    const orderValue = items?.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 1)), 0) || 0;

    // Try to get real shipping rates from carriers
    let quotes = [];

    try {
      // Default origin (can be configured per vendor later)
      const origin = {
        zipCode: process.env.DEFAULT_ORIGIN_ZIP || '110001', // Delhi
      };

      const destination = {
        zipCode: shippingAddress.zipCode,
        state: shippingAddress.state,
        country: shippingAddress.country || 'IN',
      };

      const packages = {
        weight: totalWeight,
        length: 20, // Default dimensions in cm
        breadth: 15,
        height: 10,
      };

      // Get rates from all available carriers
      const carrierRates = await shippingService.calculateShippingRates(origin, destination, packages, orderValue);

      // Transform carrier rates to quote format
      quotes = carrierRates.map((rate, index) => ({
        id: `${rate.carrier}-${index}`,
        name: `${rate.carrierName} Shipping`,
        description: rate.serviceName || `Delivered via ${rate.carrierName}`,
        cost: Math.round(rate.rate || 0),
        estimatedDays: rate.estimatedDays || 7,
        carrier: rate.carrier,
        cod_available: rate.cod_available || false,
      }));

      // Add free shipping option if order value is high enough
      const freeShippingThreshold = 2000; // INR 2000
      if (orderValue >= freeShippingThreshold && quotes.length > 0) {
        quotes.unshift({
          id: 'free-shipping',
          name: 'Free Standard Shipping',
          description: `Orders above ₹${freeShippingThreshold}`,
          cost: 0,
          estimatedDays: 7,
        });
      }
    } catch (error) {
      console.error('Failed to fetch real shipping rates:', error);
      // Fallback to mock quotes if real rates fail
      quotes = [
        {
          id: 'standard',
          name: 'Standard Shipping',
          description: '5-7 business days',
          cost: 499,
          estimatedDays: 7,
        },
        {
          id: 'express',
          name: 'Express Shipping',
          description: '2-3 business days',
          cost: 1199,
          estimatedDays: 3,
        },
      ];

      // Add free shipping for high-value orders
      if (orderValue >= 2000) {
        quotes.unshift({
          id: 'free-shipping',
          name: 'Free Standard Shipping',
          description: 'Orders above ₹2000',
          cost: 0,
          estimatedDays: 7,
        });
      }
    }

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
    const { subtotal, address, items } = req.body;

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

    // Try to find applicable tax rules based on location
    let taxRate = 0.18; // Default 18% GST for India
    let taxBreakdown = {
      cgst: 0.09, // 9% CGST
      sgst: 0.09, // 9% SGST
      igst: 0,    // 0% IGST (used for inter-state)
    };

    if (address) {
      try {
        // Find tax rules for the given location
        const taxRules = await Tax.find({
          isActive: true,
          $or: [
            { countries: address.country },
            { countries: { $size: 0 } }, // Global tax rules
          ],
        });

        // Apply most specific tax rule
        for (const rule of taxRules) {
          // Check if state-specific rule exists
          if (rule.states && rule.states.length > 0 && rule.states.includes(address.state)) {
            taxRate = rule.rate / 100;

            // Use GST components if available
            if (rule.gstComponents) {
              const gst = rule.gstComponents;
              taxBreakdown = {
                cgst: (gst.cgst || 0) / 100,
                sgst: (gst.sgst || 0) / 100,
                utgst: (gst.utgst || 0) / 100,
                igst: (gst.igst || 0) / 100,
              };
            }
            break;
          }
          // Check if country-specific rule exists (but no state restriction)
          else if (rule.countries && rule.countries.includes(address.country) && (!rule.states || rule.states.length === 0)) {
            taxRate = rule.rate / 100;

            if (rule.gstComponents) {
              const gst = rule.gstComponents;
              taxBreakdown = {
                cgst: (gst.cgst || 0) / 100,
                sgst: (gst.sgst || 0) / 100,
                utgst: (gst.utgst || 0) / 100,
                igst: (gst.igst || 0) / 100,
              };
            }
          }
        }
      } catch (error) {
        // If tax lookup fails, continue with default rate
        console.error('Tax lookup error:', error);
      }
    }

    const taxAmount = subtotal * taxRate;

    res.json({
      success: true,
      data: {
        taxRate,
        taxAmount,
        breakdown: taxBreakdown,
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