// FILE: apps/api/src/models/WebhookEvent.js
const mongoose = require('mongoose');

// Model to track processed webhook events - prevents replay attacks
const webhookEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    unique: true,
    required: true,
    index: true,
  },
  provider: {
    type: String,
    enum: ['stripe', 'razorpay'],
    required: true,
  },
  eventType: String,
  processedAt: {
    type: Date,
    default: Date.now,
    // Note: index created by TTL index below
  },
  orderId: String,
  payload: mongoose.Schema.Types.Mixed, // Store full webhook payload for debugging
}, { timestamps: true });

// TTL index - auto-delete webhook events older than 7 days (604800 seconds)
webhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 604800 });

// Compound index for quick provider+eventId lookups
webhookEventSchema.index({ provider: 1, eventId: 1 });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
