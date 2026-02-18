// FILE: apps/api/src/models/Carousel.js
const mongoose = require('mongoose');

const carouselSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 100,
  },
  brand: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
  },
  link: {
    type: String,
    required: [true, 'Link is required'],
    trim: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Scheduling - for time-based visibility
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },
  // Track who created/updated
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for sorting and filtering
carouselSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Carousel', carouselSchema);
