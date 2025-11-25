// FILE: apps/api/src/seed/convertPricesToINR.js
// Script to convert existing product prices from USD to INR
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const logger = require('../config/logger');
const Product = require('../models/Product');

// Current USD to INR exchange rate (you can adjust this)
const USD_TO_INR_RATE = 83;

const convertPricesToINR = async () => {
  try {
    await connectDB();
    logger.info('Starting price conversion from USD to INR...');
    logger.info(`Using conversion rate: 1 USD = ${USD_TO_INR_RATE} INR`);

    // Get all products
    const products = await Product.find({});
    logger.info(`Found ${products.length} products to convert`);

    let convertedCount = 0;

    for (const product of products) {
      // Convert main price
      if (product.price) {
        product.price = Math.round(product.price * USD_TO_INR_RATE);
      }

      // Convert compare at price
      if (product.compareAt) {
        product.compareAt = Math.round(product.compareAt * USD_TO_INR_RATE);
      }

      // Convert cost price
      if (product.cost) {
        product.cost = Math.round(product.cost * USD_TO_INR_RATE);
      }

      // Convert variant prices if they exist
      if (product.variants && product.variants.length > 0) {
        product.variants = product.variants.map(variant => {
          if (variant.price) {
            variant.price = Math.round(variant.price * USD_TO_INR_RATE);
          }
          if (variant.compareAt) {
            variant.compareAt = Math.round(variant.compareAt * USD_TO_INR_RATE);
          }
          return variant;
        });
      }

      await product.save();
      convertedCount++;

      if (convertedCount % 10 === 0) {
        logger.info(`Converted ${convertedCount} products...`);
      }
    }

    logger.info(`✅ Successfully converted ${convertedCount} products to INR pricing!`);
    logger.info('\nConversion Summary:');
    logger.info(`- Total products processed: ${products.length}`);
    logger.info(`- Conversion rate used: 1 USD = ${USD_TO_INR_RATE} INR`);
    logger.info('- All prices have been rounded to nearest rupee');

    process.exit(0);
  } catch (error) {
    logger.error('Price conversion failed:', error);
    process.exit(1);
  }
};

// Only run if executed directly
if (require.main === module) {
  convertPricesToINR();
}

module.exports = convertPricesToINR;
