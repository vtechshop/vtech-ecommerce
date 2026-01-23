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

  // Tax is included in product price (Indian MRP style)
  // No separate tax calculation - product price = final price
  this.totals.tax = 0;

  // Shipping is included in product price (no separate shipping charge)
  // Platform fee/commission is handled internally when paying vendors
  this.totals.shipping = 0;

  this.totals.discount = this.coupons.reduce((sum, coupon) => sum + coupon.discount, 0);
  this.totals.total = this.totals.subtotal + this.totals.tax + this.totals.shipping - this.totals.discount;

  return this.totals;
};

// Auto-calculate totals before saving
cartSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

module.exports = mongoose.model('Cart', cartSchema);