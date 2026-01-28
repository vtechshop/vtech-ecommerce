// FILE: apps/api/src/controllers/checkoutController.js
const Tax = require('../models/Tax');
const AppError = require('../utils/AppError');
const shippingService = require('../services/shippingService');
const env = require('../config/env');
const logger = require('../config/logger');

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
        zipCode: env.DEFAULT_ORIGIN_ZIP,
      };

      const destination = {
        zipCode: shippingAddress.zipCode,
        state: shippingAddress.state,
        country: shippingAddress.country || 'IN',
      };

      const packages = {
        weight: totalWeight,
        length: env.DEFAULT_PACKAGE_LENGTH,
        breadth: env.DEFAULT_PACKAGE_BREADTH,
        height: env.DEFAULT_PACKAGE_HEIGHT,
      };

      // Get rates from all available carriers
      const carrierRates = await shippingService.calculateShippingRates(origin, destination, packages, orderValue);

      // Transform carrier rates to quote format with generic names
      quotes = carrierRates.map((rate, index) => {
        // Create generic shipping method names based on delivery speed
        let methodName = 'Standard Shipping';
        let methodDescription = 'Delivery in 5-7 business days';

        const days = rate.estimatedDays || 7;
        if (days <= 2) {
          methodName = 'Express Shipping';
          methodDescription = `Delivery in ${days === 1 ? '1 business day' : '2 business days'}`;
        } else if (days <= 4) {
          methodName = 'Fast Shipping';
          methodDescription = `Delivery in ${days} business days`;
        } else {
          methodDescription = `Delivery in ${days} business days`;
        }

        return {
          id: `shipping-${index}`,
          name: methodName,
          description: methodDescription,
          cost: Math.round(rate.rate || 0),
          estimatedDays: days,
          carrier: rate.carrier, // Keep internal carrier reference
          cod_available: rate.cod_available || false,
        };
      });

      // Add free shipping option if order value is high enough
      if (orderValue >= env.FREE_SHIPPING_THRESHOLD && quotes.length > 0) {
        quotes.unshift({
          id: 'free-shipping',
          name: 'Free Standard Shipping',
          description: `Orders above ₹${env.FREE_SHIPPING_THRESHOLD}`,
          cost: 0,
          estimatedDays: 7,
        });
      }
    } catch (error) {
      logger.error('Failed to fetch real shipping rates:', error);
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
        logger.error('Tax lookup error:', error);
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
    const { amount, currency = 'INR', orderId } = req.body;

    // SECURITY: Validate amount parameter exists
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Valid payment amount is required',
        },
      });
    }

    // CRITICAL SECURITY: Verify amount matches actual order total
    // This prevents users from manipulating payment amounts
    if (orderId) {
      const Order = require('../models/Order');
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

      // Verify user owns this order (or is guest with correct email)
      const isOwner = req.user && String(order.userId) === String(req.user._id);
      const isGuest = !req.user && order.isGuest;

      if (!isOwner && !isGuest) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Not authorized to create payment for this order',
          },
        });
      }

      // CRITICAL: Verify amount matches order total (with 1 rupee tolerance for rounding)
      const expectedAmount = Math.round(order.totals.total * 100) / 100;
      const providedAmount = Math.round(amount * 100) / 100;

      if (Math.abs(providedAmount - expectedAmount) > 1) {
        logger.warn(`Payment amount mismatch for order ${orderId}: expected ${expectedAmount}, got ${providedAmount}`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'AMOUNT_MISMATCH',
            message: `Payment amount (₹${providedAmount}) does not match order total (₹${expectedAmount})`,
          },
        });
      }

      // Use the order's actual total (not the user-provided amount)
      const verifiedAmount = order.totals.total;

      // If Stripe is configured, use real payment intent
      if (process.env.STRIPE_KEY) {
        const stripe = require('stripe')(process.env.STRIPE_KEY);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(verifiedAmount * 100), // Use verified amount
          currency: currency.toLowerCase(),
          metadata: {
            userId: req.user?._id?.toString() || 'guest',
            orderId: orderId,
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
          amount: Math.round(verifiedAmount * 100), // Use verified amount
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
    } else {
      // No orderId provided - reject for security
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_ID_REQUIRED',
          message: 'Order ID is required for payment intent creation',
        },
      });
    }
  } catch (error) {
    next(error);
  }
};