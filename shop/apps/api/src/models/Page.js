// FILE: apps/api/src/models/Page.js
const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    lowercase: true,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  excerpt: String,
  template: {
    type: String,
    default: 'default',
  },
  seo: {
    title: String,
    description: String,
    keywords: [String],
  },
  published: {
    type: Boolean,
    default: false,
  },
  publishedAt: Date,
  viewCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
pageSchema.index({ slug: 1 }, { unique: true });
pageSchema.index({ published: 1 });

module.exports = mongoose.model('Page', pageSchema);