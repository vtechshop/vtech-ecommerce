const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdminAccount() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ecommerce');
    console.log('Connected to MongoDB');

    // Define User schema
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });

    if (existingAdmin) {
      console.log('Admin account already exists. Updating password and ensuring role is admin...');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Password123', salt);
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      existingAdmin.emailVerified = true;
      existingAdmin.loginAttempts = 0;
      existingAdmin.lockUntil = undefined;

      await existingAdmin.save();
      console.log('✓ Admin account updated successfully');
    } else {
      console.log('Creating new admin account...');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Password123', salt);

      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@example.com',
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
    console.log('  Email: admin@example.com');
    console.log('  Password: Password123');
    console.log('  Role: admin');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdminAccount();
