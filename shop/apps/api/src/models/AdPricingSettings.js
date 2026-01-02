// FILE: apps/api/src/models/AdPricingSettings.js
const mongoose = require('mongoose');

const adPricingSettingsSchema = new mongoose.Schema(
  {
    placement: {
      type: String,
      required: true,
      unique: true,
      enum: [
        // Homepage placements
        'homepage_banner',
        'homepage_sidebar_left',
        'homepage_sidebar_right',
        'homepage_middle',
        'homepage_bottom',
        // Search & Category placements
        'search_sponsored_products',
        'search_top',
        'category_top_banner',
        'category_grid',
        'category_sidebar',
        // Product page placements
        'product_sidebar',
        'product_top',
        'product_bottom',
        'product_related',
        // Blog placements
        'blog_top',
        'blog_sidebar',
        'blog_in_content',
        'blog_bottom',
      ],
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    pricingType: {
      type: String,
      enum: ['CPC', 'CPM', 'CPA'],
      required: true,
      default: 'CPC',
    },
    minBid: {
      type: Number,
      required: true,
      min: 0,
    },
    maxBid: {
      type: Number,
      required: true,
      min: 0,
    },
    recommendedBid: {
      type: Number,
      required: true,
      min: 0,
    },
    floorPrice: {
      type: Number,
      required: true,
      min: 0,
      comment: 'Minimum bid to participate in auction',
    },
    dailyBudgetMin: {
      type: Number,
      required: true,
      min: 0,
      default: 500,
    },
    // Quality score settings
    qualityScoreEnabled: {
      type: Boolean,
      default: true,
    },
    qualityScoreWeights: {
      ctr: { type: Number, default: 0.4, min: 0, max: 1 }, // Click-through rate weight
      conversionRate: { type: Number, default: 0.3, min: 0, max: 1 },
      productRating: { type: Number, default: 0.3, min: 0, max: 1 },
    },
    // Auction settings
    auctionType: {
      type: String,
      enum: ['first_price', 'second_price'],
      default: 'second_price',
      comment: 'First price: pay your bid, Second price: pay slightly more than 2nd highest bid',
    },
    // Admin controls
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    autoApproveThreshold: {
      type: Number,
      comment: 'Auto-approve campaigns with quality score above this threshold',
    },
    maxCampaignsPerVendor: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient lookups
adPricingSettingsSchema.index({ placement: 1, status: 1 });

// Method to check if bid is within allowed range
adPricingSettingsSchema.methods.isValidBid = function (bid) {
  return bid >= this.minBid && bid <= this.maxBid && bid >= this.floorPrice;
};

// Method to get bid recommendation message
adPricingSettingsSchema.methods.getBidRecommendation = function (bid) {
  if (bid < this.minBid) {
    return {
      valid: false,
      message: `Minimum bid for this placement is ₹${this.minBid}`,
      suggestion: this.recommendedBid,
    };
  }
  if (bid > this.maxBid) {
    return {
      valid: false,
      message: `Maximum bid for this placement is ₹${this.maxBid}`,
      suggestion: this.recommendedBid,
    };
  }
  if (bid < this.floorPrice) {
    return {
      valid: false,
      message: `Minimum bid to participate in auction is ₹${this.floorPrice}`,
      suggestion: this.floorPrice,
    };
  }
  if (bid < this.recommendedBid) {
    return {
      valid: true,
      message: `Your bid is below the recommended amount. Consider bidding ₹${this.recommendedBid} for better visibility.`,
      level: 'warning',
    };
  }
  return {
    valid: true,
    message: 'Your bid is competitive',
    level: 'success',
  };
};

const AdPricingSettings = mongoose.model('AdPricingSettings', adPricingSettingsSchema);

module.exports = AdPricingSettings;
