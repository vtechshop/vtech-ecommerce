// FILE: apps/api/src/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, required: true }, // unique index
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Not required for guest checkout
  guestEmail: { type: String }, // Email for guest checkout
  isGuest: { type: Boolean, default: false }, // Flag to indicate guest order
  // Parent/Child order relationship for multi-vendor orders
  parentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // Links child orders to parent
  childOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }], // Parent order tracks all child orders
  isVendorOrder: { type: Boolean, default: false }, // True for vendor-specific child orders
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    variantId: String, qty: Number, priceSnapshot: Number, name: String, image: String,
    productSlug: String, variantName: String, sku: String, hsnCode: String,
    adCampaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdCampaign' },
    adCreativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdCreative' },
    affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Affiliate' },
    // Warranty information (copied from product at purchase time)
    warranty: {
      hasWarranty: { type: Boolean, default: false },
      duration: Number,
      durationType: String,
      description: String,
      terms: String,
      provider: String,
      activationRequired: Boolean,
      // Warranty activation tracking
      isActivated: { type: Boolean, default: false },
      activatedAt: Date,
      expiresAt: Date, // Calculated when activated or after payment
      warrantyCode: String, // Unique warranty registration code
    },
  }],
  totals: { subtotal: Number, tax: Number, shipping: Number, discount: Number, total: Number },
  shipTo: {
    fullName: String, phone: String, addressLine1: String, addressLine2: String,
    city: String, district: String, area: String, state: String, zipCode: String, country: String,
  },
  status: {
    type: String,
    enum: ['pending', 'pending_payment', 'placed', 'paid', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    default: 'pending',
  },
  events: [{ status: String, description: String, timestamp: { type: Date, default: Date.now } }],
  payment: {
    provider: String,
    method: String,
    transactionId: String,
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'captured'], default: 'pending' },
    paidAt: Date,
    amount: Number,
    currency: String,
    // Razorpay specific fields
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    // Payment method details (for card/UPI/wallet)
    cardDetails: {
      network: String,
      last4: String,
      type: String,
    },
    // Contact details from payment
    email: String,
    contact: String,
    // Error details for failed payments
    error: String,
    failedAt: Date,
    // Refund details
    refund: {
      id: String,
      amount: Number,
      status: String,
      createdAt: Date,
    },
  },
  // Email notification tracking to prevent duplicates
  confirmationEmailSent: { type: Boolean, default: false },
  confirmationEmailSentAt: { type: Date },
  vendorNotificationSent: { type: Boolean, default: false },
  vendorNotificationSentAt: { type: Date },
  reviewEmailSent: { type: Boolean, default: false },
  reviewEmailSentAt: { type: Date },
  shipment: {
    carrier: String,
    awb: String,
    trackingUrl: String,
    shippedAt: Date,
    deliveredAt: Date,
    trackingLastSynced: Date, // Last time tracking was synced from carrier API
    carrierStatus: String, // Raw status from carrier API
    currentLocation: String, // Current location from carrier
    estimatedDelivery: Date, // Estimated delivery date from carrier
    events: [{ code: String, description: String, location: String, timestamp: Date }],
  },
  invoiceNumber: { type: String, unique: true, sparse: true }, // e.g., W-00001, M-00001
  invoices: [{ url: String, generatedAt: Date }],
  affiliateCode: String, // Affiliate code used during order placement
  source: { type: String, enum: ['online', 'in-store', 'phone'], default: 'online' },
  customerPhone: String, // For in-store/phone orders - warranty lookup
  customerNotes: { type: String, maxlength: 500 },
  internalNotes: String,
  cancellation: {
    reason: String,
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
}, { timestamps: true });

// useful indexes (avoid duplicating uniques)
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.vendorId': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });

// PERFORMANCE: Additional indexes for guest orders and common queries
orderSchema.index({ guestEmail: 1 }); // Guest order lookup
orderSchema.index({ isGuest: 1, guestEmail: 1 }); // Compound index for guest queries
orderSchema.index({ 'payment.status': 1, createdAt: -1 }); // Payment status with sort
orderSchema.index({ 'items.vendorId': 1, status: 1, createdAt: -1 }); // Vendor order queries
orderSchema.index({ parentOrderId: 1 }); // Parent/child order relationship lookup
orderSchema.index({ 'payment.razorpayOrderId': 1 }); // Performance: Fast lookup for reconciliation
orderSchema.index({ isVendorOrder: 1 }); // Vendor-specific orders

// RECONCILIATION: Helper to find orders where payment might be stuck
// Usage: const stuckOrders = await Order.findStuckRazorpayOrders(15);
orderSchema.statics.findStuckRazorpayOrders = function(olderThanMinutes = 15) {
  const cutoffDate = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  return this.find({
    'payment.razorpayOrderId': { $exists: true, $ne: null }, // Order initiated with Razorpay
    'payment.status': 'pending',                             // But status is still pending
    createdAt: { $lte: cutoffDate }                          // And it's been a while
  });
};

module.exports = mongoose.model('Order', orderSchema);
