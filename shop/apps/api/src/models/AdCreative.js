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
      // Homepage
      'homepage_banner',
      'homepage_sidebar_left',
      'homepage_sidebar_right',
      'homepage_top',
      'homepage_middle',
      'homepage_bottom',
      // Product Pages
      'product_sidebar',
      'product_top',
      'product_bottom',
      'product_related',
      'product_page',
      'product_page_side',
      // Category Pages
      'category_top_banner',
      'category_sidebar',
      'category_grid',
      'category_top',
      'category_header',
      // Search & Results
      'search_sponsored_products',
      'search_top',
      'search_sidebar',
      'search_grid',
      // Cart & Checkout
      'cart_sidebar',
      'cart_bottom',
      'cart_page',
      'checkout_top',
      // Generic
      'left_sidebar',
      'right_sidebar',
      'top_banner',
      'bottom_banner',
      'product_list',
      // Blog
      'blog_sidebar',
      'blog_top',
      'blog_in_content',
      'blog_bottom',
      // User Account
      'account_dashboard',
      'account_orders',
      'account_profile',
      // Vendor Pages
      'vendor_store',
      'vendor_list',
      // Other Pages
      'about_us',
      'contact_us',
      'faq',
      'terms',
      'privacy'
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