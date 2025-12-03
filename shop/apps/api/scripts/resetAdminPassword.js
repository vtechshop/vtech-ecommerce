// Run with: ADMIN_EMAIL=xxx ADMIN_PASSWORD=xxx node apps/api/scripts/resetAdminPassword.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const { hashPassword } = require('../src/utils/hash');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const newPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !newPassword) {
    console.log('❌ Usage: ADMIN_EMAIL=xxx ADMIN_PASSWORD=xxx node apps/api/scripts/resetAdminPassword.js');
    console.log('   Example: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=MySecure@123 node apps/api/scripts/resetAdminPassword.js');
    process.exit(1);
  }

  // Password validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    console.log('❌ Password must contain: uppercase, lowercase, number, special char (!@#$%^&*), min 8 chars');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('[resetAdmin] Connected to database');

  const admin = await User.findOne({ email: adminEmail });

  if (!admin) {
    console.log('❌ Admin user not found with email:', adminEmail);
    await mongoose.disconnect();
    process.exit(1);
  }

  admin.password = await hashPassword(newPassword);
  admin.failedLoginAttempts = 0;
  admin.lockUntil = null;
  await admin.save();

  console.log('✅ Admin password reset successfully!');
  console.log('Email:', adminEmail);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
