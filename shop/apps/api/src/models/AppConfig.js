// FILE: apps/api/src/models/AppConfig.js
const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  contactInfo: {
    email: { type: String, default: 'support@vtechkitchen.com' },
    phone: { type: String, default: '+91 98765 43210' },
    whatsapp: { type: String, default: '+91 98765 43210' },
    website: { type: String, default: 'vtechkitchen.com' },
    businessHours: { type: String, default: 'Monday - Saturday: 9:00 AM - 6:00 PM' },
    address: { type: String, default: '' },
  },
  aboutPage: {
    companyName: { type: String, default: 'V-Tech' },
    tagline: { type: String, default: 'Premium Products' },
    description: { type: String, default: '' },
    stats: [{
      label: String,
      value: String,
      icon: String,
    }],
  },
  referralConfig: {
    rewardAmount: { type: Number, default: 100 },
    referrerReward: { type: Number, default: 100 },
    refereeReward: { type: Number, default: 50 },
    isActive: { type: Boolean, default: true },
  },
  festivalSale: {
    isActive: { type: Boolean, default: false },
    title: { type: String, default: 'Festival Sale' },
    endDate: { type: Date },
    categories: [{
      name: String,
      searchQuery: String,
      icon: String,
      gradient: [String],
    }],
  },
  giftCardAmounts: {
    type: [Number],
    default: [250, 500, 1000, 2000, 5000],
  },
}, { timestamps: true });

module.exports = mongoose.model('AppConfig', appConfigSchema);
