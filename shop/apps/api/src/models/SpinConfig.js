// FILE: apps/api/src/models/SpinConfig.js
const mongoose = require('mongoose');

const spinConfigSchema = new mongoose.Schema({
  segments: [{
    label: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['discount', 'points', 'no_prize'],
      default: 'discount',
    },
    probability: {
      type: Number,
      required: true,
    },
  }],
  dailySpinsAllowed: {
    type: Number,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('SpinConfig', spinConfigSchema);
