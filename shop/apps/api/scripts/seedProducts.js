// FILE: apps/api/scripts/seedProducts.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');

const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const { slugify } = require('../src/utils/helpers');

(async function run() {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log('[seed] Connected');

    // 1) Ensure a vendor user exists
    let vendorUser = await User.findOne({ email: 'vendor@example.com' }).select('+password');
    if (!vendorUser) {
      vendorUser = await User.create({
        name: 'Demo Vendor',
        email: 'vendor@example.com',
        password: 'Password@123', // hashed by pre-save? if not, it’s fine for demo
        role: 'vendor',
      });
      console.log('✓ vendor user');
    }

    // 2) Ensure Vendor profile exists
    let vendor = await Vendor.findOne({ userId: vendorUser._id });
    if (!vendor) {
      vendor = await Vendor.create({
        userId: vendorUser._id,
        storeName: 'Demo Store',
        slug: 'demo-store',
        status: 'active',
      });
      console.log('✓ vendor profile');
    }

    // 3) Grab a couple of categories (fallback to first ones)
    const categories = await Category.find({}).limit(2);
    if (categories.length === 0) {
      throw new Error('No categories found. Seed categories first.');
    }

    const samples = [
      {
        title: 'iPhone 15 Pro',
        description: 'Latest Apple flagship',
        price: 120000,
        stock: 25,
        images: ['https://via.placeholder.com/600x600?text=iPhone+15+Pro'],
      },
      {
        title: 'Samsung Galaxy S24',
        description: 'Samsung flagship phone',
        price: 95000,
        stock: 40,
        images: ['https://via.placeholder.com/600x600?text=Galaxy+S24'],
      },
      {
        title: 'OnePlus 12',
        description: 'Fast & smooth',
        price: 65000,
        stock: 50,
        images: ['https://via.placeholder.com/600x600?text=OnePlus+12'],
      },
    ];

    for (const s of samples) {
      const existing = await Product.findOne({ slug: slugify(s.title) });
      if (existing) continue;

      await Product.create({
        title: s.title,
        slug: slugify(s.title),
        description: s.description,
        vendorId: vendor._id,
        categoryId: categories[0]._id,
        subcategoryId: categories[1]?._id,
        price: s.price,
        stock: s.stock,
        images: s.images,
        published: true, // so it shows up right away
        featured: true, // mark as featured for homepage display
      });
      console.log('✓ product:', s.title);
    }

    console.log('✅ Products seeded');
    process.exit(0);
  } catch (e) {
    console.error('❌ Seed error:', e);
    process.exit(1);
  }
})();
