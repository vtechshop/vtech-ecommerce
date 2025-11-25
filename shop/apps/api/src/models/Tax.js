// FILE: apps/api/src/models/Tax.js
const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage',
  },
  countries: [String],
  states: [String],
  zipCodes: [String],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  }],
  // GST Components (for India)
  gstComponents: {
    cgst: {
      type: Number,
      min: 0,
      max: 100,
    },
    sgst: {
      type: Number,
      min: 0,
      max: 100,
    },
    utgst: {
      type: Number,
      min: 0,
      max: 100,
    },
    igst: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes - Cannot create compound index on two array fields
// Create separate indexes instead
taxSchema.index({ countries: 1 });
taxSchema.index({ states: 1 });
taxSchema.index({ isActive: 1 });

module.exports = mongoose.model('Tax', taxSchema);