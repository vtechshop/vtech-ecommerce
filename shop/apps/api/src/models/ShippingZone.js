// FILE: apps/api/src/models/ShippingZone.js
const mongoose = require('mongoose');

const shippingZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  countries: [String],
  states: [String],
  zipCodes: [String],
  methods: [{
    name: String,
    carrier: String,
    cost: Number,
    freeShippingThreshold: Number,
    estimatedDays: {
      min: Number,
      max: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
shippingZoneSchema.index({ countries: 1 });
shippingZoneSchema.index({ isActive: 1 });

module.exports = mongoose.model('ShippingZone', shippingZoneSchema);