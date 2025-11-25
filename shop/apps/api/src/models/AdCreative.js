// FILE: apps/api/src/models/AdCreative.js
const mongoose = require('mongoose');

const adCreativeSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdCampaign',
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  // For banner ads
  bannerAsset: {
    imageUrl: String,
    imageAlt: String,
    clickUrl: String,
    dimensions: {
      width: Number,
      height: Number,
    },
  },
  // Placement
  placement: {
    type: String,
    enum: [
      'search_top',
      'search_grid',
      'category_top',
      'category_grid',
      'product_page',
      'homepage_banner',
      'homepage_sidebar_left',
      'homepage_sidebar_right',
      'left_sidebar',
      'right_sidebar',
      'top_banner',
      'bottom_banner',
      'category_header',
      'product_page_side',
      'product_list',
      'cart_page'
    ],
    required: true,
  },
  // Copy
  headline: String,
  description: String,
  callToAction: String,
  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'rejected'],
    default: 'active',
  },
  rejectionReason: String,
  // Stats
  stats: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
  },
  // Quality score (affects auction ranking)
  qualityScore: {
    type: Number,
    default: 5,
    min: 0,
    max: 10,
  },
}, {
  timestamps: true,
});

// Indexes
adCreativeSchema.index({ campaignId: 1 });
adCreativeSchema.index({ productId: 1 });
adCreativeSchema.index({ placement: 1 });
adCreativeSchema.index({ status: 1 });

module.exports = mongoose.model('AdCreative', adCreativeSchema);