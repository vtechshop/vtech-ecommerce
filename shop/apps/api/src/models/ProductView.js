// FILE: apps/api/src/models/ProductView.js
const mongoose = require('mongoose');

const productViewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  sessionId: {
    type: String, // For guest users
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  duration: {
    type: Number, // Time spent viewing in seconds
    default: 0,
  },
  // Source of the view
  source: {
    type: String,
    enum: ['search', 'category', 'recommendation', 'direct', 'banner-ad', 'sponsored', 'related'],
    default: 'direct',
  },
  searchQuery: String, // If came from search
  // Interaction metrics
  addedToCart: {
    type: Boolean,
    default: false,
  },
  addedToWishlist: {
    type: Boolean,
    default: false,
  },
  purchased: {
    type: Boolean,
    default: false,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
}, {
  timestamps: true,
});

// Indexes
productViewSchema.index({ userId: 1, createdAt: -1 });
productViewSchema.index({ sessionId: 1, createdAt: -1 });
productViewSchema.index({ productId: 1, createdAt: -1 });
productViewSchema.index({ userId: 1, productId: 1 });

module.exports = mongoose.model('ProductView', productViewSchema);
