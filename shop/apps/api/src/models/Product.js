// FILE: apps/api/src/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  title: { type: String, required: [true, 'Product title is required'], trim: true },
  slug: { type: String, unique: true, lowercase: true }, // unique index
  description: { type: String, required: [true, 'Product description is required'] },
  images: [String],
  imageAlts: [String], // Alt tags for images (SEO & accessibility)
  videoUrl: { type: String, trim: true }, // YouTube video URL for product demonstration
  brand: String,
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  tags: [{ type: String, trim: true, lowercase: true }],
  attributes: mongoose.Schema.Types.Mixed,
  variants: [{ name: String, sku: String, price: Number, compareAt: Number, stock: Number, attributes: mongoose.Schema.Types.Mixed }],
  sku: { type: String, unique: true, sparse: true }, // unique sparse index
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: Number.isFinite,
      message: 'Price must be a valid number'
    }
  },
  compareAt: {
    type: Number,
    min: [0, 'Compare-at price cannot be negative'],
    validate: {
      validator: function(v) {
        // Allow null/undefined, or must be >= selling price
        return v === undefined || v === null || (Number.isFinite(v) && v >= this.price);
      },
      message: 'Compare-at price must be greater than or equal to selling price'
    }
  },
  cost: {
    type: Number,
    min: [0, 'Cost cannot be negative'],
    validate: {
      validator: function(v) {
        return v === undefined || v === null || Number.isFinite(v);
      },
      message: 'Cost must be a valid number'
    }
  },
  hsnCode: { type: String, trim: true }, // HSN/SAC code for GST invoices
  taxable: { type: Boolean, default: true },
  taxRate: { type: Number, default: 0 },
  taxIncluded: { type: Boolean, default: false }, // If true, tax is already included in the price
  stock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  trackInventory: { type: Boolean, default: true },
  weight: Number,
  dimensions: { length: Number, width: Number, height: Number, unit: { type: String, enum: ['in', 'cm'], default: 'in' } },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  seo: { title: String, description: String, keywords: [String] },
  // Structured data for rich snippets (JSON-LD)
  structuredData: {
    schemaType: { type: String, enum: ['Product', 'Book', 'Movie', 'MusicAlbum', 'Recipe', 'SoftwareApplication', 'VideoGame', 'Event', 'Course'], default: 'Product' },
    properties: mongoose.Schema.Types.Mixed, // Flexible object for schema.org properties
    customSnippets: [{ name: String, content: String }], // Additional custom snippets
  },
  published: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
  // Commission settings
  vendorCommissionRules: [{
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    percentage: Number
  }],
  vendorCommissionPercentage: { type: Number, min: 0, max: 100 }, // If null, uses vendor's default
  affiliateCommissionRules: [{
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    percentage: Number
  }],
  affiliateCommissionPercentage: { type: Number, min: 0, max: 100 }, // If null, uses affiliate's default
  // Warranty settings
  hasWarranty: { type: Boolean, default: false },
  warranty: {
    duration: { type: Number }, // Duration in months
    durationType: { type: String, enum: ['months', 'years', 'lifetime'], default: 'months' },
    description: { type: String }, // Warranty coverage details
    terms: { type: String }, // Terms and conditions
    provider: { type: String }, // Warranty provider (manufacturer, vendor, third-party)
    activationRequired: { type: Boolean, default: false }, // Requires customer to activate warranty
  },
  // FAQ settings
  faqs: [{
    question: { type: String, trim: true },
    answer: { type: String, trim: true }
  }],
  // Product Specifications
  specifications: [{
    label: { type: String, trim: true }, // e.g., "Weight", "Color", "Material"
    value: { type: String, trim: true }, // e.g., "2.5 kg", "Silver", "Stainless Steel"
  }],
}, { timestamps: true });

// indexes (do not duplicate slug/sku uniques)
productSchema.index({ vendorId: 1 });
productSchema.index({ categoryIds: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ published: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ createdAt: -1 });

// PERFORMANCE: Compound indexes for common query patterns
productSchema.index({ vendorId: 1, published: 1, createdAt: -1 }); // Vendor product listing
productSchema.index({ categoryIds: 1, published: 1, price: 1 }); // Category browsing with price filter
productSchema.index({ categoryIds: 1, featured: 1, published: 1 }); // Featured products by category
productSchema.index({ published: 1, price: 1, rating: -1 }); // Price range with sorting
productSchema.index({ vendorId: 1, stock: 1, trackInventory: 1 }); // Low stock alerts for vendors

// text index
productSchema.index({ title: 'text', description: 'text', brand: 'text', tags: 'text' });

// slug auto
productSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
