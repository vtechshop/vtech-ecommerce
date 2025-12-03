// Run with: node apps/api/scripts/resetAdminPassword.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const { hashPassword } = require('../src/utils/hash');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('[resetAdmin] Connected:', MONGO_URI);

  const oldEmail = 'ledvtech@gmail.com';
  const newEmail = 'admin@vtechkitchen.com';
  const newPassword = 'Vtech#8090';

  const admin = await User.findOne({ email: oldEmail });

  if (!admin) {
    console.log('❌ Admin user not found with email:', oldEmail);
    process.exit(1);
  }

  admin.email = newEmail;
  admin.password = await hashPassword(newPassword);
  admin.failedLoginAttempts = 0;
  admin.lockUntil = null;
  await admin.save();

  console.log('✅ Admin updated successfully!');
  console.log('New Email:', newEmail);
  console.log('New Password:', newPassword);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
