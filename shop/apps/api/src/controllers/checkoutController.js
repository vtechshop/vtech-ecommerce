// FILE: apps/api/src/controllers/checkoutController.js
const ShippingZone = require('../models/ShippingZone');
const Tax = require('../models/Tax');
const AppError = require('../utils/AppError');
const Product = require('../models/Product');
const shippingService = require('../services/shippingService');
const env = require('../config/env');
const logger = require('../config/logger');

// MSS Transport — pincode-based zone system from Coimbatore origin
// Zone 0 = Local (Coimbatore/Tiruppur/Erode/Nilgiris) ~0-100km
// Zone 1 = Nearby (Salem/Namakkal/Karur/Dindigul)     ~100-250km
// Zone 2 = Medium (Madurai/Trichy/Vellore/Dharmapuri) ~250-400km
// Zone 3 = Far    (Chennai/Tirunelveli/Thanjavur)      ~400-550km
// Zone 4 = Remote (Kanyakumari/Nagercoil/far northeast)~550km+

const MSS_PINCODE_ZONES = {
  // Zone 0 — Local (Coimbatore, Tiruppur, Erode, Nilgiris)
  641: 0, 642: 0, 643: 0, 638: 0, 644: 0, 645: 0, 646: 0,

  // Zone 1 — Nearby
  636: 1, 637: 1, // Salem
  639: 1,         // Karur
  624: 1,         // Dindigul
  637: 1,         // Namakkal
  635: 1,         // Dharmapuri (closer side)

  // Zone 2 — Medium
  625: 2, 626: 2, // Madurai
  620: 2, 621: 2, 622: 2, // Tiruchirappalli
  623: 2,         // Pudukkottai
  630: 2, 631: 2, // Sivaganga / Ramanathapuram
  632: 2, 633: 2, 634: 2, // Vellore / Tiruvannamalai
  560: 2,         // Part of border

  // Zone 3 — Far
  600: 3, 601: 3, 602: 3, 603: 3, 604: 3, // Chennai
  605: 3, 606: 3, 607: 3,                  // Chennai suburbs / Tiruvallur
  608: 3, 609: 3,                           // Kanchipuram
  617: 3, 618: 3, 619: 3,                  // Thanjavur / Ariyalur
  627: 3, 628: 3,                           // Tirunelveli / Tuticorin

  // Zone 4 — Remote
  610: 4, 611: 4, 612: 4, 613: 4, 614: 4, 615: 4, 616: 4, // Nagapattinam/Tiruvarur
  629: 4,                                                    // Kanyakumari / Nagercoil
};

// Rate tables per zone [≤0.5kg, ≤1kg, ≤2kg, ≤5kg, ≤10kg, ≤20kg, per5kgAbove20]
const MSS_ZONE_RATES = {
  0: [40,  60,  90,  130, 220, 380, 15],  // Local
  1: [60,  90,  130, 200, 320, 550, 20],  // Nearby
  2: [80,  120, 170, 270, 430, 720, 25],  // Medium
  3: [100, 150, 220, 360, 580, 950, 30],  // Far
  4: [130, 190, 280, 450, 720, 1200, 40], // Remote
};

function getMSSZone(pincode) {
  const prefix = parseInt(String(pincode).slice(0, 3));
  return MSS_PINCODE_ZONES[prefix] !== undefined ? MSS_PINCODE_ZONES[prefix] : 3; // default Zone 3
}

function getMSSRate(weightKg, zone = 3) {
  const [r05, r1, r2, r5, r10, r20, perExtra] = MSS_ZONE_RATES[zone] || MSS_ZONE_RATES[3];
  if (weightKg <= 0.5) return r05;
  if (weightKg <= 1)   return r1;
  if (weightKg <= 2)   return r2;
  if (weightKg <= 5)   return r5;
  if (weightKg <= 10)  return r10;
  if (weightKg <= 20)  return r20;
  return r20 + Math.ceil((weightKg - 20) / 5) * perExtra;
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

    const originPin = env.DEFAULT_ORIGIN_ZIP || '641001'; // Coimbatore
    const totalWeightGrams = Math.round(totalWeightKg * 1000);

    // Tamil Nadu → MSS Transport (pincode-based zone) + Delhivery options
    if (isTamilNadu(address.state)) {
      const zone = getMSSZone(destinationPin);
      const cost = getMSSRate(totalWeightKg, zone);
      const zoneNames = ['Local', 'Nearby', 'Medium', 'Far', 'Remote'];
      const days = [1, 2, 3, 4, 5][zone] || 4;
      quotes.push({
        id: 'mss-standard',
        name: 'MSS Transport',
        description: `${days}-${days + 1} business days (Zone: ${zoneNames[zone]})`,
        cost,
        estimatedDays: days + 1,
        carrier: 'MSS Transport',
      });
      logger.info(`MSS Transport Zone ${zone} (${zoneNames[zone]}) ₹${cost} for ${totalWeightKg.toFixed(2)}kg → ${destinationPin}`);
    }

    // All states (including TN) → also try Delhivery API
    try {
      const delhivery = shippingService.getCarrier('delhivery');

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

    // Fallback if no quotes at all (non-TN + Delhivery failed)
    if (quotes.length === 0) {
      const cost = getWeightFallbackRate(totalWeightKg);
      quotes.push({
        id: 'standard',
        name: 'Standard Shipping',
        description: '5-7 business days',
        cost,
        estimatedDays: 7,
      });
      logger.warn(`All carriers unavailable — fallback rate ₹${cost} for ${totalWeightKg.toFixed(2)}kg`);
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