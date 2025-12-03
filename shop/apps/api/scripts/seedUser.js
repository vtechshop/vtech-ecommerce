// Run with: node apps/api/scripts/seedUser.js
// This script creates TEST users for LOCAL DEVELOPMENT ONLY
// DO NOT run this in production!
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const { hashPassword } = require('../src/utils/hash');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

// Generate random secure password for seeding
function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const special = '!@#$%^&*';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += special.charAt(Math.floor(Math.random() * special.length));
  password += Math.floor(Math.random() * 10);
  return password;
}

async function main() {
  // Safety check - don't run in production
  if (process.env.NODE_ENV === 'production') {
    console.log('❌ This script should NOT be run in production!');
    console.log('   Use ADMIN_EMAIL and ADMIN_PASSWORD env vars with resetAdminPassword.js instead.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('[seed] Connected to database');
  console.log('⚠️  Creating TEST users for LOCAL DEVELOPMENT ONLY\n');

  // Generate passwords at runtime (not hardcoded)
  const adminPass = process.env.SEED_ADMIN_PASS || generateSecurePassword();
  const customerPass = process.env.SEED_CUSTOMER_PASS || generateSecurePassword();
  const vendorPass = process.env.SEED_VENDOR_PASS || generateSecurePassword();

  // Admin
  const adminEmail = 'admin@example.com';
  const adminExisting = await User.findOne({ email: adminEmail }).select('+password');

  if (!adminExisting) {
    await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: await hashPassword(adminPass),
      role: 'admin',
      emailVerified: true,
    });
    console.log('✅ Admin created:', adminEmail);
    console.log('   Password:', adminPass);
  } else {
    adminExisting.role = 'admin';
    adminExisting.password = await hashPassword(adminPass);
    adminExisting.emailVerified = true;
    adminExisting.loginAttempts = 0;
    adminExisting.lockUntil = undefined;
    await adminExisting.save();
    console.log('✅ Admin updated:', adminEmail);
    console.log('   Password:', adminPass);
  }

  // Test customer
  const customerEmail = 'customer@example.com';
  const customerExisting = await User.findOne({ email: customerEmail }).select('+password');
  if (!customerExisting) {
    await User.create({
      name: 'Test Customer',
      email: customerEmail,
      password: await hashPassword(customerPass),
      role: 'customer',
      emailVerified: true,
    });
    console.log('✅ Customer created:', customerEmail);
    console.log('   Password:', customerPass);
  } else {
    customerExisting.password = await hashPassword(customerPass);
    customerExisting.emailVerified = true;
    customerExisting.role = 'customer';
    customerExisting.loginAttempts = 0;
    customerExisting.lockUntil = undefined;
    await customerExisting.save();
    console.log('✅ Customer updated:', customerEmail);
    console.log('   Password:', customerPass);
  }

  // Test vendor
  const vendorEmail = 'vendor@example.com';
  const vendorExisting = await User.findOne({ email: vendorEmail }).select('+password');
  if (!vendorExisting) {
    await User.create({
      name: 'Test Vendor',
      email: vendorEmail,
      password: await hashPassword(vendorPass),
      role: 'vendor',
      emailVerified: true,
    });
    console.log('✅ Vendor created:', vendorEmail);
    console.log('   Password:', vendorPass);
  } else {
    vendorExisting.password = await hashPassword(vendorPass);
    vendorExisting.emailVerified = true;
    vendorExisting.role = 'vendor';
    vendorExisting.loginAttempts = 0;
    vendorExisting.lockUntil = undefined;
    await vendorExisting.save();
    console.log('✅ Vendor updated:', vendorEmail);
    console.log('   Password:', vendorPass);
  }

  await mongoose.disconnect();
  console.log('\n✅ Done. Save these credentials - they are generated randomly each time!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
