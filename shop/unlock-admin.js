// Unlock Admin Account Script
require('dotenv').config({ path: './apps/api/.env' });
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

console.log('Connecting to MongoDB...');

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log('🔓 Unlocking admin account...');

    return mongoose.connection.db.collection('users').updateOne(
      { email: 'admin@example.com' },
      { $unset: { loginAttempts: '', lockUntil: '' } }
    );
  })
  .then(result => {
    console.log('✅ Admin account unlocked!');
    console.log('   Modified:', result.modifiedCount, 'user(s)');

    if (result.modifiedCount === 0) {
      console.log('   ⚠️  Account was not locked or user not found');
      console.log('   Checking if admin user exists...');

      return mongoose.connection.db.collection('users').findOne(
        { email: 'admin@example.com' }
      );
    }

    return null;
  })
  .then(user => {
    if (user === null) {
      // Account was unlocked successfully
      console.log('\n✅ You can now login with:');
      console.log('   Email: admin@example.com');
      console.log('   Password: admin123');
    } else if (user) {
      console.log('\n✅ Admin user found:');
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   Login attempts reset!');
    } else {
      console.log('\n❌ Admin user not found in database!');
      console.log('   You may need to create an admin user first.');
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
