// FILE: apps/api/scripts/reassignProducts.js
// Reassigns all products to a specific vendor by storeName or email
// Usage: node scripts/reassignProducts.js "Vtech"
//    or: node scripts/reassignProducts.js vendor@email.com

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
const Vendor = require('../src/models/Vendor');
const Product = require('../src/models/Product');
const User = require('../src/models/User');

(async function run() {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log('[reassign] Connected to DB\n');

    const target = process.argv[2];

    // List all vendors
    const allVendors = await Vendor.find({}).populate('userId', 'email name');
    console.log('--- All Vendors ---');
    allVendors.forEach((v) => {
      const productCount = '(checking...)';
      console.log(`  ${v.storeName} | ${v.userId?.email || 'no-user'} | ID: ${v._id} | Status: ${v.status}`);
    });
    console.log('');

    // Count products per vendor
    for (const v of allVendors) {
      const count = await Product.countDocuments({ vendorId: v._id });
      console.log(`  ${v.storeName}: ${count} products`);
    }
    console.log('');

    if (!target) {
      console.log('Usage: node scripts/reassignProducts.js <storeName or email>');
      console.log('Example: node scripts/reassignProducts.js "Vtech"');
      process.exit(0);
    }

    // Find target vendor by storeName (case-insensitive) or by user email
    let targetVendor = await Vendor.findOne({
      storeName: { $regex: new RegExp(`^${target}$`, 'i') },
    });

    if (!targetVendor) {
      const user = await User.findOne({ email: target.toLowerCase() });
      if (user) {
        targetVendor = await Vendor.findOne({ userId: user._id });
      }
    }

    if (!targetVendor) {
      console.error(`❌ Vendor not found: "${target}"`);
      process.exit(1);
    }

    console.log(`Target vendor: ${targetVendor.storeName} (ID: ${targetVendor._id})`);

    // Reassign all products NOT belonging to target vendor
    const result = await Product.updateMany(
      { vendorId: { $ne: targetVendor._id } },
      { $set: { vendorId: targetVendor._id } }
    );

    console.log(`\n✅ Reassigned ${result.modifiedCount} products to "${targetVendor.storeName}"`);

    // Update vendor's totalProducts count
    const totalProducts = await Product.countDocuments({ vendorId: targetVendor._id });
    await Vendor.updateOne({ _id: targetVendor._id }, { totalProducts });
    console.log(`✅ Updated totalProducts count: ${totalProducts}`);

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
