const mongoose = require('mongoose');

const warrantySchema = new mongoose.Schema({
  warrantyId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  purchaseId: {
    type: String,
    required: true,
    index: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  product: {
    name: { type: String, required: true },
    model: String,
    serial: String,
    category: String,
  },
  purchaseDate: {
    type: Date,
    required: true,
    index: true,
  },
  warrantyStartDate: {
    type: Date,
    required: true,
  },
  warrantyEndDate: {
    type: Date,
    required: true,
    index: true,
  },
  warrantyPeriodDays: {
    type: Number,
    required: true,
  },
  warrantyType: {
    type: String,
    enum: ['manufacturer', 'extended', 'seller', 'none'],
    default: 'manufacturer',
  },
  status: {
    type: String,
    enum: ['active', 'expiring_soon', 'expired', 'no_warranty', 'claimed', 'void'],
    default: 'active',
    index: true,
  },
  extraInfo: {
    store: String,
    invoiceNo: String,
    remarks: String,
  },
  claims: [{
    claimId: String,
    claimDate: Date,
    description: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
    },
    resolvedDate: Date,
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['30_days_before', '7_days_before', 'on_expiry', 'expired'],
    },
    sentAt: Date,
    sentTo: String,
  }],
  lastNotificationSent: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for warranty status queries
warrantySchema.index({ status: 1, warrantyEndDate: 1 });
warrantySchema.index({ userId: 1, status: 1 });

// Virtual for days since purchase
warrantySchema.virtual('daysSincePurchase').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.purchaseDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for days remaining
warrantySchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const diffTime = this.warrantyEndDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to update warranty status
warrantySchema.methods.updateStatus = function() {
  const daysRemaining = this.daysRemaining;

  if (this.warrantyPeriodDays === 0) {
    this.status = 'no_warranty';
  } else if (daysRemaining < 0) {
    this.status = 'expired';
  } else if (daysRemaining <= 30) {
    this.status = 'expiring_soon';
  } else {
    this.status = 'active';
  }

  return this.status;
};

// Method to get user-safe view (limited info)
warrantySchema.methods.toUserView = function() {
  return {
    warrantyId: this.warrantyId,
    product: this.product.name,
    productModel: this.product.model,
    purchaseDate: this.purchaseDate,
    warrantyStartDate: this.warrantyStartDate,
    warrantyEndDate: this.warrantyEndDate,
    daysSincePurchase: this.daysSincePurchase,
    daysRemaining: this.daysRemaining,
    status: this.status,
    warrantyType: this.warrantyType,
    visibleToUser: true,
  };
};

// Method to get admin view (full info)
warrantySchema.methods.toAdminView = function() {
  return {
    warrantyId: this.warrantyId,
    purchaseId: this.purchaseId,
    orderId: this.orderId,
    userId: this.userId,
    productId: this.productId,
    product: this.product,
    purchaseDate: this.purchaseDate,
    warrantyStartDate: this.warrantyStartDate,
    warrantyEndDate: this.warrantyEndDate,
    warrantyPeriodDays: this.warrantyPeriodDays,
    warrantyType: this.warrantyType,
    daysSincePurchase: this.daysSincePurchase,
    daysRemaining: this.daysRemaining,
    status: this.status,
    extraInfo: this.extraInfo,
    claims: this.claims,
    notifications: this.notifications,
    lastNotificationSent: this.lastNotificationSent,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    visibleToAdminOnly: true,
  };
};

// Static method to generate warranty ID
warrantySchema.statics.generateWarrantyId = async function() {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    warrantyId: new RegExp(`^W-${year}-`)
  });
  const paddedCount = String(count + 1).padStart(6, '0');
  return `W-${year}-${paddedCount}`;
};

warrantySchema.set('toJSON', { virtuals: true });
warrantySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Warranty', warrantySchema);
