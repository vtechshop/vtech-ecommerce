// FILE: apps/api/src/models/Vendor.js
const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // unique index
  storeName: { type: String, required: [true, 'Store name is required'], trim: true },
  slug: { type: String, unique: true, lowercase: true }, // unique index
  description: String,
  logo: String,
  kyc: {
    businessName: { type: String, trim: true, minlength: 2 },
    businessType: {
      type: String,
      enum: ['sole_proprietorship', 'partnership', 'private_limited', 'public_limited', 'llp', 'llc', 'other'],
      set: v => v ? v.toLowerCase() : v
    },
    businessAddress: String,
    taxId: {
      type: String,
      uppercase: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty for initial registration
          // Accept any alphanumeric string (more flexible for international use)
          // GST: 15 chars (22AAAAA0000A1Z5), PAN: 10 chars (AAAAA0000A) for India
          // But also allow other formats for flexibility
          if (v.length >= 6) return true; // Minimum 6 characters for any tax ID

          // Strict validation for specific formats (optional)
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v) || // GST
                 /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v); // PAN
        },
        message: 'Tax ID must be at least 6 characters (GST/PAN format preferred)'
      }
    },
    phoneNumber: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[+]?[\d\s()-]{10,15}$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
    documents: [{
      type: {
        type: String,
        enum: ['business_license', 'tax_certificate', 'id_proof', 'address_proof', 'other'],
      },
      url: String,
      filename: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    gstVerified: { type: Boolean, default: false },
    gstDetails: { type: mongoose.Schema.Types.Mixed }, // Cached AppyFlow response
    status: { type: String, enum: ['not_submitted', 'pending', 'approved', 'rejected'], default: 'not_submitted' },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: String,
  },
  // SECURITY WARNING: Bank details - sensitive financial data
  // RECOMMENDATION: Use Stripe Connect instead and only store last 4 digits
  // For PCI-DSS/GDPR compliance, consider field-level encryption or external vault
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
  bank: {
    accountName: String,
    accountNumber: { type: String, select: false }, // SECURITY: Hide by default - sensitive
    bankName: String,
    routingNumber: { type: String, select: false }, // SECURITY: Hide by default - sensitive
    swiftCode: String,
    ifscCode: String, // For India
    accountHolderName: String,
    lastFourDigits: String, // Safe to display (last 4 digits only)
    upiId: String, // UPI ID for manual payouts (e.g. vendor@upi)
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
  },
  // Stripe Connect for automatic payouts
  stripeAccountId: String,
  stripeAccountStatus: {
    type: String,
    enum: ['not_connected', 'pending', 'active', 'rejected'],
    default: 'not_connected'
  },
  // Razorpay Route (Linked Account) for automatic splits
  razorpay: {
    accountId: String, // Razorpay Linked Account ID (acc_XXXXX)
    accountStatus: {
      type: String,
      enum: ['not_connected', 'created', 'under_review', 'activated', 'suspended', 'funds_hold', 'funds_unhold'],
      default: 'not_connected'
    },
    accountEmail: String,
    accountPhone: String,
    // KYC status on Razorpay
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    // Settlement configuration
    settlementPercentage: { type: Number, default: 85 }, // Vendor gets 85% by default (platform keeps 15%)
    settlementSchedule: {
      type: String,
      enum: ['instant', 'daily', 'weekly', 'monthly'],
      default: 'instant'
    },
    // Hold configuration for Route transfers
    holdUntilDelivery: { type: Boolean, default: true }, // Hold transfers until order delivered
    holdDays: { type: Number, default: 7 }, // Max hold days (fallback release)
    // Metadata
    connectedAt: Date,
    lastSettlementAt: Date,
  },
  // Payout tracking
  totalEarnings: { type: Number, default: 0 }, // Total amount paid out
  pendingEarnings: { type: Number, default: 0 }, // Approved but not paid
  commissionRules: [{ categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, percentage: Number }],
  defaultCommissionPercentage: { type: Number, default: 15 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'active', 'rejected', 'suspended', 'closed'], default: 'pending' },
  returnPolicy: String,
  shippingPolicy: String,
  totalSales: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalProducts: { type: Number, default: 0 },
}, { timestamps: true });

// extra indexes (do NOT duplicate unique on userId/slug)
vendorSchema.index({ status: 1 });

vendorSchema.pre('validate', function (next) {
  // Convert businessType to lowercase BEFORE validation
  if (this.kyc?.businessType) {
    this.kyc.businessType = this.kyc.businessType.toLowerCase();
  }
  next();
});

vendorSchema.pre('save', function (next) {
  if (this.isModified('storeName') && !this.slug) {
    this.slug = this.storeName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('Vendor', vendorSchema);
