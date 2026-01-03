// FILE: apps/api/src/models/LoyaltyTransaction.js
const mongoose = require('mongoose');

const loyaltyTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['earned', 'redeemed', 'expired', 'refunded', 'bonus', 'penalty'],
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    enum: [
      'purchase',          // Points earned from order
      'signup_bonus',      // Welcome bonus
      'referral',          // Referred a friend
      'review',            // Wrote a product review
      'birthday',          // Birthday bonus
      'tier_bonus',        // Tier upgrade bonus
      'redemption',        // Points redeemed for discount
      'order_cancelled',   // Points refunded from cancelled order
      'expiration',        // Points expired
      'admin_adjustment',  // Manual admin adjustment
      'promotion',         // Special promotion
      'social_share',      // Shared on social media
    ],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  relatedReview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
  },
  balanceBefore: {
    type: Number,
    required: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  expiresAt: {
    type: Date,
    // Points expire after 1 year for earned points
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    // Store additional context (e.g., order amount, tier at time, etc.)
  },
}, { timestamps: true });

// Indexes for efficient queries
loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ expiresAt: 1 }, { sparse: true });
loyaltyTransactionSchema.index({ type: 1, reason: 1 });

// TTL index for auto-deletion of very old transactions (keep for 3 years)
loyaltyTransactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 94608000 }); // 3 years

module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
