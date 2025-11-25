// Run with: node apps/api/scripts/seedUser.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const { hashPassword } = require('../src/utils/hash');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('[seed] Connected:', MONGO_URI);

  // Admin
  const adminEmail = 'admin@example.com';
  const adminPass = 'Password123'; // <= you will use this to login
  const adminExisting = await User.findOne({ email: adminEmail }).select('+password');

  if (!adminExisting) {
    const admin = await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: await hashPassword(adminPass),
      role: 'admin',
    });
    console.log('✅ Admin created:', admin.email, 'password:', adminPass);
  } else {
    // ensure role admin; don’t overwrite password if exists
    adminExisting.role = 'admin';
    await adminExisting.save();
    console.log('ℹ️  Admin already exists:', adminEmail, '(role ensured = admin)');
  }

  // A normal demo customer (optional)
  const demoEmail = 'demo@example.com';
  const demoPass = 'Password123';
  const demoExisting = await User.findOne({ email: demoEmail }).select('+password');
  if (!demoExisting) {
    const demo = await User.create({
      name: 'Demo Customer',
      email: demoEmail,
      password: await hashPassword(demoPass),
      role: 'customer',
    });
    console.log('✅ Customer created:', demo.email, 'password:', demoPass);
  } else {
    console.log('ℹ️  Customer already exists:', demoEmail);
  }

  // Test customer for Cypress
  const customerEmail = 'customer@example.com';
  const customerPass = 'Customer@123';
  const customerExisting = await User.findOne({ email: customerEmail }).select('+password');
  if (!customerExisting) {
    const customer = await User.create({
      name: 'Test Customer',
      email: customerEmail,
      password: await hashPassword(customerPass),
      role: 'customer',
      emailVerified: true, // Pre-verify for testing
    });
    console.log('✅ Test Customer created:', customer.email, 'password:', customerPass);
  } else {
    // Update existing customer
    customerExisting.password = await hashPassword(customerPass);
    customerExisting.emailVerified = true;
    customerExisting.role = 'customer';
    customerExisting.loginAttempts = 0; // Reset failed login attempts
    customerExisting.lockUntil = undefined; // Unlock account
    await customerExisting.save();
    console.log('✅ Test Customer updated:', customerEmail, 'password:', customerPass, '(account unlocked)');
  }

  // Test vendor for Cypress
  const vendorEmail = 'vendor@example.com';
  const vendorPass = 'Vendor@123';
  const vendorExisting = await User.findOne({ email: vendorEmail }).select('+password');
  if (!vendorExisting) {
    const vendor = await User.create({
      name: 'Test Vendor',
      email: vendorEmail,
      password: await hashPassword(vendorPass),
      role: 'vendor',
      emailVerified: true, // Pre-verify for testing
    });
    console.log('✅ Test Vendor created:', vendor.email, 'password:', vendorPass);
  } else {
    // Update existing vendor
    vendorExisting.password = await hashPassword(vendorPass);
    vendorExisting.emailVerified = true;
    vendorExisting.role = 'vendor';
    vendorExisting.loginAttempts = 0; // Reset failed login attempts
    vendorExisting.lockUntil = undefined; // Unlock account
    await vendorExisting.save();
    console.log('✅ Test Vendor updated:', vendorEmail, 'password:', vendorPass, '(account unlocked)');
  }

  // Update admin password to match Cypress if needed
  const adminForCypress = await User.findOne({ email: 'admin@example.com' }).select('+password');
  if (adminForCypress) {
    // Update to use Admin@123 for Cypress consistency
    adminForCypress.password = await hashPassword('Admin@123');
    adminForCypress.emailVerified = true; // Pre-verify for testing
    adminForCypress.loginAttempts = 0; // Reset failed login attempts
    adminForCypress.lockUntil = undefined; // Unlock account
    await adminForCypress.save();
    console.log('✅ Admin password updated to: Admin@123 (for Cypress, account unlocked)');
  }

  await mongoose.disconnect();
  console.log('✅ Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
