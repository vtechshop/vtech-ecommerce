// FILE: apps/api/src/models/Banner.js
const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  linkUrl: String,
  altText: String,
  placement: {
    type: String,
    enum: ['homepage_hero', 'homepage_banner', 'category_top', 'sidebar'],
    required: true,
  },
  position: {
    type: Number,
    default: 0,
  },
  // Schedule
  startDate: Date,
  endDate: Date,
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  // Stats
  impressions: {
    type: Number,
    default: 0,
  },
  clicks: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
bannerSchema.index({ placement: 1, isActive: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });
bannerSchema.index({ position: 1 });

module.exports = mongoose.model('Banner', bannerSchema);