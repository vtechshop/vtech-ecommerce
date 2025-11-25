// FILE: apps/api/src/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  action: {
    type: String,
    required: true,
  },
  entity: {
    type: String,
    required: true, // e.g., 'Order', 'Product', 'User'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  changes: mongoose.Schema.Types.Mixed,
  metadata: {
    ip: String,
    userAgent: String,
    method: String,
    url: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ timestamp: -1 });

// TTL index - logs older than 1 year are automatically deleted
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // 1 year

module.exports = mongoose.model('AuditLog', auditLogSchema);