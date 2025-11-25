// FILE: apps/api/src/models/SearchHistory.js
const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sessionId: {
    type: String, // For guest users
  },
  query: {
    type: String,
    required: true,
    trim: true,
  },
  filters: {
    category: String,
    minPrice: Number,
    maxPrice: Number,
    brand: String,
    rating: Number,
  },
  resultsCount: {
    type: Number,
    default: 0,
  },
  clickedProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    clickedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // Track if the search led to a purchase
  convertedToPurchase: {
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
searchHistorySchema.index({ userId: 1, createdAt: -1 });
searchHistorySchema.index({ sessionId: 1, createdAt: -1 });
searchHistorySchema.index({ query: 1 });
searchHistorySchema.index({ 'clickedProducts.productId': 1 });
searchHistorySchema.index({ createdAt: -1 });

// Text index for search queries
searchHistorySchema.index({ query: 'text' });

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
