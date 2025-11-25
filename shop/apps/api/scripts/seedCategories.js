// FILE: apps/api/scripts/seedCategories.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // apps/api/.env
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') }); // project .env fallback

const Category = require('../src/models/Category');

const categories = [
  { name: 'Electronics', slug: 'electronics', isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Fashion', slug: 'fashion', isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Home & Garden', slug: 'home-garden', isActive: true, createdAt: new Date(), updatedAt: new Date() },
  { name: 'Sports', slug: 'sports', isActive: true, createdAt: new Date(), updatedAt: new Date() },
];

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shop';
    await mongoose.connect(uri);
    console.log('[seed] Connected:', uri);

    // Clean old data
    await Category.deleteMany({ slug: { $in: categories.map(c => c.slug) } });

    // Insert new categories
    await Category.insertMany(categories);

    console.log('✅ Categories seeded');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
})();
