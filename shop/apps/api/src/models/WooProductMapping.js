// FILE: apps/api/src/models/WooProductMapping.js
const mongoose = require('mongoose');

const EXTERNAL_SOURCES = ['woo_vegetablecuttingmachine', 'woo_styleyourlyf'];

const wooProductMappingSchema = new mongoose.Schema(
  {
    externalSource: {
      type: String,
      enum: EXTERNAL_SOURCES,
      required: true,
    },
    wooProductId: {
      type: String,
      required: true,
      trim: true,
    },
    wooVariantId: {
      // null for WooCommerce simple products; variation ID string for variable products
      type: String,
      default: null,
      trim: true,
    },
    vtechProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    vtechVariantId: {
      // null for VTech products without variants; variant subdocument _id string otherwise
      type: String,
      default: null,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Partial unique index: within active=true documents, (externalSource, wooProductId,
// wooVariantId) must be unique.  Inactive mappings are excluded from the constraint,
// allowing a deactivated mapping to be superseded by a new active one.
wooProductMappingSchema.index(
  { externalSource: 1, wooProductId: 1, wooVariantId: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: 'unique_active_woo_mapping',
  }
);

// Fast lookup by VTech product (used to find all external sources for a given product)
wooProductMappingSchema.index({ vtechProductId: 1, active: 1 });

// Fast lookup by externalSource (used in cart handoff to list a storefront's mappings)
wooProductMappingSchema.index({ externalSource: 1, active: 1 });

wooProductMappingSchema.statics.EXTERNAL_SOURCES = EXTERNAL_SOURCES;

module.exports = mongoose.model('WooProductMapping', wooProductMappingSchema);
