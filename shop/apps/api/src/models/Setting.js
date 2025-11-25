const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: mongoose.Schema.Types.Mixed,
    type: { type: String, enum: ['string', 'number', 'boolean', 'json', 'array'], default: 'string' },
    category: {
      type: String,
      enum: [
        'general',      // Site name, logo, timezone, language
        'payment',      // Payment gateway settings
        'shipping',     // Shipping methods and rates
        'email',        // Email/SMTP configuration
        'seo',          // SEO meta tags, analytics
        'security',     // Security settings (2FA, session, rate limits)
        'notifications', // Push notifications, alerts
        'features',     // Feature flags (enable/disable features)
        'maintenance',  // Maintenance mode settings
        'integrations', // Third-party integrations
        'ads'           // Ad placement and management settings
      ],
      default: 'general'
    },
    description: String,
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

settingSchema.index({ category: 1 });

// simple helpers
settingSchema.statics.get = async function (key, def = null) {
  const s = await this.findOne({ key });
  return s ? s.value : def;
};

settingSchema.statics.set = async function (key, value, type = 'string', category = 'general') {
  return this.findOneAndUpdate(
    { key },
    { $set: { value, type, category } },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Setting', settingSchema);
