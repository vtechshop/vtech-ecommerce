// FILE: apps/api/src/models/Cart.js
const mongoose = require('mongoose');

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

  // Get tax rate from environment or default to 18% GST (India)
  const taxRate = parseFloat(process.env.DEFAULT_TAX_RATE || '0.18');
  this.totals.tax = this.totals.subtotal * taxRate;
  this.totals.discount = this.coupons.reduce((sum, coupon) => sum + coupon.discount, 0);
  this.totals.total = this.totals.subtotal + this.totals.tax + this.totals.shipping - this.totals.discount;

  return this.totals;
};

module.exports = mongoose.model('Cart', cartSchema);