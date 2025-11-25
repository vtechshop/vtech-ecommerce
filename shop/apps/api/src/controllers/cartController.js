const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Helper function to get or create guest ID
const getOrCreateGuestId = (req, res) => {
  let guestId = req.cookies.guestId || req.sessionID;

  if (!guestId) {
    // Generate a new guest ID using timestamp + random string
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Set cookie for 30 days
    res.cookie('guestId', guestId, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    });
  }

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

    // Validate productId
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRODUCT_ID',
          message: 'Product ID is required',
        },
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Not enough stock available',
        },
      });
    }

    const query = userId ? { userId } : { guestId };

    let cart = await Cart.findOne(query);

    if (!cart) {
      cart = new Cart(query);
    }

    // Use atomic operations to prevent race conditions
    // Try to increment existing item first
    const updatedCart = await Cart.findOneAndUpdate(
      {
        ...query,
        'items.productId': productId,
        'items.variantId': variantId || null,
      },
      {
        $inc: { 'items.$.qty': quantity },
      },
      { new: true }
    );

    if (updatedCart) {
      // Item existed and was updated
      updatedCart.calculateTotals();
      await updatedCart.save();
      await updatedCart.populate('items.productId');
      cart = updatedCart;
    } else {
      // Item doesn't exist, add it
      cart = await Cart.findOneAndUpdate(
        query,
        {
          $push: {
            items: {
              productId: productId,
              qty: quantity,
              variantId: variantId || null,
              priceSnapshot: product.price,
              name: product.title,
              image: product.images?.[0] || null,
              productSlug: product.slug,
            },
          },
        },
        { new: true, upsert: true }
      );

      cart.calculateTotals();
      await cart.save();
      await cart.populate('items.productId');
    }

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

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be a positive integer',
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
    const variant = item.variantId ? product.variants.id(item.variantId) : null;
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
    cart.calculateTotals();
    await cart.save();
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
    cart.calculateTotals();
    await cart.save();
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

    const Coupon = require('../models/Coupon');
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

    // Check usage limit and increment atomically to prevent race condition
    const Coupon = require('../models/Coupon');
    const updatedCoupon = await Coupon.findOneAndUpdate(
      {
        code: code.toUpperCase(),
        isActive: true,
        startDate: { $lte: now },
        $or: [
          { endDate: { $gte: now } },
          { endDate: null }
        ],
        $or: [
          { usageLimit: null },
          { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
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

    // Old check - replaced by atomic operation above
    /*if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        error: { code: 'COUPON_EXHAUSTED', message: 'Coupon usage limit reached' },
      });
    }

    // Check min order value
    if (coupon.minOrderValue && cart.totals.subtotal < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        error: { code: 'MIN_ORDER_NOT_MET', message: 'Minimum order value not met' },
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
    cart.calculateTotals();
    await cart.save();

    // Usage count already incremented atomically above - no need to save again

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
    cart.calculateTotals();
    await cart.save();
    await cart.populate('items.productId');

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};
