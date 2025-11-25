// FILE: apps/api/src/models/AffiliateLink.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const affiliateLinkSchema = new mongoose.Schema({
  affiliateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Affiliate',
    required: true,
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false, // null means general/store-wide link
    index: true,
  },
  linkCode: {
    type: String,
    required: true,
    unique: true, // This already creates a unique index, no need for 'index: true'
  },
  // URL generated for this link
  url: {
    type: String,
    required: true,
  },
  // Custom commission rate for this specific product (overrides default)
  customCommissionRate: {
    type: Number,
    min: 0,
    max: 100,
  },
  // Stats
  clicks: {
    type: Number,
    default: 0,
  },
  conversions: {
    type: Number,
    default: 0,
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  // Metadata
  notes: String,
  tags: [String],
}, {
  timestamps: true,
});

// Indexes
affiliateLinkSchema.index({ affiliateId: 1, productId: 1 });
// linkCode already has unique index from schema definition, no need to duplicate

// Static method to generate unique link code
affiliateLinkSchema.statics.generateLinkCode = async function() {
  let linkCode;
  let exists = true;

  while (exists) {
    linkCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    exists = await this.findOne({ linkCode });
  }

  return linkCode;
};

module.exports = mongoose.model('AffiliateLink', affiliateLinkSchema);
