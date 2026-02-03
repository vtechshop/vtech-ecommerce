// FILE: apps/api/src/models/Cart.js
const mongoose = require('mongoose');
const env = require('../config/env');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  guestId: {
    type: String,
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: String,
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    priceSnapshot: Number,
    name: String,
    image: String,
    productSlug: String,
    variantName: String,
    taxIncluded: { type: Boolean, default: false },
    taxable: { type: Boolean, default: false },
    taxRate: { type: Number, default: 0 },
  }],
  totals: {
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    shipping: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  coupons: {
    type: [{
      code: { type: String },
      discount: { type: Number },
      type: { type: String },
    }],
    default: [],
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
}, {
  timestamps: true,
});

// Indexes - sparse allows null values
cartSchema.index({ userId: 1 }, { sparse: true });
cartSchema.index({ guestId: 1 }, { sparse: true });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
cartSchema.methods.calculateTotals = function() {
  this.totals.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.priceSnapshot * item.qty);
  }, 0);

  // Calculate tax based on item tax settings
  this.totals.tax = this.items.reduce((sum, item) => {
    // Skip if tax is already included in price
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

  // Shipping is included in product price (no separate shipping charge)
  // Platform fee/commission is handled internally when paying vendors
  this.totals.shipping = 0;

  this.totals.discount = this.coupons.reduce((sum, coupon) => sum + coupon.discount, 0);

  // SECURITY: Ensure discount never exceeds order value (prevents negative totals)
  const maxDiscount = this.totals.subtotal + this.totals.tax + this.totals.shipping;
  this.totals.discount = Math.min(this.totals.discount, maxDiscount);

  // Calculate total (guaranteed non-negative due to discount cap above)
  this.totals.total = Math.max(0, this.totals.subtotal + this.totals.tax + this.totals.shipping - this.totals.discount);

  return this.totals;
};

// Auto-calculate totals before saving
cartSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

module.exports = mongoose.model('Cart', cartSchema);