// FILE: apps/api/src/models/CatalogueSettings.js
// Singleton settings document for the public /catalog page.
// Only one document ever exists — created on first GET/PUT if absent.
const mongoose = require('mongoose');

const manualProductEntrySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  order: { type: Number, default: 0 },
}, { _id: false });

const catalogueSettingsSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Product Catalogue',
    trim: true,
    maxlength: [100, 'Title must be 100 characters or less'],
  },
  subtitle: {
    type: String,
    default: 'Commercial Kitchen & Food Processing Machines',
    trim: true,
    maxlength: [200, 'Subtitle must be 200 characters or less'],
  },
  showSearch: { type: Boolean, default: true },
  showCategoryFilter: { type: Boolean, default: true },
  productMode: {
    type: String,
    enum: ['all', 'manual', 'category'],
    default: 'all',
  },
  // Used when productMode = 'manual': ordered list of product refs
  manualProducts: {
    type: [manualProductEntrySchema],
    default: [],
  },
  // Used when productMode = 'category': single category restriction
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  productsPerPage: {
    type: Number,
    default: 48,
    min: [12, 'Products per page must be at least 12'],
    max: [200, 'Products per page cannot exceed 200'],
  },
}, { timestamps: true });

module.exports = mongoose.model('CatalogueSettings', catalogueSettingsSchema);
