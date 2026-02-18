// FILE: apps/api/src/models/Newsletter.js
const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: 'Invalid email format',
    },
  },
  name: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['subscribed', 'unsubscribed', 'bounced', 'complained'],
    default: 'subscribed',
    index: true,
  },
  source: {
    type: String,
    enum: ['website_footer', 'checkout', 'popup', 'manual', 'import', 'blog'],
    default: 'website_footer',
  },
  tags: [{
    type: String,
    trim: true,
  }],
  preferences: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly',
    },
    categories: [String], // Product categories interested in
  },
  metadata: {
    ip: String,
    userAgent: String,
    referrer: String,
  },
  confirmedAt: Date,
  unsubscribedAt: Date,
  unsubscribeToken: {
    type: String,
    unique: true,
    sparse: true,
  },
}, { timestamps: true });

// Indexes
newsletterSchema.index({ email: 1, status: 1 });
newsletterSchema.index({ createdAt: -1 });
newsletterSchema.index({ tags: 1 });

// Generate unsubscribe token before saving
newsletterSchema.pre('save', function(next) {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = require('crypto').randomBytes(32).toString('hex');
  }
  next();
});

// Method to generate unsubscribe URL
newsletterSchema.methods.getUnsubscribeUrl = function() {
  const baseUrl = process.env.FRONTEND_URL || 'https://vtechkitchen.com';
  return `${baseUrl}/newsletter/unsubscribe?token=${this.unsubscribeToken}`;
};

module.exports = mongoose.model('Newsletter', newsletterSchema);
