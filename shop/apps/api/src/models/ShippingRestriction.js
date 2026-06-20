const mongoose = require('mongoose');

const shippingRestrictionSchema = new mongoose.Schema({
  type:         { type: String, enum: ['state', 'district', 'pincode'], required: true },
  stateName:    { type: String, required: true, trim: true },
  districtName: { type: String, trim: true, default: '' },
  pincode:      { type: String, trim: true, default: '' },
  isActive:     { type: Boolean, default: true },
  note:         { type: String, trim: true, default: '' },
}, { timestamps: true });

shippingRestrictionSchema.index({ type: 1, isActive: 1 });
shippingRestrictionSchema.index({ stateName: 1 });
shippingRestrictionSchema.index({ pincode: 1 });

module.exports = mongoose.model('ShippingRestriction', shippingRestrictionSchema);
