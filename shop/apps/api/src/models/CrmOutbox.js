// FILE: apps/api/src/models/CrmOutbox.js
const mongoose = require('mongoose');

// Order events waiting to be delivered to the VTECH WhatsApp CRM.
// A row is written after an order's own save has succeeded; a background worker
// (jobs/crmOutboxWorker.js) delivers it. Nothing in the checkout or payment flow
// waits for, or depends on, that delivery.
const crmOutboxSchema = new mongoose.Schema({
  // "<order _id>:<event type>" — one row per order and event, whichever code path records it first
  eventId: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['order.confirmed', 'order.shipped', 'order.delivered', 'order.cancelled'],
  },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'dead'],
    default: 'pending',
  },
  attemptCount: { type: Number, default: 0 },
  claimedAt: { type: Date },
  claimedBy: { type: String },
  lastError: { type: String },
  nextRetryAt: { type: Date },
  sentAt: { type: Date },
}, { timestamps: true });

// Idempotency: duplicate payment webhooks and checkout retries collapse into one row
crmOutboxSchema.index({ eventId: 1 }, { unique: true });
// Worker polling
crmOutboxSchema.index({ status: 1, nextRetryAt: 1, createdAt: 1 });
// Stall recovery
crmOutboxSchema.index({ status: 1, claimedAt: 1 });
// Delivered rows carry a customer name and phone number; drop them after 30 days
crmOutboxSchema.index({ sentAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('CrmOutbox', crmOutboxSchema);
