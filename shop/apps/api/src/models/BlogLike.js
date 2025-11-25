// FILE: apps/api/src/models/BlogLike.js
const mongoose = require('mongoose');

const blogLikeSchema = new mongoose.Schema(
  {
    blogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one user can only like a blog once
blogLikeSchema.index({ blogId: 1, userId: 1 }, { unique: true });

const BlogLike = mongoose.model('BlogLike', blogLikeSchema);

module.exports = BlogLike;
