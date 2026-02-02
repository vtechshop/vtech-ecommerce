// FILE: apps/api/src/models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Category name is required'], trim: true },
  slug: { type: String, unique: true, lowercase: true }, // unique index
  description: String,
  image: String,
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  attributes: [{
    name: String,
    type: { type: String, enum: ['text', 'number', 'select', 'multiselect'], default: 'text' },
    options: [String],
    required: Boolean,
  }],
  seo: { title: String, description: String, keywords: [String] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

// indexes (avoid duplicating slug unique)
categorySchema.index({ parentId: 1 });
categorySchema.index({ isActive: 1 });

// slug auto
categorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
