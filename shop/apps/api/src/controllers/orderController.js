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
            store: 'V-Tech Ecommerce',
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

    // Calculate totals and build order items
    // Tax is included in product price (Indian MRP style) - no separate tax
    // Platform fee/commission is handled internally when paying vendors
    let subtotal = 0;
    const tax = 0; // Tax included in product price
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

    // Shipping is included in product price (no separate shipping charge)
    // Platform fee/commission is handled internally when paying vendors
    const shipping = 0;
    const discount = 0;
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

    // Helper for optional session parameter
    const sessionOpt = useTransaction ? { session } : {};

    try {
      // ===== NEW: CREATE SEPARATE ORDER FOR EACH VENDOR =====

      for (const [vendorIdStr, vendorItems] of Object.entries(vendorGroups)) {
      // Calculate vendor-specific totals
      const vendorSubtotal = vendorItems.reduce((sum, item) =>
        sum + (item.priceSnapshot * item.qty), 0);

      const vendorTax = vendorSubtotal * 0.1;
      const vendorShipping = shipping / Object.keys(vendorGroups).length; // Split shipping
      const vendorDiscount = 0;
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

      // ===== CREATE COMMISSIONS FOR THIS VENDOR ORDER (BATCH OPTIMIZED) =====
      const Vendor = require('../models/Vendor');

      // Batch fetch vendor and products to avoid N+1 queries
      const productIds = vendorItems.map(item => item.productId);
      const [vendor, products] = await Promise.all([
        Vendor.findById(vendorIdStr),
        Product.find({ _id: { $in: productIds } }).populate('categoryIds')
      ]);

      if (!vendor) continue;

      // Create a map for quick product lookup
      const productMap = new Map(products.map(p => [p._id.toString(), p]));

      // Collect all commissions to create in batch
      const commissionsToCreate = [];

      for (const item of vendorItems) {
        const product = productMap.get(item.productId.toString());
        if (!product) continue;

        // Commission calculation logic
        let commissionPercentage = null;

        if (product.vendorCommissionPercentage !== undefined && product.vendorCommissionPercentage !== null) {
          commissionPercentage = product.vendorCommissionPercentage;
        }

        if (commissionPercentage === null && product.categoryIds && product.categoryIds.length > 0 &&
            product.vendorCommissionRules && product.vendorCommissionRules.length > 0) {
          for (const categoryId of product.categoryIds) {
            const rule = product.vendorCommissionRules.find(r => r.categoryId.toString() === categoryId._id.toString());
            if (rule && rule.percentage !== undefined && rule.percentage !== null) {
              commissionPercentage = rule.percentage;
              break;
            }
          }
        }

        if (commissionPercentage === null && product.categoryIds && product.categoryIds.length > 0 &&
            vendor.commissionRules && vendor.commissionRules.length > 0) {
          for (const categoryId of product.categoryIds) {
            const rule = vendor.commissionRules.find(r => r.categoryId.toString() === categoryId._id.toString());
            if (rule && rule.percentage !== undefined && rule.percentage !== null) {
              commissionPercentage = rule.percentage;
              break;
            }
          }
        }

        if (commissionPercentage === null) {
          commissionPercentage = vendor.defaultCommissionPercentage || 15;
        }

        const commissionAmount = (item.priceSnapshot * item.qty * commissionPercentage) / 100;

        commissionsToCreate.push({
          type: 'vendor',
          subjectId: item.vendorId,
          subjectModel: 'Vendor',
          orderId: vendorOrder._id,
          orderItemId: item._id,
          amount: commissionAmount,
          percentage: commissionPercentage,
          status: 'pending',
        });
      }

      // Batch create all commissions for this vendor
      if (commissionsToCreate.length > 0) {
        await Commission.create(commissionsToCreate, sessionOpt);
      }
      }

    // ===== AFFILIATE TRACKING (track once for entire purchase) =====
    const affiliateCookie = req.cookies?.affiliate;
    if (affiliateCookie) {
      const Affiliate = require('../models/Affiliate');
      const affiliate = await Affiliate.findOne({ code: affiliateCookie });

      if (affiliate) {
        let totalAffiliateCommission = 0;

        for (const item of orderItems) {
          const product = await Product.findById(item.productId).populate('categoryIds');
          let commissionPercentage = null;

          if (product.affiliateCommissionPercentage !== undefined && product.affiliateCommissionPercentage !== null) {
            commissionPercentage = product.affiliateCommissionPercentage;
          }

          if (commissionPercentage === null && product.categoryIds && product.categoryIds.length > 0 &&
              product.affiliateCommissionRules && product.affiliateCommissionRules.length > 0) {
            for (const categoryId of product.categoryIds) {
              const rule = product.affiliateCommissionRules.find(r => r.categoryId.toString() === categoryId._id.toString());
              if (rule && rule.percentage !== undefined && rule.percentage !== null) {
                commissionPercentage = rule.percentage;
                break;
              }
            }
          }

          if (commissionPercentage === null && product.categoryIds && product.categoryIds.length > 0 &&
              affiliate.commissionRules && affiliate.commissionRules.length > 0) {
            for (const categoryId of product.categoryIds) {
              const rule = affiliate.commissionRules.find(r => r.categoryId.toString() === categoryId._id.toString());
              if (rule && rule.percentage !== undefined && rule.percentage !== null) {
                commissionPercentage = rule.percentage;
                break;
              }
            }
          }

          if (commissionPercentage === null) {
            commissionPercentage = affiliate.commissionPercentage || 5;
          }

          const itemTotal = item.priceSnapshot * item.qty;
          const itemCommission = (itemTotal * commissionPercentage) / 100;
          totalAffiliateCommission += itemCommission;
        }

        // Link affiliate commission to first vendor order
        await Commission.create([{
          type: 'affiliate',
          subjectId: affiliate._id,
          subjectModel: 'Affiliate',
          orderId: vendorOrders[0]._id,
          amount: totalAffiliateCommission,
          percentage: affiliate.commissionPercentage,
          status: 'pending',
        }], sessionOpt);

        affiliate.totalConversions += 1;
        affiliate.pendingEarnings += totalAffiliateCommission;
        await affiliate.save(sessionOpt);
      }
    }

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

    // Build query to find orders that belong to user OR are guest orders with matching email
    const query = {
      $or: [
        { userId: req.user._id }, // Orders placed as logged-in user
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
        // Check if user is a vendor
        try {
          const Vendor = require('../models/Vendor');
          const vendor = await Vendor.findOne({ userId: req.user._id });

          if (vendor) {
            // Vendor can view orders containing their products
            return {
              ...idQuery,
              'items.vendorId': vendor._id, // Order contains vendor's products
            };
          }
        } catch (vendorError) {
          logger.error('Error checking vendor status:', vendorError);
          // Continue as regular customer if vendor check fails
        }

        // Regular customer - check ownership
        return {
          ...idQuery,
          $or: [
            { userId: req.user._id }, // Order belongs to logged-in user
            { isGuest: true, guestEmail: req.user.email }, // Guest order with matching email
          ],
        };
      } else {
        // Guest user accessing order
        const guestEmail = req.query.email;

        // For recently created orders (within 30 minutes), allow access without email
        // This supports the checkout flow where guest is redirected to confirmation page
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        if (guestEmail) {
          // With email: allow access to orders created in last 24 hours
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return {
            ...idQuery,
            isGuest: true,
            guestEmail: guestEmail.toLowerCase(),
            createdAt: { $gte: oneDayAgo },
          };
        } else {
          // Without email: only allow access to very recent orders (checkout confirmation flow)
          return {
            ...idQuery,
            isGuest: true,
            createdAt: { $gte: thirtyMinutesAgo },
          };
        }
      }
    };

    // Check if it's a valid MongoDB ObjectId format
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      const query = await buildQuery({ _id: id });
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
        trackingNumber: order.shipment.trackingNumber,
        carrier: order.shipment.carrier,
        estimatedDelivery: order.shipment.estimatedDelivery,
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

    const order = await Order.findOne({
      orderId: id,
      $or: [
        { userId: req.user._id }, // Order belongs to logged-in user
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

    const order = await Order.findOne({
      _id: id,
      userId: req.user._id,
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
