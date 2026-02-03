const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

// Helper function to get or create guest ID
const getOrCreateGuestId = (req, res) => {
  let guestId = req.cookies.guestId || req.sessionID;

  const isProduction = process.env.NODE_ENV === 'production';

  if (!guestId) {
    // Generate a new guest ID using timestamp + random string
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Always set/refresh the cookie to ensure it persists
  // In production with cross-origin, need sameSite: 'none' and secure: true
  res.cookie('guestId', guestId, {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction, // Required for sameSite: 'none'
  });

  return guestId;
};

// Get cart
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const guestId = userId ? null : getOrCreateGuestId(req, res);

    const query = userId ? { userId } : { guestId };

    let cart = await Cart.findOne(query).populate('items.productId');

    if (!cart) {
      cart = { items: [], totals: { subtotal: 0, tax: 0, shipping: 0, total: 0 } };
    }

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// Add item to cart
exports.addItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1, variantId } = req.body;
    const userId = req.user?._id;
    const guestId = userId ? null : getOrCreateGuestId(req, res);

    // SECURITY: Validate productId
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRODUCT_ID',
          message: 'Product ID is required',
        },
      });
    }

    // SECURITY: Validate quantity is a positive integer
    const parsedQuantity = parseInt(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be a positive number',
        },
      });
    }

    // SECURITY: Cap maximum quantity per item to prevent abuse
    const MAX_QUANTITY = 100;
    if (parsedQuantity > MAX_QUANTITY) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'QUANTITY_TOO_LARGE',
          message: `Maximum quantity per item is ${MAX_QUANTITY}`,
        },
      });
    }

    const query = userId ? { userId } : { guestId };
    const normalizedVariantId = variantId === undefined ? null : variantId;

    // Single query: Try to increment existing item OR add new item
    // Use lean product lookup for speed (no Mongoose document overhead)
    const product = await Product.findById(productId).select('title price images slug stock taxIncluded taxable taxRate').lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    if (product.stock < parsedQuantity) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Not enough stock available',
        },
      });
    }

    // Try atomic increment first (fastest path for existing items)
    let cart = await Cart.findOneAndUpdate(
      {
        ...query,
        'items.productId': productId,
        'items.variantId': normalizedVariantId,
      },
      {
        $inc: { 'items.$.qty': quantity },
      },
      { new: true }
    );

    if (!cart) {
      // Item doesn't exist - add it with upsert (creates cart if needed)
      cart = await Cart.findOneAndUpdate(
        query,
        {
          $push: {
            items: {
              productId: productId,
              qty: quantity,
              variantId: normalizedVariantId,
              priceSnapshot: product.price,
              name: product.title,
              image: product.images?.[0] || null,
              productSlug: product.slug,
              taxIncluded: product.taxIncluded || false,
              taxable: product.taxable || false,
              taxRate: product.taxRate || 0,
            },
          },
        },
        { new: true, upsert: true }
      );
    }

    // Calculate totals and save (single save operation)
    await cart.save();

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// Update item
exports.updateItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user?._id;
    const guestId = userId ? null : getOrCreateGuestId(req, res);

    const query = userId ? { userId } : { guestId };

    const cart = await Cart.findOne(query);

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CART_NOT_FOUND',
          message: 'Cart not found',
        },
      });
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found in cart',
        },
      });
    }

    // Validate quantity (same limits as addItem)
    const MAX_QUANTITY = 100;
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be a positive integer',
        },
      });
    }

    if (quantity > MAX_QUANTITY) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MAX_QUANTITY_EXCEEDED',
          message: `Maximum ${MAX_QUANTITY} items allowed per product`,
        },
      });
    }

    // Fetch product and check stock availability
    const Product = require('../models/Product');
    const product = await Product.findById(item.productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    // Check stock for variant or main product
    // SECURITY: Use optional chaining to prevent crash if variants array is undefined
    const variant = item.variantId ? product.variants?.id(item.variantId) : null;
    const availableStock = variant ? variant.stock : product.stock;

    if (availableStock < quantity) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: `Only ${availableStock} item(s) available in stock`,
        },
      });
    }

    item.qty = quantity;
    await cart.save(); // Pre-save hook calculates totals
    await cart.populate('items.productId');

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// Remove item
exports.removeItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?._id;
    const guestId = userId ? null : getOrCreateGuestId(req, res);

    const query = userId ? { userId } : { guestId };

    const cart = await Cart.findOne(query);

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CART_NOT_FOUND',
          message: 'Cart not found',
        },
      });
    }

    cart.items.pull(itemId);
    await cart.save(); // Pre-save hook calculates totals
    await cart.populate('items.productId');

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// Clear cart
exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const guestId = userId ? null : getOrCreateGuestId(req, res);

    const query = userId ? { userId } : { guestId };

    await Cart.findOneAndDelete(query);

    res.json({
      success: true,
      data: { message: 'Cart cleared successfully' },
    });
  } catch (error) {
    next(error);
  }
};

// Apply coupon
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    const userId = req.user?._id;
    const guestId = userId ? null : getOrCreateGuestId(req, res);

    const query = userId ? { userId } : { guestId };

    const cart = await Cart.findOne(query).populate('items.productId');

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { code: 'CART_NOT_FOUND', message: 'Cart not found' },
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_COUPON', message: 'Invalid coupon code' },
      });
    }

    // Check dates
    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'COUPON_NOT_STARTED', message: 'Coupon not yet valid' },
      });
    }
    if (coupon.endDate && now > coupon.endDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'COUPON_EXPIRED', message: 'Coupon expired' },
      });
    }

    // SECURITY: Check perUserLimit - validate user hasn't exceeded their personal limit
    if (coupon.perUserLimit && userId) {
      const Order = require('../models/Order');
      const userCouponUsage = await Order.countDocuments({
        userId,
        'coupons.code': coupon.code,
        status: { $nin: ['cancelled'] }
      });
      if (userCouponUsage >= coupon.perUserLimit) {
        return res.status(400).json({
          success: false,
          error: { code: 'COUPON_USER_LIMIT', message: `You have already used this coupon ${coupon.perUserLimit} time(s)` },
        });
      }
    }

    // SECURITY: Check if coupon is already applied to this cart
    if (cart.coupons.some(c => c.code === coupon.code)) {
      return res.status(400).json({
        success: false,
        error: { code: 'COUPON_ALREADY_APPLIED', message: 'This coupon is already applied to your cart' },
      });
    }

    // SECURITY: Validate coupon applicability (products, categories, vendors)
    if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
      const applicableProductIds = coupon.applicableProducts.map(p => p.toString());
      const hasApplicableProduct = cart.items.some(item =>
        applicableProductIds.includes(item.productId._id?.toString() || item.productId.toString())
      );
      if (!hasApplicableProduct) {
        return res.status(400).json({
          success: false,
          error: { code: 'COUPON_NOT_APPLICABLE', message: 'This coupon is not applicable to any product in your cart' },
        });
      }
    }

    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
      const applicableCatIds = coupon.applicableCategories.map(c => c.toString());
      const hasApplicableCategory = cart.items.some(item => {
        const productCategoryId = item.productId.categoryId?.toString();
        return productCategoryId && applicableCatIds.includes(productCategoryId);
      });
      if (!hasApplicableCategory) {
        return res.status(400).json({
          success: false,
          error: { code: 'COUPON_NOT_APPLICABLE', message: 'This coupon is not applicable to any category in your cart' },
        });
      }
    }

    if (coupon.applicableVendors && coupon.applicableVendors.length > 0) {
      const applicableVendorIds = coupon.applicableVendors.map(v => v.toString());
      const hasApplicableVendor = cart.items.some(item => {
        const productVendorId = item.productId.vendorId?.toString();
        return productVendorId && applicableVendorIds.includes(productVendorId);
      });
      if (!hasApplicableVendor) {
        return res.status(400).json({
          success: false,
          error: { code: 'COUPON_NOT_APPLICABLE', message: 'This coupon is not applicable to any vendor in your cart' },
        });
      }
    }

    // Check usage limit and increment atomically to prevent race condition
    // FIXED: Combined $or conditions properly using $and to avoid duplicate key issue
    const updatedCoupon = await Coupon.findOneAndUpdate(
      {
        code: code.toUpperCase(),
        isActive: true,
        $and: [
          { $or: [{ startDate: { $lte: now } }, { startDate: null }] },
          { $or: [{ endDate: { $gte: now } }, { endDate: null }] },
          { $or: [{ usageLimit: null }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }] }
        ],
      },
      { $inc: { usageCount: 1 } },
      { new: true }
    );

    if (!updatedCoupon) {
      return res.status(400).json({
        success: false,
        error: { code: 'COUPON_UNAVAILABLE', message: 'Coupon is not available or has reached usage limit' },
      });
    }

    // Check min order value
    if (coupon.minOrderValue && cart.totals.subtotal < coupon.minOrderValue) {
      // Rollback usage count since we're rejecting
      await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usageCount: -1 } });
      return res.status(400).json({
        success: false,
        error: { code: 'MIN_ORDER_NOT_MET', message: `Minimum order value of ₹${coupon.minOrderValue} not met` },
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (cart.totals.subtotal * coupon.value) / 100;
    } else {
      discount = coupon.value;
    }
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    cart.coupons.push({
      code: coupon.code,
      discount,
      type: coupon.type,
    });
    await cart.save(); // Pre-save hook calculates totals

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

// Remove coupon
exports.removeCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    const userId = req.user?._id;
    const guestId = userId ? null : getOrCreateGuestId(req, res);

    const query = userId ? { userId } : { guestId };

    const cart = await Cart.findOne(query);

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: { code: 'CART_NOT_FOUND', message: 'Cart not found' },
      });
    }

    cart.coupons = cart.coupons.filter(c => c.code !== code.toUpperCase());
    await cart.save(); // Pre-save hook calculates totals
    await cart.populate('items.productId');

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};
