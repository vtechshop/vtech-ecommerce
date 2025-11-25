// FILE: apps/api/src/models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  description: String,
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
  minOrderValue: Number,
  maxDiscount: Number,
  // Restrictions
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  applicableVendors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  }],
  // Usage limits
  usageLimit: Number,
  usageCount: {
    type: Number,
    default: 0,
  },
  perUserLimit: Number,
  // Dates
  startDate: Date,
  endDate: Date,
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
couponSchema.index({ isActive: 1 });
couponSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Coupon', couponSchema);