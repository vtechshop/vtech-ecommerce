// FILE: apps/api/src/models/WebhookEvent.js
const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true }, // x-razorpay-event-id header value
  event: { type: String, required: true },   // e.g. "payment.captured"
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'dead'],
    default: 'pending',
  },
  attemptCount: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  claimedAt: { type: Date },
  claimedBy: { type: String }, // hostname-pid of the worker instance that claimed this event
  lastError: { type: String },
  nextRetryAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

// Idempotency: one document per Razorpay event ID
webhookEventSchema.index({ eventId: 1 }, { unique: true });
// Worker polling: find pending/failed events that are due for processing
webhookEventSchema.index({ status: 1, nextRetryAt: 1, createdAt: 1 });
// Stall recovery: find processing events that have been claimed too long
webhookEventSchema.index({ status: 1, claimedAt: 1 });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
