// FILE: apps/api/src/models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: String,
  comment: String,
  images: [String],
  // Verification
  verified: {
    type: Boolean,
    default: false,
  },
  // Moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: String,
  // Helpfulness
  helpfulCount: {
    type: Number,
    default: 0,
  },
  unhelpfulCount: {
    type: Number,
    default: 0,
  },
  // Response from vendor
  vendorResponse: {
    text: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
}, {
  timestamps: true,
});

// Indexes
reviewSchema.index({ productId: 1, status: 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ createdAt: -1 });

// Compound index for uniqueness (one review per user per product)
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);