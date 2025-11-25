// FILE: apps/api/src/models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    lowercase: true,
  },
  content: {
    type: String,
    required: true,
  },
  excerpt: String,
  featuredImage: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  category: String,
  tags: [String],
  readTime: Number,
  published: {
    type: Boolean,
    default: false,
  },
  publishedAt: Date,
  seo: {
    title: String,
    description: String,
    keywords: [String],
  },
  viewCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
postSchema.index({ slug: 1 }, { unique: true });
postSchema.index({ published: 1 });
postSchema.index({ publishedAt: -1 });
postSchema.index({ category: 1 });

// Pre-save hook to generate slug
postSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);