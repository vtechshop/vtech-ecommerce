// Run with: node scripts/resetDemoCustomers.js
// This script resets demo "customer" accounts that were mistakenly given vendor role

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

// Emails of demo accounts that should be customers, not vendors
const DEMO_CUSTOMER_EMAILS = [
  'customer@shop.test',
  'demo@example.com',
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('[resetDemoCustomers] Connected:', MONGO_URI);

  console.log('\n🔍 Checking demo customer accounts...\n');

  for (const email of DEMO_CUSTOMER_EMAILS) {
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`⚠️  User not found: ${email}`);
      continue;
    }

    console.log(`\n📧 ${email}:`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Current Role: ${user.role}`);

    // Check if they have a vendor profile
    const vendorProfile = await Vendor.findOne({ userId: user._id });

    if (vendorProfile) {
      console.log(`   Vendor Profile: YES (${vendorProfile.storeName})`);
      console.log(`   Action: Deleting vendor profile and resetting role to customer...`);

      // Delete the vendor profile
      await Vendor.findByIdAndDelete(vendorProfile._id);

      // Reset user role to customer
      user.role = 'customer';
      await user.save();

      console.log(`   ✅ ${email} reset to customer role (vendor profile deleted)`);
    } else {
      if (user.role !== 'customer') {
        console.log(`   Vendor Profile: NO`);
        console.log(`   Action: Resetting role to customer...`);

        user.role = 'customer';
        await user.save();

        console.log(`   ✅ ${email} reset to customer role`);
      } else {
        console.log(`   Vendor Profile: NO`);
        console.log(`   ✅ Already a customer - no action needed`);
      }
    }
  }

  // Show final status
  console.log(`\n\n📊 Final Status of Demo Accounts:`);
  for (const email of DEMO_CUSTOMER_EMAILS) {
    const user = await User.findOne({ email });
    if (user) {
      const vendorProfile = await Vendor.findOne({ userId: user._id });
      console.log(`   ${email}: ${user.role} ${vendorProfile ? '(has vendor profile)' : '(no vendor profile)'}`);
    }
  }

  await mongoose.disconnect();
  console.log('\n✅ Done.');
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
