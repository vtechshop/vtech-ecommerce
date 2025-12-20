// FILE: apps/api/src/models/LoginActivity.js
const mongoose = require('mongoose');

const loginActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['login', 'logout', 'failed_login', 'password_change', 'token_refresh'],
    required: true,
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success',
  },
  ipAddress: String,
  userAgent: String,
  device: String,
  browser: String,
  os: String,
  location: {
    city: String,
    country: String,
  },
  failureReason: String,
  sessionId: String,
}, {
  timestamps: true,
});

// Index for efficient queries
loginActivitySchema.index({ userId: 1, createdAt: -1 });
loginActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

module.exports = mongoose.model('LoginActivity', loginActivitySchema);
