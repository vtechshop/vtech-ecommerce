// FILE: apps/api/src/models/SpinHistory.js
const mongoose = require('mongoose');

const spinHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  prize: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    enum: ['discount', 'points', 'no_prize'],
  },
  couponCode: {
    type: String,
  },
  spunAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for checking daily spin limit
spinHistorySchema.index({ user: 1, spunAt: -1 });

module.exports = mongoose.model('SpinHistory', spinHistorySchema);
