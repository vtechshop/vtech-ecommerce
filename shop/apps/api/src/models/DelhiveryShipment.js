// FILE: apps/api/src/models/DelhiveryShipment.js
const mongoose = require('mongoose');

/**
 * Delhivery Shipment Model
 * Tracks all shipments created through Delhivery
 */
const delhiveryShipmentSchema = new mongoose.Schema({
  // Internal References
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DelhiveryWarehouse',
    required: true,
  },

  // Delhivery Identifiers
  waybill: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  referenceId: {
    type: String, // Our internal reference (orderId string)
    index: true,
  },

  // Shipment Type
  type: {
    type: String,
    enum: ['forward', 'reverse'],
    required: true,
  },
  paymentMode: {
    type: String,
    enum: ['Prepaid', 'COD', 'Pickup'],
    required: true,
  },

  // Package Details
  package: {
    weight: Number, // in grams
    length: Number, // in cm
    breadth: Number,
    height: Number,
    quantity: {
      type: Number,
      default: 1,
    },
  },

  // Customer Details (from order)
  customer: {
    name: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    country: String,
  },

  // Pickup Details
  pickup: {
    location: String, // Warehouse name
    requestId: String, // Pickup request ID from Delhivery
    scheduledDate: Date,
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'picked', 'failed'],
      default: 'pending',
    },
  },

  // Shipment Status
  status: {
    type: String,
    enum: [
      'created',          // Shipment created, awaiting pickup
      'manifested',       // Included in manifest
      'in_transit',       // In transit
      'out_for_delivery', // Out for delivery
      'delivered',        // Successfully delivered
      'ndr',              // Non-delivery report
      'rto',              // Return to origin
      'lost',             // Lost in transit
      'damaged',          // Damaged
      'cancelled',        // Cancelled
    ],
    default: 'created',
  },

  // Tracking Information
  tracking: {
    lastSynced: Date,
    scans: [{
      status: String,
      location: String,
      timestamp: Date,
      instructions: String,
      scanType: String,
    }],
    currentLocation: String,
    estimatedDelivery: Date,
  },

  // NDR (Non-Delivery Report)
  ndr: {
    raised: {
      type: Boolean,
      default: false,
    },
    reason: String,
    raisedAt: Date,
    action: {
      type: String,
      enum: ['re_attempt', 'rto', 'deferred_delivery'],
    },
    actionTakenAt: Date,
    deferredDate: Date,
  },

  // Shipping Label
  label: {
    url: String,
    generatedAt: Date,
    downloaded: Boolean,
  },

  // Shipping Charges
  charges: {
    estimated: Number,
    actual: Number,
    currency: {
      type: String,
      default: 'INR',
    },
    breakdown: {
      baseCharge: Number,
      fuelSurcharge: Number,
      codCharges: Number,
      gst: Number,
    },
  },

  // COD Details (if applicable)
  cod: {
    amount: Number,
    remittanceStatus: {
      type: String,
      enum: ['pending', 'in_process', 'remitted'],
    },
    remittedAmount: Number,
    remittedDate: Date,
  },

  // API Response Data
  apiResponses: {
    creation: mongoose.Schema.Types.Mixed,
    tracking: mongoose.Schema.Types.Mixed,
    pickup: mongoose.Schema.Types.Mixed,
    ndr: mongoose.Schema.Types.Mixed,
  },

  // Retry Logic
  retries: {
    creation: {
      type: Number,
      default: 0,
    },
    pickup: {
      type: Number,
      default: 0,
    },
    tracking: {
      type: Number,
      default: 0,
    },
  },

  // Error Tracking
  errors: [{
    type: String,
    message: String,
    timestamp: Date,
    api: String, // Which API call failed
  }],

}, { timestamps: true });

// Indexes for performance
delhiveryShipmentSchema.index({ orderId: 1, type: 1 });
delhiveryShipmentSchema.index({ status: 1, createdAt: -1 });
delhiveryShipmentSchema.index({ 'customer.pincode': 1 });
delhiveryShipmentSchema.index({ 'pickup.scheduledDate': 1 });
delhiveryShipmentSchema.index({ 'tracking.lastSynced': 1 });

// Virtual: Is shipment in final state
delhiveryShipmentSchema.virtual('isFinalState').get(function() {
  return ['delivered', 'rto', 'lost', 'damaged', 'cancelled'].includes(this.status);
});

// Method: Update tracking from Delhivery response
delhiveryShipmentSchema.methods.updateTracking = function(trackingData) {
  this.tracking.lastSynced = new Date();

  if (trackingData.Scans) {
    this.tracking.scans = trackingData.Scans.map(scan => ({
      status: scan.ScanDetail?.Scan || scan.Status,
      location: scan.ScanDetail?.ScannedLocation || '',
      timestamp: new Date(scan.ScanDetail?.ScanDateTime || scan.StatusDateTime),
      instructions: scan.ScanDetail?.Instructions || '',
      scanType: scan.ScanType,
    }));
  }

  // Update current location
  const lastScan = this.tracking.scans[this.tracking.scans.length - 1];
  if (lastScan) {
    this.tracking.currentLocation = lastScan.location;
  }

  // Map Delhivery status to our status
  if (trackingData.Status) {
    this.status = this.mapDelhiveryStatus(trackingData.Status);
  }
};

// Method: Map Delhivery status to our enum
delhiveryShipmentSchema.methods.mapDelhiveryStatus = function(delhiveryStatus) {
  const statusMap = {
    'Pending': 'created',
    'Manifested': 'manifested',
    'In Transit': 'in_transit',
    'Out for Delivery': 'out_for_delivery',
    'Delivered': 'delivered',
    'RTO': 'rto',
    'Lost': 'lost',
    'Damaged': 'damaged',
    'Cancelled': 'cancelled',
  };

  return statusMap[delhiveryStatus] || this.status;
};

// Method: Add error
delhiveryShipmentSchema.methods.addError = function(api, message, type = 'API_ERROR') {
  this.errors.push({
    type,
    message,
    api,
    timestamp: new Date(),
  });
};

module.exports = mongoose.model('DelhiveryShipment', delhiveryShipmentSchema);
