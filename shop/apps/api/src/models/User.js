// FILE: apps/api/src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // unique index
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: props => `${props.value} is not a valid email address`
      }
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // SECURITY: Never expose password hash by default
    },
    role: {
      type: String,
      enum: ['guest', 'customer', 'vendor', 'affiliate', 'support', 'admin'],
      default: 'customer',
    },
    avatar: String,
    phone: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[+]?[\d\s()-]{10,15}$/.test(v);
        },
        message: 'Invalid phone number format'
      }
    },
    addresses: [
      {
        fullName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    // OAuth login
    oauth: { provider: String, providerId: String },

    // Status fields
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },

    // Tokens
    verificationToken: String,
    verificationTokenExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    refreshToken: { type: String, select: false },

    // Account lockout (security)
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    // Activity tracking
    lastLogin: Date,
    loginCount: { type: Number, default: 0 },

    // Referral program
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralRewardPending: { type: Number, default: 0 }, // In paise
    referralRewardEarned: { type: Number, default: 0 }, // In paise
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ verificationToken: 1 });

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtuals
userSchema.virtual('vendorProfile', {
  ref: 'Vendor',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});
userSchema.virtual('affiliateProfile', {
  ref: 'Affiliate',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

module.exports = mongoose.model('User', userSchema);
