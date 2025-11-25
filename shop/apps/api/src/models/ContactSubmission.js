// FILE: apps/api/src/models/ContactSubmission.js
const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'resolved', 'spam'],
    default: 'new',
  },
  adminNotes: {
    type: String,
    default: '',
  },
  ipAddress: String,
  userAgent: String,
  repliedAt: Date,
  resolvedAt: Date,
}, {
  timestamps: true,
});

// Indexes
contactSubmissionSchema.index({ email: 1 });
contactSubmissionSchema.index({ status: 1 });
contactSubmissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
