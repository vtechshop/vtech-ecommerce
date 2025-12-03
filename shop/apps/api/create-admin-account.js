// Run with: ADMIN_EMAIL=xxx ADMIN_PASSWORD=xxx node apps/api/create-admin-account.js
// This script creates or updates an admin account
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdminAccount() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('❌ Usage: ADMIN_EMAIL=xxx ADMIN_PASSWORD=xxx node apps/api/create-admin-account.js');
    console.log('   Example: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=MySecure@123 node apps/api/create-admin-account.js');
    process.exit(1);
  }

  // Password validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  if (!passwordRegex.test(adminPassword)) {
    console.log('❌ Password must contain: uppercase, lowercase, number, special char (!@#$%^&*), min 8 chars');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Define User schema
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    if (existingAdmin) {
      console.log('Admin account already exists. Updating password and ensuring role is admin...');

      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      existingAdmin.emailVerified = true;
      existingAdmin.loginAttempts = 0;
      existingAdmin.lockUntil = undefined;

      await existingAdmin.save();
      console.log('✓ Admin account updated successfully');
    } else {
      console.log('Creating new admin account...');

      const adminUser = new User({
        name: 'Admin User',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        emailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await adminUser.save();
      console.log('✓ Admin account created successfully');
    }

    console.log('\nAdmin credentials:');
    console.log('  Email:', adminEmail);
    console.log('  Role: admin');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdminAccount();
