// FILE: apps/api/src/seed/setupINRCurrency.js
// Master script to setup INR currency configuration
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const logger = require('../config/logger');

const seedSettings = async () => {
  const Setting = require('../models/Setting');
  const defaultSettings = require('./seedSettings');

  logger.info('📝 Updating settings to INR...');

  // Re-run settings seed (it uses upsert, so it's safe)
  const { execSync } = require('child_process');
  execSync('node src/seed/seedSettings.js', {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
};

const convertPrices = async () => {
  const Product = require('../models/Product');
  const productCount = await Product.countDocuments();

  if (productCount === 0) {
    logger.info('⏭️  No products found, skipping price conversion...');
    return;
  }

  logger.info(`💰 Converting ${productCount} product prices to INR...`);
  const convertPricesToINR = require('./convertPricesToINR');
  await convertPricesToINR();
};

const setupGST = async () => {
  logger.info('🏛️  Setting up Indian GST tax rates...');
  const seedIndianGST = require('./seedIndianGST');
  await seedIndianGST();
};

const setupINRCurrency = async () => {
  try {
    await connectDB();

    logger.info('');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('🇮🇳  SETTING UP INR CURRENCY FOR YOUR E-COMMERCE PLATFORM');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');

    // Step 1: Update settings
    logger.info('Step 1/3: Updating site settings...');
    await seedSettings();
    logger.info('✅ Settings updated\n');

    // Step 2: Convert existing product prices
    logger.info('Step 2/3: Converting product prices...');
    await convertPrices();
    logger.info('✅ Product prices converted\n');

    // Step 3: Setup GST
    logger.info('Step 3/3: Setting up GST tax rates...');
    await setupGST();
    logger.info('✅ GST tax rates configured\n');

    logger.info('═══════════════════════════════════════════════════════');
    logger.info('✅ INR CURRENCY SETUP COMPLETED SUCCESSFULLY!');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');
    logger.info('Summary of changes:');
    logger.info('✓ Currency changed from USD to INR');
    logger.info('✓ Locale changed to en-IN (₹ symbol)');
    logger.info('✓ Timezone changed to Asia/Kolkata (IST)');
    logger.info('✓ Tax rate updated to 18% GST');
    logger.info('✓ Shipping costs updated to INR');
    logger.info('✓ COD limit set to ₹40,000');
    logger.info('✓ Free shipping threshold set to ₹8,000');
    logger.info('✓ Razorpay payment gateway enabled');
    logger.info('✓ GST rates configured for all Indian states');
    logger.info('');
    logger.info('Next steps:');
    logger.info('1. Set up Razorpay API keys in .env file:');
    logger.info('   RAZORPAY_KEY_ID=your_key_id');
    logger.info('   RAZORPAY_KEY_SECRET=your_key_secret');
    logger.info('');
    logger.info('2. Restart your application to apply changes');
    logger.info('');
    logger.info('3. Test the checkout flow with INR pricing');
    logger.info('');

    process.exit(0);
  } catch (error) {
    logger.error('❌ INR setup failed:', error);
    logger.error(error.stack);
    process.exit(1);
  }
};

// Only run if executed directly
if (require.main === module) {
  setupINRCurrency();
}

module.exports = setupINRCurrency;
