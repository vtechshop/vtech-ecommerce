// FILE: apps/api/src/models/FlashSale.js
const mongoose = require('mongoose');

const flashSaleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    flashPrice: Number, // Calculated sale price
    originalPrice: Number, // Store original price for reference
    stockLimit: Number, // Optional: limit quantity available in flash sale
    soldCount: { type: Number, default: 0 },
  }],
  banner: {
    image: String,
    backgroundColor: String,
    textColor: String,
  },
  displayPriority: { type: Number, default: 0 }, // Higher = shows first
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended'],
    default: 'scheduled',
  },
}, { timestamps: true });

// Indexes for performance
flashSaleSchema.index({ status: 1, displayPriority: -1 });
flashSaleSchema.index({ startDate: 1, endDate: 1 });
flashSaleSchema.index({ 'products.productId': 1 });

// Method to check if sale is currently active
flashSaleSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return this.isActive &&
         this.status === 'active' &&
         now >= this.startDate &&
         now <= this.endDate;
};

// Method to get time remaining
flashSaleSchema.methods.getTimeRemaining = function() {
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = end - now;

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, total: diff };
};

// Static method to update status of all sales
flashSaleSchema.statics.updateStatuses = async function() {
  const now = new Date();

  // Activate scheduled sales that have started
  await this.updateMany(
    { status: 'scheduled', startDate: { $lte: now }, endDate: { $gt: now } },
    { $set: { status: 'active' } }
  );

  // End active sales that have expired
  await this.updateMany(
    { status: 'active', endDate: { $lte: now } },
    { $set: { status: 'ended' } }
  );
};

module.exports = mongoose.model('FlashSale', flashSaleSchema);
