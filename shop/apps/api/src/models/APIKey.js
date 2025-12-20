// FILE: apps/api/src/models/APIKey.js
const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  key: {
    type: String,
    required: true,
    unique: true,
    select: false, // Don't return in queries by default
  },
  prefix: {
    type: String,
    required: true,
  },
  lastUsedAt: Date,
  expiresAt: Date,
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete'],
  }],
  status: {
    type: String,
    enum: ['active', 'revoked'],
    default: 'active',
  },
  description: String,
}, {
  timestamps: true,
});

// Index for efficient queries
apiKeySchema.index({ userId: 1, status: 1 });
apiKeySchema.index({ key: 1 });

module.exports = mongoose.model('APIKey', apiKeySchema);
