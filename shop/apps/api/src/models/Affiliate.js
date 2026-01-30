// FILE: apps/api/src/models/Affiliate.js
const mongoose = require('mongoose');

const affiliateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
  },
  // UTM parameters
  utm: {
    source: String,
    medium: String,
    campaign: String,
  },
  // KYC Information
  kyc: {
    fullName: String,
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    phoneNumber: String,
    idType: { type: String, enum: ['passport', 'drivers_license', 'national_id', 'other'] },
    idNumber: String,
    documents: [{
      type: { type: String, enum: ['id_proof', 'address_proof', 'tax_document', 'other'] },
      url: String,
      filename: String,
      uploadedAt: { type: Date, default: Date.now },
    }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    verifiedAt: Date,
    rejectionReason: String,
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'rejected'],
    default: 'pending',
  },
  approvedAt: Date,
  rejectionReason: String,
  // Commission settings
  commissionRules: [{
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    percentage: Number
  }],
  commissionPercentage: {
    type: Number,
    default: 5,
  },
  // Stats
  totalClicks: {
    type: Number,
    default: 0,
  },
  totalConversions: {
    type: Number,
    default: 0,
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  pendingEarnings: {
    type: Number,
    default: 0,
  },
  paidEarnings: {
    type: Number,
    default: 0,
  },
  // PAN for TDS compliance
  panNumber: {
    type: String,
    uppercase: true,
    validate: {
      validator: function (v) {
        if (!v) return true;
        return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
      },
      message: 'Invalid PAN format (e.g. ABCDE1234F)',
    },
  },
  panVerified: { type: Boolean, default: false },
  // Bank details for payouts
  bankDetails: {
    accountHolderName: String,
    bankName: String,
    accountNumber: { type: String, select: false },
    ifscCode: String,
    upiId: String,
    lastFourDigits: String,
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
  },
  // Payment info (legacy)
  paymentMethod: {
    type: String,
    enum: ['bank', 'paypal', 'stripe', 'razorpay'],
  },
  paymentDetails: mongoose.Schema.Types.Mixed,
  // Razorpay Route (Linked Account) for automatic splits
  razorpay: {
    accountId: String, // Razorpay Linked Account ID (acc_XXXXX)
    accountStatus: {
      type: String,
      enum: ['not_connected', 'created', 'activated', 'suspended'],
      default: 'not_connected'
    },
    accountEmail: String,
    accountPhone: String,
    // Settlement configuration for affiliates
    settlementSchedule: {
      type: String,
      enum: ['instant', 'daily', 'weekly', 'monthly'],
      default: 'weekly' // Affiliates typically get weekly settlements
    },
    // Metadata
    connectedAt: Date,
    lastSettlementAt: Date,
  },
}, {
  timestamps: true,
});

// Indexes
affiliateSchema.index({ userId: 1 }, { unique: true });
affiliateSchema.index({ code: 1 }, { unique: true });
affiliateSchema.index({ status: 1 });

module.exports = mongoose.model('Affiliate', affiliateSchema);