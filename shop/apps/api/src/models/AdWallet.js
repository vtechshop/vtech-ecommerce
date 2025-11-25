// FILE: apps/api/src/models/AdWallet.js
const mongoose = require('mongoose');

const adWalletSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalRecharged: {
    type: Number,
    default: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  transactions: [{
    type: {
      type: String,
      enum: ['recharge', 'spend', 'refund', 'adjustment'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balance: Number, // Balance after this transaction
    description: String,
    reference: String, // Payment reference or campaign ID
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdCampaign',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  // Low balance alerts
  lowBalanceThreshold: {
    type: Number,
    default: 100,
  },
  alertsSent: [{
    type: Date,
  }],
}, {
  timestamps: true,
});

// Indexes
adWalletSchema.index({ vendorId: 1 }, { unique: true });

// Methods
adWalletSchema.methods.addTransaction = function(type, amount, description, reference, campaignId) {
  // Update balance
  if (type === 'recharge' || type === 'refund') {
    this.balance += amount;
    if (type === 'recharge') {
      this.totalRecharged += amount;
    }
  } else if (type === 'spend') {
    this.balance -= amount;
    this.totalSpent += amount;
  }

  // Add transaction record
  this.transactions.push({
    type,
    amount,
    balance: this.balance,
    description,
    reference,
    campaignId,
    timestamp: new Date(),
  });

  return this.balance;
};

adWalletSchema.methods.hasBalance = function(amount) {
  return this.balance >= amount;
};

module.exports = mongoose.model('AdWallet', adWalletSchema);