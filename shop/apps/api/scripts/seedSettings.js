const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const Setting = require('../src/models/Setting');

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';
    await mongoose.connect(uri);
    console.log('[seed] Connected:', uri);

    const defaults = [
      { key: 'site_name', value: 'Shop', type: 'string', category: 'general', description: 'Storefront name' },
      { key: 'free_shipping_banner', value: 'Free shipping on orders over ₹500', type: 'string', category: 'general' },

      { key: 'stripe_enabled', value: false, type: 'boolean', category: 'payment' },
      { key: 'razorpay_enabled', value: false, type: 'boolean', category: 'payment' },

      { key: 'flat_rate_shipping', value: 5.99, type: 'number', category: 'shipping' },

      { key: 'email_from', value: 'no-reply@shop.local', type: 'string', category: 'email' },

      { key: 'default_meta_title', value: 'Shop – Multi-Vendor Marketplace', type: 'string', category: 'seo' },
      { key: 'default_meta_description', value: 'Discover products from multiple vendors.', type: 'string', category: 'seo' },
    ];

    for (const s of defaults) {
      await Setting.updateOne({ key: s.key }, { $setOnInsert: s }, { upsert: true });
    }

    console.log('✅ Settings seeded');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
