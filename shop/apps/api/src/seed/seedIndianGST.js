// FILE: apps/api/src/seed/seedIndianGST.js
// Seed Indian GST tax rates for all states and union territories
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const logger = require('../config/logger');
const Tax = require('../models/Tax');

// Indian States and Union Territories with GST configuration
const indianGSTRates = [
  // States
  { name: 'Andhra Pradesh', code: 'AP', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Arunachal Pradesh', code: 'AR', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Assam', code: 'AS', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Bihar', code: 'BR', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Chhattisgarh', code: 'CG', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Goa', code: 'GA', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Gujarat', code: 'GJ', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Haryana', code: 'HR', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Himachal Pradesh', code: 'HP', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Jharkhand', code: 'JH', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Karnataka', code: 'KA', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Kerala', code: 'KL', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Madhya Pradesh', code: 'MP', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Maharashtra', code: 'MH', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Manipur', code: 'MN', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Meghalaya', code: 'ML', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Mizoram', code: 'MZ', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Nagaland', code: 'NL', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Odisha', code: 'OR', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Punjab', code: 'PB', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Rajasthan', code: 'RJ', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Sikkim', code: 'SK', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Tamil Nadu', code: 'TN', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Telangana', code: 'TS', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Tripura', code: 'TR', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Uttar Pradesh', code: 'UP', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Uttarakhand', code: 'UK', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'West Bengal', code: 'WB', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },

  // Union Territories
  { name: 'Andaman and Nicobar Islands', code: 'AN', country: 'IN', gstRate: 0.18, cgst: 0.09, utgst: 0.09 },
  { name: 'Chandigarh', code: 'CH', country: 'IN', gstRate: 0.18, cgst: 0.09, utgst: 0.09 },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DH', country: 'IN', gstRate: 0.18, cgst: 0.09, utgst: 0.09 },
  { name: 'Delhi', code: 'DL', country: 'IN', gstRate: 0.18, cgst: 0.09, sgst: 0.09 },
  { name: 'Jammu and Kashmir', code: 'JK', country: 'IN', gstRate: 0.18, cgst: 0.09, utgst: 0.09 },
  { name: 'Ladakh', code: 'LA', country: 'IN', gstRate: 0.18, cgst: 0.09, utgst: 0.09 },
  { name: 'Lakshadweep', code: 'LD', country: 'IN', gstRate: 0.18, cgst: 0.09, utgst: 0.09 },
  { name: 'Puducherry', code: 'PY', country: 'IN', gstRate: 0.18, cgst: 0.09, utgst: 0.09 },
];

const seedIndianGST = async () => {
  try {
    await connectDB();
    logger.info('Starting Indian GST tax rates seed...');

    // Drop old indexes that might cause conflicts
    try {
      await Tax.collection.dropIndexes();
      logger.info('Dropped old indexes');
    } catch (e) {
      // Ignore error if no indexes exist
    }

    // Clear existing Indian tax rates (optional)
    await Tax.deleteMany({ countries: 'IN' });
    logger.info('Cleared existing Indian tax rates');

    // Insert GST rates for all states and UTs
    const taxDocs = indianGSTRates.map(state => ({
      name: `${state.name} - GST ${state.gstRate * 100}%`,
      rate: state.gstRate * 100, // Convert 0.18 to 18
      type: 'percentage',
      countries: [state.country],
      states: [state.code],
      gstComponents: {
        cgst: state.cgst * 100, // Convert 0.09 to 9
        sgst: state.sgst ? state.sgst * 100 : undefined,
        utgst: state.utgst ? state.utgst * 100 : undefined,
        igst: state.gstRate * 100, // IGST applies for inter-state transactions
      },
      isActive: true,
    }));

    await Tax.insertMany(taxDocs);

    logger.info(`✅ Successfully seeded ${taxDocs.length} Indian GST tax rates!`);
    logger.info('\nGST Configuration:');
    logger.info('- Standard GST Rate: 18% (CGST 9% + SGST/UTGST 9%)');
    logger.info('- IGST: 18% (for inter-state transactions)');
    logger.info(`- States covered: ${indianGSTRates.filter(s => s.sgst).length}`);
    logger.info(`- Union Territories covered: ${indianGSTRates.filter(s => s.utgst).length}`);
    logger.info('\nNote: You can customize GST rates per product category if needed.');
    logger.info('Common GST rates in India: 0%, 5%, 12%, 18%, 28%');

    process.exit(0);
  } catch (error) {
    logger.error('GST seed failed:', error);
    console.error('Full error:', error);
    process.exit(1);
  }
};

// Only run if executed directly
if (require.main === module) {
  seedIndianGST();
}

module.exports = seedIndianGST;
