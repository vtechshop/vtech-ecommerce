// Unlock Admin Account Script
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

console.log('🔓 Unlocking admin account...');
console.log('Connecting to:', mongoUri);

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB');

    return mongoose.connection.db.collection('users').updateOne(
      { email: 'admin@example.com' },
      { $unset: { loginAttempts: '', lockUntil: '' } }
    );
  })
  .then(result => {
    console.log('\n✅ ADMIN ACCOUNT UNLOCKED!');
    console.log('   Modified:', result.modifiedCount, 'user(s)');

    if (result.modifiedCount === 0) {
      console.log('   (Account was already unlocked)');
    }

    console.log('\n✅ You can now login with:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('\n   Refresh your browser and try logging in again!');

    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });
