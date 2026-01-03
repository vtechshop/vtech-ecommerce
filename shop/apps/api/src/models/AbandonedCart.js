// FILE: apps/api/src/models/AbandonedCart.js
const mongoose = require('mongoose');

const abandonedCartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  sessionId: {
    type: String,
    index: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: Number,
    variantId: String,
  }],
  total: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'recovered', 'expired', 'converted'],
    default: 'active',
    index: true,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
    index: true,
  },
  recoveryAttempts: {
    type: Number,
    default: 0,
  },
  recoveryEmails: [{
    sentAt: Date,
    type: {
      type: String,
      enum: ['first_reminder', 'second_reminder', 'final_offer'],
    },
    opened: { type: Boolean, default: false },
    clicked: { type: Boolean, default: false },
  }],
  recoveredAt: Date,
  convertedOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  metadata: {
    ip: String,
    userAgent: String,
    source: String, // 'web', 'mobile', 'app'
    couponOffered: String,
  },
}, { timestamps: true });

// Indexes
abandonedCartSchema.index({ user: 1, status: 1 });
abandonedCartSchema.index({ email: 1, status: 1 });
abandonedCartSchema.index({ lastActivityAt: -1 });
abandonedCartSchema.index({ expiresAt: 1 }, { sparse: true });

// TTL index - auto-delete expired carts after 90 days
abandonedCartSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Method to check if cart is stale (no activity for 1 hour)
abandonedCartSchema.methods.isStale = function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return this.lastActivityAt < oneHourAgo && this.status === 'active';
};

// Method to check if eligible for recovery email
abandonedCartSchema.methods.canSendRecoveryEmail = function() {
  if (this.status !== 'active') return false;
  if (this.recoveryAttempts >= 3) return false; // Max 3 attempts
  if (!this.email) return false;

  const lastEmail = this.recoveryEmails[this.recoveryEmails.length - 1];
  if (!lastEmail) return true;

  // Wait at least 24 hours between emails
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return lastEmail.sentAt < oneDayAgo;
};

module.exports = mongoose.model('AbandonedCart', abandonedCartSchema);
