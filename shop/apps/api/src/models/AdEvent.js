// FILE: apps/api/src/models/AdEvent.js
const mongoose = require('mongoose');

const adEventSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdCampaign',
    required: true,
  },
  creativeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdCreative',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  guestId: String,
  sessionId: String,
  event: {
    type: String,
    enum: ['impression', 'click', 'add_to_cart', 'conversion'],
    required: true,
  },
  // Context
  url: String,
  referrer: String,
  ipHash: String, // Hashed for privacy
  uaHash: String, // User agent hash
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
  },
  // Conversion data
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  revenue: Number,
  // Cost (calculated at time of event)
  cost: Number,
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false, // We use timestamp field instead
});

// Indexes
adEventSchema.index({ campaignId: 1, event: 1 });
adEventSchema.index({ creativeId: 1, event: 1 });
adEventSchema.index({ sessionId: 1, event: 1 });
adEventSchema.index({ timestamp: -1 });
adEventSchema.index({ orderId: 1 });

// TTL index - events older than 90 days are automatically deleted
adEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('AdEvent', adEventSchema);