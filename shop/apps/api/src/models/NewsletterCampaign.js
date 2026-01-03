// FILE: apps/api/src/models/NewsletterCampaign.js
const mongoose = require('mongoose');

const newsletterCampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    html: {
      type: String,
      required: true,
    },
    text: String, // Plain text version
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
    default: 'draft',
    index: true,
  },
  scheduledAt: Date,
  sentAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipients: {
    targetAudience: {
      type: String,
      enum: ['all', 'tags', 'custom'],
      default: 'all',
    },
    tags: [String],
    customEmails: [String],
    totalCount: { type: Number, default: 0 },
  },
  statistics: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    complained: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
  },
  template: {
    type: String,
    enum: ['default', 'promotional', 'announcement', 'custom'],
    default: 'default',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, { timestamps: true });

// Indexes
newsletterCampaignSchema.index({ status: 1, scheduledAt: 1 });
newsletterCampaignSchema.index({ createdAt: -1 });

module.exports = mongoose.model('NewsletterCampaign', newsletterCampaignSchema);
