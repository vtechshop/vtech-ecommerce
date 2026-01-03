// FILE: apps/api/src/models/LoyaltyPoints.js
const mongoose = require('mongoose');

const loyaltyPointsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  totalPoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  availablePoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  usedPoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  lifetimePoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze',
  },
  tierProgress: {
    currentTierPoints: { type: Number, default: 0 },
    nextTierPoints: { type: Number, default: 500 },
    nextTier: { type: String, default: 'silver' },
  },
}, { timestamps: true });

// Compound index for user queries
loyaltyPointsSchema.index({ user: 1, totalPoints: -1 });

// Tier calculation method
loyaltyPointsSchema.methods.calculateTier = function() {
  const points = this.lifetimePoints;

  if (points >= 10000) {
    this.tier = 'diamond';
    this.tierProgress.nextTier = null;
    this.tierProgress.nextTierPoints = null;
  } else if (points >= 5000) {
    this.tier = 'platinum';
    this.tierProgress.currentTierPoints = points - 5000;
    this.tierProgress.nextTierPoints = 10000;
    this.tierProgress.nextTier = 'diamond';
  } else if (points >= 2000) {
    this.tier = 'gold';
    this.tierProgress.currentTierPoints = points - 2000;
    this.tierProgress.nextTierPoints = 5000;
    this.tierProgress.nextTier = 'platinum';
  } else if (points >= 500) {
    this.tier = 'silver';
    this.tierProgress.currentTierPoints = points - 500;
    this.tierProgress.nextTierPoints = 2000;
    this.tierProgress.nextTier = 'gold';
  } else {
    this.tier = 'bronze';
    this.tierProgress.currentTierPoints = points;
    this.tierProgress.nextTierPoints = 500;
    this.tierProgress.nextTier = 'silver';
  }

  return this.tier;
};

module.exports = mongoose.model('LoyaltyPoints', loyaltyPointsSchema);
