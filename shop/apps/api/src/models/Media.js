// FILE: apps/api/src/models/Media.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  originalName: String,
  mimeType: String,
  size: Number,
  url: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  folder: String,
  alt: String,
  title: String,
}, {
  timestamps: true,
});

// Indexes
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ folder: 1 });
mediaSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema);