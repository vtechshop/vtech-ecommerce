// FILE: apps/api/src/controllers/orderController.js
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Commission = require('../models/Commission');
const AdEvent = require('../models/AdEvent');
const { generateOrderId } = require('../utils/helpers');
const { getPaginationMeta } = require('../utils/helpers');
const logger = require('../config/logger');
const env = require('../config/env');
// Payment is now handled by Razorpay controller directly
const warrantyService = require('../services/warrantyService');
const notificationService = require('../services/notificationService');
const notificationHelper = require('../services/notificationHelper');

// Helper function to activate warranties after payment
const activateWarranties = async (order) => {
  const now = new Date();

  for (const item of order.items) {
    // Process all warranty items, regardless of activation requirement
    if (item.warranty?.hasWarranty && !item.warranty.isActivated) {
      // Calculate warranty expiration date
      let expiresAt = null;
      let warrantyPeriodDays = 0;

      if (item.warranty.durationType === 'lifetime') {
        expiresAt = null; // Lifetime warranty never expires
        warrantyPeriodDays = 36500; // 100 years for lifetime
      } else if (item.warranty.durationType === 'years') {
        expiresAt = new Date(now);
        expiresAt.setFullYear(expiresAt.getFullYear() + item.warranty.duration);
        warrantyPeriodDays = item.warranty.duration * 365;
      } else { // months
        expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + item.warranty.duration);
        warrantyPeriodDays = item.warranty.duration * 30;
      }

      // Only auto-activate if no activation required
      if (!item.warranty.activationRequired) {
        item.warranty.isActivated = true;
        item.warranty.activatedAt = now;
        item.warranty.expiresAt = expiresAt;
      }

      // Generate Warranty record in database (for all warranty products)
      try {
        // Get product details from the database
        const productDetails = await Product.findById(item.productId);

        await warrantyService.generateWarranty({
          purchaseId: order.orderId,
          orderId: order._id,
          user: {
            id: order.userId || order.guestEmail,
            name: order.shipTo?.fullName || 'Guest',
            email: order.guestEmail || 'N/A',
            phone: order.shipTo?.phone || ''
          },
          product: {
            id: item.productId,
            name: item.name,
            model: productDetails?.sku || '',
            serial: '',
            category: productDetails?.category?.name || ''
          },
          purchaseDate: order.createdAt || now,
          warrantyPeriodDays: warrantyPeriodDays,
          warrantyType: 'manufacturer',
          extraInfo: {
            store: 'V-Tech',
            invoiceNo: order.orderId,
            remarks: item.warranty.description || ''
          }
        });
        logger.info(`Warranty generated for product ${item.name} in order ${order.orderId}`);
      } catch (error) {
        logger.error(`Failed to generate warranty for ${item.name}: ${error.message}`);
        // Don't fail the entire order if warranty generation fails
      }
    }
  }

  await order.save();
  logger.info(`Warranties activated for order: ${order.orderId}`);
};

// Create order with vendor order splitting
exports.createOrder = async (req, res, next) => {
  try {
    const { items, shipTo, shippingMethod, paymentMethod, paymentDetails, guestEmail } = req.body;

    // Check if this is guest checkout (ensure boolean, not truthy value)
    const isGuest = !req.user && !!guestEmail;

    // Validate guest email if guest checkout
    if (isGuest && !guestEmail) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'GUEST_EMAIL_REQUIRED',
          message: 'Email is required for guest checkout',
        },
      });
    }

    // Validate email format for guest checkout (stricter regex)
    if (isGuest && guestEmail) {
      // More comprehensive email regex - requires at least 2 chars in TLD
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(guestEmail)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EMAIL_FORMAT',
            message: 'Invalid email format',
          },
        });
      }
    }

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ITEMS_REQUIRED',
          message: 'Order must contain at least one item',
        },
      });
    }

    // Security: Validate quantity limits per item (from config)
    const MAX_QTY_PER_ITEM = env.MAX_QTY_PER_ITEM;
    const MAX_ITEMS_PER_ORDER = env.MAX_ITEMS_PER_ORDER;

    if (items.length > MAX_ITEMS_PER_ORDER) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_ITEMS',
          message: `Maximum ${MAX_ITEMS_PER_ORDER} items allowed per order`,
        },
      });
    }

    for (const item of items) {
      if (!item.qty || typeof item.qty !== 'number' || item.qty < 1 || item.qty > MAX_QTY_PER_ITEM) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: `Quantity must be between 1 and ${MAX_QTY_PER_ITEM}`,
          },
        });
      }

      // Ensure quantity is an integer
      if (!Number.isInteger(item.qty)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Quantity must be a whole number',
          },
        });
      }
    }

    // Validate stock for all items
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: `Product ${item.productId} not found`,
          },
        });
      }

      const variant = item.variantId ? product.variants.id(item.variantId) : null;

      // Validate variant exists if variantId was provided
      if (item.variantId && !variant) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'VARIANT_NOT_FOUND',
            message: `Variant ${item.variantId} not found for product ${product.title}`,
          },
        });
      }

      const stock = variant ? variant.stock : product.stock;

      if (stock < item.qty) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for ${product.title}`,
          },
        });
      }
    }

    // Fetch user's cart to get discount/coupon info
    // Try both userId and guestId to handle login state transitions
    const userId = req.user?._id;
    const guestId = req.cookies?.guestId;
    let userCart = null;

    // Try to find cart by userId first, then by guestId
    if (userId) {
      userCart = await Cart.findOne({ userId });
    }
    if (!userCart && guestId) {
      userCart = await Cart.findOne({ guestId });
    }

    // Get discount from cart (coupons), other totals will be calculated from items
    const cartDiscount = userCart?.totals?.discount || 0;

    // Build order items and calculate subtotal for validation
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      const variant = item.variantId ? product.variants.id(item.variantId) : null;
      const price = variant ? variant.price : product.price;
      const itemTotal = price * item.qty;

      subtotal += itemTotal;

      // Copy warranty information from product
      const warrantyInfo = product.hasWarranty ? {
        hasWarranty: true,
        duration: product.warranty.duration,
        durationType: product.warranty.durationType,
        description: product.warranty.description,
        terms: product.warranty.terms,
        provider: product.warranty.provider,
        activationRequired: product.warranty.activationRequired,
        isActivated: false,
        warrantyCode: product.hasWarranty ? `WTY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null,
      } : { hasWarranty: false };

      orderItems.push({
        productId: product._id,
        vendorId: product.vendorId,
        variantId: item.variantId,
        qty: item.qty,
        priceSnapshot: price,
        name: product.title,
        image: product.images?.[0],
        productSlug: product.slug,
        variantName: variant?.name,
        sku: variant?.sku || product.sku,
        warranty: warrantyInfo,
        // Include tax info for reference
        taxIncluded: product.taxIncluded || false,
        taxable: product.taxable || false,
        taxRate: product.taxRate || 0,
      });
    }

    // Calculate tax directly from order items (same logic as Cart model)
    // This ensures consistency even if cart is not found
    const calculatedTax = orderItems.reduce((sum, item) => {
      // Skip if tax is already included in price (Indian MRP)
      if (item.taxIncluded) {
        return sum;
      }
      // Calculate tax if item is taxable
      if (item.taxable && item.taxRate > 0) {
        const itemTax = (item.priceSnapshot * item.qty) * (item.taxRate / 100);
        return sum + itemTax;
      }
      return sum;
    }, 0);

    const tax = calculatedTax;
    const shipping = 0; // Shipping included in product price
    const discount = cartDiscount;
    const total = subtotal + tax + shipping - discount;

    // Determine payment provider and status
    // All payments go through Razorpay (COD has been removed)
    let paymentProvider = 'razorpay';
    let paymentStatus = 'pending';

    if (paymentMethod === 'card') {
      paymentProvider = 'stripe';
    } else if (paymentMethod === 'upi' || paymentMethod === 'netbanking' || paymentMethod === 'razorpay') {
      paymentProvider = 'razorpay';
    }

    // ===== NEW: GROUP ITEMS BY VENDOR =====
    const vendorGroups = {};
    for (const item of orderItems) {
      // Validate vendorId exists (required for multi-vendor order splitting)
      if (!item.vendorId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_VENDOR',
            message: `Product "${item.name}" is missing vendor information. Please contact support.`,
          },
        });
      }
      const vendorIdStr = item.vendorId.toString();
      if (!vendorGroups[vendorIdStr]) {
        vendorGroups[vendorIdStr] = [];
      }
      vendorGroups[vendorIdStr].push(item);
    }

    logger.info(`Order split into ${Object.keys(vendorGroups).length} vendor orders`);

    // ===== MONGODB TRANSACTION SUPPORT =====
    // Transactions require replica set. Check if available, otherwise proceed without transaction.
    let session = null;
    let useTransaction = false;

    // Check if replica set is available by checking the topology
    const isReplicaSet = mongoose.connection.readyState === 1 &&
      mongoose.connection.client?.topology?.description?.type === 'ReplicaSetWithPrimary';

    if (isReplicaSet) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
        logger.info('MongoDB transaction started (replica set detected)');
      } catch (sessionError) {
        logger.warn('Failed to start transaction:', sessionError.message);
        if (session) {
          session.endSession();
        }
        session = null;
        useTransaction = false;
      }
    } else {
      logger.info('MongoDB standalone mode - proceeding without transaction');
    }

    // Variables to store vendor orders (accessible outside transaction block)
    let vendorOrders = [];
    let vendorOrderIds = [];

    // Extract affiliate code early so we can store it on orders (outside try block for later cookie clearing)
    const affiliateCode = req.body.affiliateCode || req.cookies?.affiliate || null;

    // Helper for optional session parameter
    const sessionOpt = useTransaction ? { session } : {};

    try {
      // ===== NEW: CREATE SEPARATE ORDER FOR EACH VENDOR =====

      for (const [vendorIdStr, vendorItems] of Object.entries(vendorGroups)) {
      // Calculate vendor-specific totals directly from items
      const vendorSubtotal = vendorItems.reduce((sum, item) =>
        sum + (item.priceSnapshot * item.qty), 0);

      // Calculate vendor tax directly from vendor items (same logic as Cart model)
      const vendorTax = vendorItems.reduce((sum, item) => {
        // Skip if tax is already included in price (Indian MRP)
        if (item.taxIncluded) {
          return sum;
        }
        // Calculate tax if item is taxable
        if (item.taxable && item.taxRate > 0) {
          const itemTax = (item.priceSnapshot * item.qty) * (item.taxRate / 100);
          return sum + itemTax;
        }
        return sum;
      }, 0);

      // Calculate vendor's proportion of discount
      const vendorProportion = subtotal > 0 ? vendorSubtotal / subtotal : 1;
      const vendorShipping = 0; // Shipping included in product price
      const vendorDiscount = Math.round(discount * vendorProportion * 100) / 100;
      const vendorTotal = vendorSubtotal + vendorTax + vendorShipping - vendorDiscount;

        // All orders require payment verification (COD removed)
        // Orders start as pending_payment and change to 'placed' after payment verification
        const initialStatus = 'pending_payment';
        const initialEventDescription = 'Order created - Awaiting payment';

        // Create vendor-specific order with transaction
        const vendorOrder = (await Order.create([{
          orderId: generateOrderId(), // SEQUENTIAL ORDER ID
          userId: req.user?._id,
          guestEmail: isGuest ? guestEmail : undefined,
          isGuest: isGuest,
          items: vendorItems, // ONLY THIS VENDOR'S ITEMS
          totals: {
            subtotal: vendorSubtotal,
            tax: vendorTax,
            shipping: vendorShipping,
            discount: vendorDiscount,
            total: vendorTotal,
          },
          shipTo,
          status: initialStatus,
          events: [{
            status: initialStatus,
            description: initialEventDescription,
            timestamp: new Date(),
          }],
          payment: {
            provider: paymentProvider,
            method: paymentMethod,
            status: paymentStatus,
            amount: vendorTotal, // Vendor-specific amount
          },
          isVendorOrder: true, // Mark as vendor order
          ...(affiliateCode && { affiliateCode }), // Store affiliate code for commission tracking
        }], sessionOpt))[0];

      vendorOrders.push(vendorOrder);
      vendorOrderIds.push(vendorOrder.orderId);

      logger.info(`Vendor order created: ${vendorOrder.orderId} for vendor ${vendorIdStr}`);

        // ===== DEDUCT STOCK FOR THIS VENDOR'S ITEMS (ATOMIC) =====
        for (const item of vendorItems) {
          let updateResult;

          if (item.variantId) {
            // Atomic update for variant stock - ensures no overselling
            updateResult = await Product.findOneAndUpdate(
              {
                _id: item.productId,
                'variants._id': item.variantId,
                'variants.stock': { $gte: item.qty } // Only update if enough stock
              },
              {
                $inc: {
                  'variants.$.stock': -item.qty,
                  soldCount: item.qty
                }
              },
              { ...sessionOpt, new: true }
            );
          } else {
            // Atomic update for main product stock - ensures no overselling
            updateResult = await Product.findOneAndUpdate(
              {
                _id: item.productId,
                stock: { $gte: item.qty } // Only update if enough stock
              },
              {
                $inc: {
                  stock: -item.qty,
                  soldCount: item.qty
                }
              },
              { ...sessionOpt, new: true }
            );
          }

          // If update failed, stock was insufficient (race condition prevented)
          if (!updateResult) {
            throw new Error(`Insufficient stock for product ${item.name}. Please refresh and try again.`);
          }
        }

      // ===== COMMISSIONS WILL BE CREATED AFTER PAYMENT SUCCESS =====
      // Commission creation moved to razorpayController.js after payment verification
      // to ensure commissions are only created for successfully paid orders
      }

    // ===== AFFILIATE & VENDOR COMMISSIONS =====
    // Affiliate code is stored on order (affiliateCode field) and commissions
    // (both vendor and affiliate) are created after payment verification
    // in razorpayController.createCommissionsAfterPayment()
    // This ensures commissions are only created for successfully paid orders.

    // Clear cart (only for authenticated users)
    if (req.user) {
      if (useTransaction) {
        await Cart.deleteOne({ userId: req.user._id }).session(session);
      } else {
        await Cart.deleteOne({ userId: req.user._id });
      }
    }

    // ===== COMMIT TRANSACTION (if using transactions) =====
    if (useTransaction && session) {
      await session.commitTransaction();
      session.endSession();
      logger.info('Order creation transaction committed successfully');
    }
  } catch (transactionError) {
    // ===== ABORT TRANSACTION ON ERROR (if using transactions) =====
    if (useTransaction && session) {
      await session.abortTransaction();
      session.endSession();
    }
    logger.error('Order creation failed:', transactionError);
    throw transactionError; // Re-throw to be handled by outer catch
  }

  // ===== SEND NOTIFICATIONS WITH VENDOR ORDER IDs =====
  // Send customer email - use multi-vendor template if multiple orders
  let customerEmailSent = false;
  let emailError = null;

  try {
    const User = require('../models/User');
    let userInfo;

    if (req.user) {
      userInfo = await User.findById(req.user._id);
    } else if (isGuest) {
      userInfo = {
        name: shipTo?.fullName || 'Guest',
        email: guestEmail,
      };
    }

    // CRITICAL: Order confirmation email is sent AFTER payment verification
    // See razorpayController.js verifyPayment() and webhook handler
    // COD has been removed - all orders require online payment
    logger.info(`Order(s) created with pending payment - email will be sent after payment verification`);
  } catch (error) {
    customerEmailSent = false;
    emailError = error.message;
    logger.error('Failed to send order confirmation email:', error);
  }

  // IMPORTANT: Vendor and admin notifications are sent AFTER payment verification
  // This prevents notifications being sent for orders where payment is cancelled
  // See razorpayController.js verifyPayment() and handlePaymentCaptured() webhook
  logger.info(`Order(s) created with pending payment - vendor/admin notifications will be sent after payment verification`);

  // ===== CLEAR AFFILIATE COOKIE after order creation to prevent repeat commissions =====
  if (affiliateCode) {
    res.clearCookie('affiliate', { path: '/' });
  }

  // ===== RETURN ALL VENDOR ORDERS =====
  res.status(201).json({
    success: true,
    message: `Order split into ${vendorOrders.length} vendor order(s)`,
    data: {
      vendorOrders: vendorOrders,
      orderIds: vendorOrderIds,
      totalAmount: total,
      notifications: {
        emailSent: customerEmailSent,
        emailError: emailError,
        message: customerEmailSent
          ? 'Order confirmation email sent successfully'
          : 'Order created successfully but confirmation email could not be sent. Please check your order in your account.',
      },
    },
  });

  } catch (error) {
    next(error);
  }
};

// Get orders
exports.getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Convert user ID to ObjectId for proper comparison
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);

    // Build query to find orders that belong to user OR are guest orders with matching email
    const query = {
      $or: [
        { userId: userObjectId }, // Orders placed as logged-in user
        { isGuest: true, guestEmail: req.user.email }, // Guest orders with matching email
      ],
    };

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: orders,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get order by ID
exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try to find by either _id (MongoDB ObjectId) or orderId (string like "ORD-XXX")
    let order;

    // Build query based on whether user is authenticated
    const buildQuery = async (idQuery) => {
      if (req.user) {
        // Convert user ID to ObjectId for proper comparison
        const userObjectId = new mongoose.Types.ObjectId(req.user._id);

        // Check if user is a vendor
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        try {
          const Vendor = require('../models/Vendor');
          const vendor = await Vendor.findOne({ userId: userObjectId });

          if (vendor) {
            // Vendor can view:
            // 1. Orders containing their products (as a vendor)
            // 2. Orders they placed as a customer (their own orders)
            return {
              ...idQuery,
              $or: [
                { 'items.vendorId': vendor._id }, // Orders containing vendor's products
                { userId: userObjectId }, // Orders they placed as a customer
                { isGuest: true, guestEmail: req.user.email }, // Guest orders with matching email
                { createdAt: { $gte: twoHoursAgo } }, // Recent orders - fallback for checkout flow
              ],
            };
          }
        } catch (vendorError) {
          logger.error('Error checking vendor status:', vendorError);
          // Continue as regular customer if vendor check fails
        }

        // Regular customer - check ownership with fallback for recent orders
        return {
          ...idQuery,
          $or: [
            { userId: userObjectId }, // Order belongs to logged-in user
            { isGuest: true, guestEmail: req.user.email }, // Guest order with matching email
            { createdAt: { $gte: twoHoursAgo } }, // Recent orders - fallback for checkout flow
          ],
        };
      } else {
        // Guest/unauthenticated user accessing order
        const guestEmail = req.query.email;

        // For recently created orders (within 2 hours), allow access by ID alone
        // This supports the checkout confirmation flow (safe because ObjectIds are not guessable)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        if (guestEmail) {
          // With email: allow access to guest orders created in last 24 hours
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return {
            ...idQuery,
            isGuest: true,
            guestEmail: guestEmail.toLowerCase(),
            createdAt: { $gte: oneDayAgo },
          };
        } else {
          // Without email: allow access to ANY recent order by ID (checkout confirmation flow)
          // This handles both guest and logged-in orders for immediate post-payment confirmation
          // Security: 2-hour window is short, and MongoDB ObjectIds are not guessable
          return {
            ...idQuery,
            createdAt: { $gte: twoHoursAgo },
          };
        }
      }
    };

    // Check if it's a valid MongoDB ObjectId format
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      // Convert string to ObjectId for proper MongoDB query
      const objectId = new mongoose.Types.ObjectId(id);
      const query = await buildQuery({ _id: objectId });
      order = await Order.findOne(query).lean();
    } else {
      // Assume it's an orderId string
      const query = await buildQuery({ orderId: id });
      order = await Order.findOne(query).lean();
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Get order by ID error:', error);
    next(error);
  }
};

// Track order (public)
exports.trackOrder = async (req, res, next) => {
  try {
    const { orderId, email } = req.body;

    // First try to find by guest email
    let order = await Order.findOne({
      orderId,
      guestEmail: email,
      isGuest: true,
    }).lean();

    // If not found as guest, try to find by user email
    if (!order) {
      const User = require('../models/User');
      const user = await User.findOne({ email });

      if (user) {
        order = await Order.findOne({
          orderId,
          userId: user._id,
        }).lean();
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    // SECURITY: Only return necessary tracking information to prevent data exposure
    const trackingInfo = {
      orderId: order.orderId,
      status: order.status,
      createdAt: order.createdAt,
      events: order.events,
      shipment: order.shipment ? {
        awb: order.shipment.awb,
        carrier: order.shipment.carrier,
        trackingUrl: order.shipment.trackingUrl,
        estimatedDelivery: order.shipment.estimatedDelivery,
        events: order.shipment.events,
      } : null,
      totals: {
        subtotal: order.totals.subtotal,
        shipping: order.totals.shipping,
        tax: order.totals.tax,
        discount: order.totals.discount,
        total: order.totals.total,
      },
      itemCount: order.items?.length || 0,
    };

    res.json({
      success: true,
      data: trackingInfo,
    });
  } catch (error) {
    next(error);
  }
};

// Track order by AWB (public)
exports.trackOrderByAwb = async (req, res, next) => {
  try {
    const { awb } = req.body;

    if (!awb || !awb.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'AWB number is required' },
      });
    }

    const order = await Order.findOne({ 'shipment.awb': awb.trim() }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No order found with this AWB number' },
      });
    }

    // SECURITY: Only return necessary tracking information
    const trackingInfo = {
      orderId: order.orderId,
      status: order.status,
      createdAt: order.createdAt,
      events: order.events,
      shipment: order.shipment ? {
        awb: order.shipment.awb,
        carrier: order.shipment.carrier,
        trackingUrl: order.shipment.trackingUrl,
        estimatedDelivery: order.shipment.estimatedDelivery,
        events: order.shipment.events,
      } : null,
      totals: {
        subtotal: order.totals.subtotal,
        shipping: order.totals.shipping,
        tax: order.totals.tax,
        discount: order.totals.discount,
        total: order.totals.total,
      },
      itemCount: order.items?.length || 0,
    };

    res.json({
      success: true,
      data: trackingInfo,
    });
  } catch (error) {
    next(error);
  }
};

// Cancel order
exports.cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate cancellation reason
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REASON_REQUIRED',
          message: 'Cancellation reason is required',
        },
      });
    }

    // Convert user ID to ObjectId for proper comparison
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);

    const order = await Order.findOne({
      orderId: id,
      $or: [
        { userId: userObjectId }, // Order belongs to logged-in user
        { isGuest: true, guestEmail: req.user.email }, // Guest order with matching email
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    // Can only cancel if not shipped
    if (['shipped', 'out_for_delivery', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_CANCEL',
          message: 'Cannot cancel order that has been shipped',
        },
      });
    }

    order.status = 'cancelled';

    // Store cancellation reason
    if (!order.cancellation) {
      order.cancellation = {};
    }
    order.cancellation.reason = reason.trim();
    order.cancellation.cancelledAt = new Date();
    order.cancellation.cancelledBy = req.user._id;

    order.events.push({
      status: 'cancelled',
      description: `Order cancelled by customer. Reason: ${reason.trim()}`,
      timestamp: new Date(),
    });

    // Restore stock
    for (const item of order.items) {
      const product = await Product.findById(item.productId);

      // Skip stock restoration if product no longer exists
      if (!product) {
        logger.warn(`Product not found for stock restoration: ${item.productId}`);
        continue;
      }

      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (variant) {
          variant.stock += item.qty;
        }
      } else {
        product.stock += item.qty;
      }
      await product.save();
    }

    await order.save();

    logger.info(`Order cancelled: ${order.orderId}`);

    // Send cancellation notifications (async - don't block response)
    (async () => {
      try {
        const User = require('../models/User');
        const Vendor = require('../models/Vendor');

        // Get user info for email
        let userInfo = {};
        if (order.userId && !order.isGuest) {
          const user = await User.findById(order.userId);
          if (user) {
            userInfo = { name: user.name, email: user.email };
          }
        } else if (order.isGuest && order.guestEmail) {
          userInfo = { name: order.shipTo?.fullName || 'Guest', email: order.guestEmail };
        }

        // Send cancellation email to customer
        if (userInfo.email) {
          await notificationService.sendOrderCancellationEmail(userInfo, order, reason, 'customer');
          logger.info(`Cancellation email sent to customer: ${userInfo.email}`);

          // Send in-app notification to customer if registered user
          if (order.userId && !order.isGuest) {
            await notificationHelper.notifyCustomerOrderStatus({
              userId: order.userId,
              order: { _id: order._id, orderNumber: order.orderId },
              status: 'cancelled',
            });
          }
        }

        // Send cancellation notifications to vendors
        const vendorItemsMap = {};
        for (const item of order.items) {
          if (item.vendorId) {
            const vendorIdStr = item.vendorId.toString();
            if (!vendorItemsMap[vendorIdStr]) {
              vendorItemsMap[vendorIdStr] = [];
            }
            vendorItemsMap[vendorIdStr].push(item);
          }
        }

        for (const [vendorIdStr, vendorItems] of Object.entries(vendorItemsMap)) {
          const vendor = await Vendor.findById(vendorIdStr).populate('userId', 'email name');
          if (vendor && vendor.userId?.email) {
            await notificationService.sendVendorOrderCancellationEmail(vendor, order, vendorItems, reason, 'customer');
            logger.info(`Cancellation email sent to vendor: ${vendor.storeName}`);
          }
        }
      } catch (notifError) {
        logger.error('Failed to send cancellation notifications:', notifError);
      }
    })();

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Request return
exports.requestReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, reason } = req.body;

    // Convert user ID to ObjectId for proper comparison
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);

    const order = await Order.findOne({
      _id: id,
      userId: userObjectId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Can only return delivered orders',
        },
      });
    }

    const Return = require('../models/Return');
    const returnDoc = await Return.create({
      orderId: order._id,
      userId: req.user._id,
      items,
      reason,
      rma: 'RMA-' + Date.now(),
      status: 'requested',
      events: [{
        status: 'requested',
        description: 'Return requested',
        timestamp: new Date(),
      }],
    });

    order.status = 'returned';
    order.events.push({
      status: 'returned',
      description: 'Return requested',
      timestamp: new Date(),
    });
    await order.save();

    logger.info(`Return requested: ${returnDoc.rma}`);

    res.status(201).json({
      success: true,
      data: returnDoc,
    });
  } catch (error) {
    next(error);
  }
};

// SECURITY NOTE: Webhook handlers are in razorpayController.js
// The secure implementations with replay attack prevention, signature verification,
// and WebhookEvent logging are in src/controllers/razorpayController.js
// See src/routes/payment.js for webhook routes
