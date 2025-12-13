// FILE: apps/api/src/models/Blog.js
const mongoose = require('mongoose');

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
      enum: ['post', 'video'],
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
      enum: ['Tech News', 'Product Reviews', 'How-To Guides', 'Industry Trends', 'Company News', 'Tips & Tricks'],
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
