// FILE: apps/api/src/models/DelhiveryWarehouse.js
const mongoose = require('mongoose');

/**
 * Delhivery Warehouse Model
 * Stores registered pickup locations for shipping
 */
const delhiveryWarehouseSchema = new mongoose.Schema({
  // Internal reference
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: false, // null for admin warehouses
    index: true,
  },

  // Warehouse Details
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },

  // Contact Information
  phone: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{10}$/.test(v);
      },
      message: 'Phone must be 10 digits'
    }
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },

  // Address
  address: {
    type: String,
    required: true,
    maxlength: 500,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
    default: 'India',
  },
  pincode: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{6}$/.test(v);
      },
      message: 'Pincode must be 6 digits'
    }
  },

  // Delhivery Integration
  delhiveryWarehouseId: {
    type: String,
    sparse: true, // Unique but allows null
  },
  registeredAt: {
    type: Date,
  },

  // Waybill Management
  waybills: {
    prefetched: [{
      waybill: String,
      fetchedAt: Date,
      usedAt: Date,
      usedForOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    }],
    lastFetchedAt: Date,
    availableCount: {
      type: Number,
      default: 0,
    },
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending_verification'],
    default: 'pending_verification',
  },

  // Metadata
  isDefault: {
    type: Boolean,
    default: false,
  },
  returnAddress: {
    type: Boolean,
    default: true, // Can be used as return address
  },

}, { timestamps: true });

// Indexes
delhiveryWarehouseSchema.index({ vendorId: 1, status: 1 });
delhiveryWarehouseSchema.index({ pincode: 1 });
delhiveryWarehouseSchema.index({ 'waybills.prefetched.waybill': 1 }, { sparse: true });

// Method: Get available waybill
delhiveryWarehouseSchema.methods.getAvailableWaybill = function() {
  const unused = this.waybills.prefetched.find(w => !w.usedAt);
  return unused ? unused.waybill : null;
};

// Method: Mark waybill as used
delhiveryWarehouseSchema.methods.markWaybillUsed = function(waybill, orderId) {
  const waybillDoc = this.waybills.prefetched.find(w => w.waybill === waybill);
  if (waybillDoc) {
    waybillDoc.usedAt = new Date();
    waybillDoc.usedForOrderId = orderId;
    this.waybills.availableCount = this.waybills.prefetched.filter(w => !w.usedAt).length;
  }
};

module.exports = mongoose.model('DelhiveryWarehouse', delhiveryWarehouseSchema);
