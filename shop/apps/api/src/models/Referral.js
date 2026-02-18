// FILE: apps/api/src/models/Referral.js
const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    // The user who is referring others
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Unique referral code for this user
    referralCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    // Users who signed up using this referral code
    referredUsers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      signupDate: {
        type: Date,
        default: Date.now,
      },
      hasCompletedFirstPurchase: {
        type: Boolean,
        default: false,
      },
      firstPurchaseDate: Date,
      firstPurchaseAmount: Number,
      rewardGiven: {
        type: Boolean,
        default: false,
      },
      rewardAmount: Number,
    }],

    // Statistics
    totalReferrals: {
      type: Number,
      default: 0,
    },
    successfulReferrals: {
      type: Number,
      default: 0, // Referrals who made a purchase
    },
    totalEarnings: {
      type: Number,
      default: 0, // In paise
    },

    // Rewards configuration
    rewardType: {
      type: String,
      enum: ['percentage', 'fixed', 'both'],
      default: 'both',
    },
    referrerReward: {
      type: Number,
      default: 10000, // 100 INR in paise for referrer
    },
    refereeReward: {
      type: Number,
      default: 5000, // 50 INR in paise for new user
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate a unique referral code
referralSchema.statics.generateReferralCode = async function(userId) {
  const User = require('./User');
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Create code from user name + random string
  const namePart = user.name
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 4)
    .toUpperCase();

  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  let code = `${namePart}${randomPart}`;

  // Ensure uniqueness
  let existingCode = await this.findOne({ referralCode: code });
  let attempts = 0;

  while (existingCode && attempts < 10) {
    const newRandomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    code = `${namePart}${newRandomPart}`;
    existingCode = await this.findOne({ referralCode: code });
    attempts++;
  }

  if (existingCode) {
    // Fallback to fully random code
    code = Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  return code;
};

// Add a referred user
referralSchema.methods.addReferredUser = async function(userId) {
  // Check if user already referred
  const alreadyReferred = this.referredUsers.some(
    ref => ref.userId.toString() === userId.toString()
  );

  if (alreadyReferred) {
    throw new Error('User already referred');
  }

  this.referredUsers.push({
    userId,
    signupDate: new Date(),
  });

  this.totalReferrals += 1;
  await this.save();

  return this;
};

// Mark first purchase and give rewards
referralSchema.methods.recordFirstPurchase = async function(userId, purchaseAmount) {
  const referredUser = this.referredUsers.find(
    ref => ref.userId.toString() === userId.toString()
  );

  if (!referredUser) {
    throw new Error('User not found in referrals');
  }

  if (referredUser.hasCompletedFirstPurchase) {
    throw new Error('First purchase already recorded');
  }

  referredUser.hasCompletedFirstPurchase = true;
  referredUser.firstPurchaseDate = new Date();
  referredUser.firstPurchaseAmount = purchaseAmount;
  referredUser.rewardGiven = true;
  referredUser.rewardAmount = this.referrerReward;

  this.successfulReferrals += 1;
  this.totalEarnings += this.referrerReward;

  await this.save();

  return {
    referrerReward: this.referrerReward,
    refereeReward: this.refereeReward,
  };
};

// Get active referral count
referralSchema.methods.getActiveReferralCount = function() {
  return this.referredUsers.filter(ref => !ref.hasCompletedFirstPurchase).length;
};

// Get conversion rate
referralSchema.methods.getConversionRate = function() {
  if (this.totalReferrals === 0) return 0;
  return ((this.successfulReferrals / this.totalReferrals) * 100).toFixed(2);
};

module.exports = mongoose.model('Referral', referralSchema);
