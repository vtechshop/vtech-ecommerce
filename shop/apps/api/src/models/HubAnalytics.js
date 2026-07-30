// FILE: apps/api/src/models/HubAnalytics.js
const mongoose = require('mongoose');

const hubAnalyticsSchema = new mongoose.Schema({
  button:     { type: String, required: true, trim: true },
  label:      { type: String, trim: true, default: '' },
  href:       { type: String, trim: true, default: '' },
  deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet', 'unknown'], default: 'unknown' },
  referrer:   { type: String, default: 'direct' },
  sessionId:  { type: String, default: '' },
  timestamp:  { type: Date, default: Date.now },
}, { timestamps: false });

hubAnalyticsSchema.index({ button: 1, timestamp: -1 });
hubAnalyticsSchema.index({ timestamp: -1 });
hubAnalyticsSchema.index({ deviceType: 1, timestamp: -1 });

module.exports = mongoose.model('HubAnalytics', hubAnalyticsSchema);
