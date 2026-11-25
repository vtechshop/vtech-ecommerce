// FILE: apps/api/src/models/Blog.js
const mongoose = require('mongoose');

const guideSchema = new mongoose.Schema({
  kicker: { type: String, trim: true, maxlength: 120 },
  headline: { type: String, trim: true, maxlength: 250 },
  subheadline: { type: String, trim: true, maxlength: 600 },
  hook: { type: String, trim: true, maxlength: 250 },
  chips: [{ type: String, trim: true, maxlength: 60 }],
  pdfUrl: { type: String, trim: true },
  pdfName: { type: String, trim: true, maxlength: 150 },
  pdfPages: { type: Number, min: 0 },
  ctaText: { type: String, trim: true, maxlength: 80 },
  ctaNote: { type: String, trim: true, maxlength: 150 },
  questionsTitle: { type: String, trim: true, maxlength: 200 },
  questionsIntro: { type: String, trim: true, maxlength: 400 },
  questions: [{
    _id: false,
    icon: { type: String, trim: true, maxlength: 8 },
    title: { type: String, trim: true, maxlength: 150 },
    desc: { type: String, trim: true, maxlength: 400 },
    page: { type: String, trim: true, maxlength: 20 },
  }],
  stepsTitle: { type: String, trim: true, maxlength: 200 },
  steps: [{
    _id: false,
    title: { type: String, trim: true, maxlength: 120 },
    desc: { type: String, trim: true, maxlength: 300 },
  }],
  stats: [{
    _id: false,
    value: { type: String, trim: true, maxlength: 30 },
    label: { type: String, trim: true, maxlength: 150 },
  }],
  audienceTitle: { type: String, trim: true, maxlength: 200 },
  audience: [{ type: String, trim: true, maxlength: 200 }],
  finalTitle: { type: String, trim: true, maxlength: 200 },
  finalText: { type: String, trim: true, maxlength: 500 },
  finalCtaText: { type: String, trim: true, maxlength: 80 },
  whatsappText: { type: String, trim: true, maxlength: 300 },
  sourceNote: { type: String, trim: true, maxlength: 600 },
}, { _id: false });

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [300, 'Excerpt cannot exceed 300 characters'],
    },
    content: {
      type: String,
      required: function() {
        return this.type === 'post';
      },
    },
    type: {
      type: String,
      enum: ['post', 'video', 'guide'],
      default: 'post',
      required: true,
    },
    // For video posts
    videoUrl: {
      type: String,
      required: function() {
        return this.type === 'video';
      },
    },
    videoProvider: {
      type: String,
      enum: ['youtube', 'vimeo', 'direct'],
      required: function() {
        return this.type === 'video';
      },
    },
    videoDuration: {
      type: Number, // in seconds
    },
    // Featured image/thumbnail
    featuredImage: {
      type: String,
      required: function() {
        return this.isNew; // Only required for new documents
      },
    },
    images: [String],
    // Author info
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: String,
    // Categories and tags
    category: {
      type: String,
      enum: ['Tech News', 'Product Reviews', 'How-To Guides', 'Industry Trends', 'Company News', 'Tips & Tricks', 'Free Guides', 'Business & Export'],
      required: function() {
        return this.isNew; // Only required for new documents
      },
    },
    tags: [String],
    // SEO
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    // Publishing
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    publishedAt: Date,
    scheduledAt: Date,
    // Engagement
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    // Comments
    commentsEnabled: {
      type: Boolean,
      default: true,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    // Featured
    featured: {
      type: Boolean,
      default: false,
    },
    featuredOrder: Number,
    // Related products (optional)
    relatedProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    }],
    // Language of this post, and a shared key that links its translations together
    language: {
      type: String,
      enum: ['en', 'ta', 'ml', 'kn', 'te', 'hi'],
      default: 'en',
    },
    translationKey: { type: String, trim: true, lowercase: true, maxlength: 100 },
    // Free Guide (type 'guide'): a landing page for a downloadable PDF
    guide: { type: guideSchema, default: undefined },
    downloads: { type: Number, default: 0 },
    // Reading time (auto-calculated for posts)
    readingTime: Number, // in minutes
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
// slug already has unique index from schema definition, no need to duplicate
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ featured: 1, featuredOrder: 1 });
blogSchema.index({ author: 1 });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ translationKey: 1, language: 1 });

// Virtual for comments
blogSchema.virtual('comments', {
  ref: 'BlogComment',
  localField: '_id',
  foreignField: 'blogId',
});

// Pre-save middleware
blogSchema.pre('save', function(next) {
  // Auto-generate slug from title if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Set published date
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Calculate reading time for posts (avg 200 words per minute)
  if (this.type === 'post' && this.content) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / 200);
  }

  // Set author name if not provided
  if (!this.authorName && this.author) {
    // Will be populated in controller
  }

  next();
});

// Static methods
blogSchema.statics.incrementViews = async function(blogId) {
  return this.findByIdAndUpdate(blogId, { $inc: { views: 1 } });
};

blogSchema.statics.incrementLikes = async function(blogId) {
  return this.findByIdAndUpdate(blogId, { $inc: { likes: 1 } });
};

blogSchema.statics.incrementShares = async function(blogId) {
  return this.findByIdAndUpdate(blogId, { $inc: { shares: 1 } });
};

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
