// FILE: apps/api/src/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['order', 'payment', 'shipping', 'promotion', 'system', 'message'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: mongoose.Schema.Types.Mixed,
  link: String,
  read: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
}, {
  timestamps: true,
});

// Indexes
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

// TTL index - notifications older than 90 days are automatically deleted
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('Notification', notificationSchema);