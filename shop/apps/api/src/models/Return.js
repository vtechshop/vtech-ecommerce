// FILE: apps/api/src/models/Return.js
const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
    },
    images: [String],
  }],
  rma: {
    type: String,
    unique: true,
    required: true,
  },
  status: {
    type: String,
    enum: ['requested', 'approved', 'rejected', 'received', 'refunded'],
    default: 'requested',
  },
  reason: String,
  rejectionReason: String,
  refund: {
    amount: Number,
    method: String,
    transactionId: String,
    processedAt: Date,
  },
  pickupScheduled: Date,
  events: [{
    status: String,
    description: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Indexes
returnSchema.index({ orderId: 1 });
returnSchema.index({ userId: 1 });
// Note: rma index is created by unique: true in schema
returnSchema.index({ status: 1 });

module.exports = mongoose.model('Return', returnSchema);