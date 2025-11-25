// FILE: apps/api/src/models/CommentLike.js
const mongoose = require('mongoose');

const commentLikeSchema = new mongoose.Schema(
  {
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BlogComment',
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

// Compound index to ensure one user can only like a comment once
commentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });

const CommentLike = mongoose.model('CommentLike', commentLikeSchema);

module.exports = CommentLike;
