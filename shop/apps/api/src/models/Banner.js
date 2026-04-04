// FILE: apps/api/src/models/Banner.js
const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    default: '',
    trim: true,
  },
  subtitle: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    required: [true, 'Banner image is required'],
  },
  link: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  imagePosition: {
    type: String,
    default: '50',  // vertical % — '0' = top, '50' = center, '100' = bottom
  },
  platform: {
    type: String,
    enum: ['website', 'mobile', 'both'],
    default: 'website', // 'website' = web only, 'mobile' = mobile app only, 'both' = everywhere
  },
}, { timestamps: true });

// Indexes
bannerSchema.index({ isActive: 1, order: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
