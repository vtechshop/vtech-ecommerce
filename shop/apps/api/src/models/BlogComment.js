// FILE: apps/api/src/models/BlogComment.js
const mongoose = require('mongoose');

const blogCommentSchema = new mongoose.Schema(
  {
    blogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: String,
    userEmail: String,
    comment: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    // For nested comments (replies)
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogComment',
      default: null,
    },
    // Moderation
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'spam'],
      default: 'approved', // Auto-approve by default, can change to 'pending'
    },
    edited: {
      type: Boolean,
      default: false,
    },
    // Engagement
    likes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
blogCommentSchema.index({ blogId: 1, createdAt: -1 });
blogCommentSchema.index({ userId: 1 });
blogCommentSchema.index({ status: 1 });
blogCommentSchema.index({ parentId: 1 });

// Update blog comments count after save
blogCommentSchema.post('save', async function() {
  if (this.status === 'approved') {
    const Blog = mongoose.model('Blog');
    const count = await mongoose.model('BlogComment').countDocuments({
      blogId: this.blogId,
      status: 'approved',
    });
    await Blog.findByIdAndUpdate(this.blogId, { commentsCount: count });
  }
});

// Update blog comments count after delete
blogCommentSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.status === 'approved') {
    const Blog = mongoose.model('Blog');
    const count = await mongoose.model('BlogComment').countDocuments({
      blogId: doc.blogId,
      status: 'approved',
    });
    await Blog.findByIdAndUpdate(doc.blogId, { commentsCount: count });
  }
});

const BlogComment = mongoose.model('BlogComment', blogCommentSchema);

module.exports = BlogComment;
