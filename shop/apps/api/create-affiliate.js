const mongoose = require('mongoose');
const User = require('./src/models/User');
const Affiliate = require('./src/models/Affiliate');

// Generate a unique affiliate code
function generateAffiliateCode(name) {
  const prefix = name.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
}

async function createAffiliate() {
  try {
    await mongoose.connect('mongodb://localhost:27017/shop');
    console.log('Connected to database\n');

    const email = 'chinu1@gmail.com';

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      await mongoose.disconnect();
      return;
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`User role: ${user.role}\n`);

    // Check if Affiliate document already exists
    const existingAffiliate = await Affiliate.findOne({ userId: user._id });
    if (existingAffiliate) {
      console.log('✅ Affiliate document already exists:');
      console.log(`  Code: ${existingAffiliate.code}`);
      console.log(`  Status: ${existingAffiliate.status}`);
      await mongoose.disconnect();
      return;
    }

    // Generate unique affiliate code
    let code = generateAffiliateCode(user.name);

    // Ensure code is unique
    let existingCode = await Affiliate.findOne({ code });
    while (existingCode) {
      code = generateAffiliateCode(user.name);
      existingCode = await Affiliate.findOne({ code });
    }

    // Create Affiliate document
    const affiliate = await Affiliate.create({
      userId: user._id,
      code: code,
      status: 'active', // Set to active by default
      kyc: {
        status: 'pending', // KYC is pending by default
      },
      commissionPercentage: 5, // Default 5% commission
      totalClicks: 0,
      totalConversions: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      paidEarnings: 0,
    });

    console.log('✅ Affiliate document created successfully!\n');
    console.log('Affiliate Details:');
    console.log(`  ID: ${affiliate._id}`);
    console.log(`  User: ${user.name} (${user.email})`);
    console.log(`  Code: ${affiliate.code}`);
    console.log(`  Status: ${affiliate.status}`);
    console.log(`  KYC Status: ${affiliate.kyc.status}`);
    console.log(`  Commission: ${affiliate.commissionPercentage}%`);
    console.log(`  Created: ${affiliate.createdAt}`);
    console.log('\n✅ User will now appear in admin affiliate list!');

    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createAffiliate();
