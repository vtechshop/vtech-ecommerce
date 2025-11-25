// Run with: node scripts/fixUserRoles.js
// This script fixes users who have vendor/affiliate role but no vendor/affiliate profile
// It resets them back to 'customer' role

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');
const Affiliate = require('../src/models/Affiliate');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('[fixUserRoles] Connected:', MONGO_URI);

  // Find all users with vendor role
  const vendorUsers = await User.find({ role: 'vendor' });
  console.log(`\nFound ${vendorUsers.length} users with 'vendor' role`);

  let fixedVendors = 0;
  for (const user of vendorUsers) {
    // Check if they have a vendor profile
    const vendorProfile = await Vendor.findOne({ userId: user._id });

    if (!vendorProfile) {
      // No vendor profile - reset to customer
      user.role = 'customer';
      await user.save();
      console.log(`✅ Reset ${user.email} (${user.name}) from vendor to customer - no vendor profile found`);
      fixedVendors++;
    } else {
      console.log(`ℹ️  ${user.email} has valid vendor profile - keeping vendor role`);
    }
  }

  // Find all users with affiliate role
  const affiliateUsers = await User.find({ role: 'affiliate' });
  console.log(`\nFound ${affiliateUsers.length} users with 'affiliate' role`);

  let fixedAffiliates = 0;
  for (const user of affiliateUsers) {
    // Check if they have an affiliate profile
    const affiliateProfile = await Affiliate.findOne({ userId: user._id });

    if (!affiliateProfile) {
      // No affiliate profile - reset to customer
      user.role = 'customer';
      await user.save();
      console.log(`✅ Reset ${user.email} (${user.name}) from affiliate to customer - no affiliate profile found`);
      fixedAffiliates++;
    } else {
      console.log(`ℹ️  ${user.email} has valid affiliate profile - keeping affiliate role`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Fixed ${fixedVendors} vendor users without vendor profiles`);
  console.log(`   - Fixed ${fixedAffiliates} affiliate users without affiliate profiles`);

  // List all current user roles
  console.log(`\n👥 Current user roles in database:`);
  const allUsers = await User.find({}).select('name email role');
  const roleCount = {};

  for (const user of allUsers) {
    roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    console.log(`   ${user.email} - ${user.role} (${user.name})`);
  }

  console.log(`\n📈 Role distribution:`);
  Object.entries(roleCount).forEach(([role, count]) => {
    console.log(`   ${role}: ${count}`);
  });

  await mongoose.disconnect();
  console.log('\n✅ Done.');
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
