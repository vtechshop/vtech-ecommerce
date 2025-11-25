// FILE: apps/api/src/models/AdCampaign.js
const mongoose = require('mongoose');

const adCampaignSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['SponsoredProduct', 'SponsoredBrand', 'Banner'],
    required: true,
  },
  // Targeting
  targeting: {
    keywords: [{
      keyword: String,
      matchType: {
        type: String,
        enum: ['exact', 'phrase', 'broad'],
        default: 'broad',
      },
    }],
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    }],
    products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    }],
    negativeKeywords: [String],
    // Geo & Device
    geoTargeting: {
      countries: [String],
      states: [String],
      cities: [String],
    },
    deviceTargeting: {
      desktop: { type: Boolean, default: true },
      mobile: { type: Boolean, default: true },
      tablet: { type: Boolean, default: true },
    },
  },
  // Banner Image (for sponsored ads)
  bannerImage: {
    type: String,
    trim: true,
  },
  // Page/Placement where ad appears (NEW - for identifying which page)
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
      // Category Pages
      'category_top_banner',
      'category_sidebar',
      'category_grid',
      // Search & Results
      'search_sponsored_products',
      'search_top',
      'search_sidebar',
      // Cart & Checkout
      'cart_sidebar',
      'cart_bottom',
      'checkout_top',
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
    default: 'homepage_banner',
  },
  // Banner Position (for banner ads)
  position: {
    type: String,
    enum: ['top', 'right', 'bottom', 'left', 'center', 'top-right', 'top-left', 'bottom-right', 'bottom-left'],
    default: 'top',
  },
  // Banner Size/Type (for banner ads)
  bannerSize: {
    type: String,
    enum: ['hero', 'side-small', 'side-large', 'rectangle', 'leaderboard', 'skyscraper', 'square', 'custom'],
    default: 'hero',
  },
  // Banner Dimensions (optional - for custom sizes)
  dimensions: {
    width: Number,
    height: Number,
  },
  // Pricing
  pricing: {
    type: String,
    enum: ['CPC', 'CPM'],
    required: true,
  },
  bid: {
    type: Number,
    required: true,
    min: 0,
  },
  dailyBudget: {
    type: Number,
    required: true,
    min: 0,
  },
  totalBudget: Number,
  // Schedule
  startAt: {
    type: Date,
    required: true,
  },
  endAt: Date,
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'budget_exhausted'],
    default: 'draft',
  },
  // Stats
  stats: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    lastUpdated: Date,
  },
  // Daily spend tracking
  dailySpend: {
    date: Date,
    amount: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

// Indexes
adCampaignSchema.index({ vendorId: 1 });
adCampaignSchema.index({ status: 1 });
adCampaignSchema.index({ type: 1 });
adCampaignSchema.index({ 'targeting.keywords.keyword': 1 });
adCampaignSchema.index({ 'targeting.categories': 1 });
adCampaignSchema.index({ startAt: 1, endAt: 1 });

// Methods
adCampaignSchema.methods.canServe = function() {
  const now = new Date();
  
  // Check status
  if (this.status !== 'active') return false;
  
  // Check dates
  if (this.startAt > now) return false;
  if (this.endAt && this.endAt < now) return false;
  
  // Check budget
  if (this.dailySpend.amount >= this.dailyBudget) return false;
  if (this.totalBudget && this.stats.spend >= this.totalBudget) return false;
  
  return true;
};

module.exports = mongoose.model('AdCampaign', adCampaignSchema);