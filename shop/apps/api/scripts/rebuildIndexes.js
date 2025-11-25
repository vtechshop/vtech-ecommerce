// FILE: scripts/rebuildIndexes.js
// Script to drop and rebuild MongoDB indexes to fix duplicate index warnings

const mongoose = require('mongoose');
require('dotenv').config();

const models = [
  '../src/models/Cart',
  '../src/models/Affiliate',
  '../src/models/Product',
  '../src/models/Vendor',
  '../src/models/Category',
];

const rebuildIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shop');
    console.log('✅ Connected to MongoDB');

    // Load all models
    const loadedModels = models.map(modelPath => require(modelPath));

    // Drop and rebuild indexes for each model
    for (const Model of loadedModels) {
      const modelName = Model.modelName;
      console.log(`\n📋 Processing ${modelName}...`);

      try {
        // Drop all indexes except _id
        await Model.collection.dropIndexes();
        console.log(`   ✓ Dropped old indexes for ${modelName}`);
      } catch (err) {
        if (err.code === 26 || err.codeName === 'NamespaceNotFound') {
          console.log(`   ℹ No collection found for ${modelName}, will create on first document`);
        } else {
          console.log(`   ⚠ Warning while dropping indexes for ${modelName}:`, err.message);
        }
      }

      try {
        // Create new indexes defined in schema
        await Model.syncIndexes();
        console.log(`   ✓ Rebuilt indexes for ${modelName}`);
      } catch (err) {
        console.log(`   ⚠ Warning while building indexes for ${modelName}:`, err.message);
      }
    }

    console.log('\n✅ Index rebuild complete!');
    console.log('\nℹ️  Restart your API server to see the changes.');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error rebuilding indexes:', error);
    process.exit(1);
  }
};

rebuildIndexes();
