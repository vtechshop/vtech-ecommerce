// FILE: apps/api/src/models/Communication.js
const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema({
  // Type of communication
  type: {
    type: String,
    enum: ['whatsapp', 'email', 'sms', 'marketing', 'notification', 'support'],
    required: true,
  },

  // Direction
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true,
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
    default: 'pending',
  },

  // Sender and Recipient
  from: {
    type: String, // Email, phone number, or user ID
    required: true,
  },
  fromName: String,

  to: {
    type: String, // Email, phone number, or user ID
    required: true,
  },
  toName: String,

  // Related user (if applicable)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Subject (for emails)
  subject: String,

  // Message content
  message: {
    type: String,
    required: true,
  },

  // HTML content (for emails)
  htmlContent: String,

  // Metadata
  metadata: {
    channel: String,        // whatsapp, gmail, twilio, etc.
    messageId: String,      // External message ID
    threadId: String,       // For grouping conversations
    campaignId: String,     // For marketing campaigns
    orderId: mongoose.Schema.Types.ObjectId, // Related order
    templateId: String,     // Marketing template used
  },

  // Delivery info
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  failedAt: Date,
  errorMessage: String,

  // Attachments
  attachments: [{
    filename: String,
    url: String,
    type: String,
    size: Number,
  }],

  // Tags for filtering
  tags: [String],

  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },

  // Notes (admin can add notes)
  notes: String,

  // Reply to message
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Communication',
  },

}, {
  timestamps: true,
});

// Indexes for performance
communicationSchema.index({ type: 1, createdAt: -1 });
communicationSchema.index({ userId: 1 });
communicationSchema.index({ status: 1 });
communicationSchema.index({ direction: 1 });
communicationSchema.index({ 'metadata.threadId': 1 });
communicationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Communication', communicationSchema);
