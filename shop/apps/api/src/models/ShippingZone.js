// FILE: apps/api/src/models/ShippingZone.js
const mongoose = require('mongoose');

const shippingRateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  minWeight: {
    type: Number,
    default: 0,
  },
  maxWeight: {
    type: Number,
    default: 999999,
  },
  minOrderValue: {
    type: Number,
    default: 0,
  },
  maxOrderValue: {
    type: Number,
    default: 999999,
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },
  deliveryDays: {
    min: { type: Number, default: 3 },
    max: { type: Number, default: 7 },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const shippingZoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,

  // Geographic coverage
  countries: [{
    type: String,
    default: 'IN',
  }],
  states: [String],
  cities: [String],
  pinCodes: [String],

  // Zone type
  type: {
    type: String,
    enum: ['local', 'domestic', 'international', 'custom'],
    default: 'domestic',
  },

  // Shipping rates for this zone
  rates: [shippingRateSchema],

  // Free shipping threshold
  freeShippingThreshold: {
    type: Number,
    default: 0, // 0 means no free shipping
  },

  // Default shipping cost (if no rate matches)
  defaultRate: {
    type: Number,
    default: 50,
  },

  // Delivery time range
  deliveryTime: {
    min: { type: Number, default: 3 }, // days
    max: { type: Number, default: 7 },
  },

  // Vendor specific (optional)
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },

  // Priority for zone matching (higher = checked first)
  priority: {
    type: Number,
    default: 0,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
shippingZoneSchema.index({ countries: 1 });
shippingZoneSchema.index({ states: 1 });
shippingZoneSchema.index({ pinCodes: 1 });
shippingZoneSchema.index({ isActive: 1, priority: -1 });
shippingZoneSchema.index({ vendorId: 1 });

// Static method to find matching zone for an address
shippingZoneSchema.statics.findMatchingZone = async function(address) {
  const { country = 'IN', state, city, pinCode } = address;

  // Try to find most specific match first (pinCode > city > state > country)
  const zones = await this.find({ isActive: true })
    .sort({ priority: -1 })
    .lean();

  // Priority matching
  for (const zone of zones) {
    if (zone.pinCodes.length > 0 && pinCode && zone.pinCodes.includes(pinCode)) {
      return zone;
    }
  }

  for (const zone of zones) {
    if (zone.cities.length > 0 && city && zone.cities.includes(city)) {
      return zone;
    }
  }

  for (const zone of zones) {
    if (zone.states.length > 0 && state && zone.states.includes(state)) {
      return zone;
    }
  }

  for (const zone of zones) {
    if (zone.countries.includes(country)) {
      return zone;
    }
  }

  // Return first active zone as fallback
  return zones[0] || null;
};

// Method to calculate shipping cost
shippingZoneSchema.methods.calculateShippingCost = function(orderValue, weight = 0) {
  // Check free shipping threshold
  if (this.freeShippingThreshold > 0 && orderValue >= this.freeShippingThreshold) {
    return 0;
  }

  // Find matching rate
  const matchingRate = this.rates.find(rate =>
    rate.isActive &&
    weight >= rate.minWeight && weight <= rate.maxWeight &&
    orderValue >= rate.minOrderValue && orderValue <= rate.maxOrderValue
  );

  if (matchingRate) {
    return matchingRate.price;
  }

  return this.defaultRate;
};

module.exports = mongoose.model('ShippingZone', shippingZoneSchema);
