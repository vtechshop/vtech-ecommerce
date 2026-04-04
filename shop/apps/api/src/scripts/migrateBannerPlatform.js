// FILE: apps/api/src/scripts/migrateBannerPlatform.js
// Run: node src/scripts/migrateBannerPlatform.js
//
// This migration fixes banners that were created before the platform field was
// standardised. Old banners may have:
//   - platform: 'both'  (old default — these appear on mobile incorrectly)
//   - platform: 'web'   (old alias for 'website')
//   - platform: null / missing
// All of these should be treated as 'website'-only unless explicitly set to
// 'mobile' or 'both' by the admin.
//
// SAFE to run multiple times — only updates banners that need fixing.

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Banner = require('../models/Banner');

async function migrate() {
  await connectDB();
  console.log('Connected to MongoDB');

  // 1. Fix banners with platform: 'web' → 'website'
  const webFix = await Banner.updateMany(
    { platform: 'web' },
    { $set: { platform: 'website' } }
  );
  console.log(`Fixed platform:'web' → 'website': ${webFix.modifiedCount} banner(s)`);

  // 2. Fix banners with platform: 'both' → 'website'
  //    (old default was 'both', but those should be website-only)
  const bothFix = await Banner.updateMany(
    { platform: 'both' },
    { $set: { platform: 'website' } }
  );
  console.log(`Fixed platform:'both' → 'website': ${bothFix.modifiedCount} banner(s)`);

  // 3. Fix banners with no platform field or null → 'website'
  const nullFix = await Banner.updateMany(
    { $or: [{ platform: { $exists: false } }, { platform: null }, { platform: '' }] },
    { $set: { platform: 'website' } }
  );
  console.log(`Fixed platform:null/missing → 'website': ${nullFix.modifiedCount} banner(s)`);

  // Show final state
  const all = await Banner.find({}, 'title platform').lean();
  console.log('\nAll banners after migration:');
  all.forEach(b => console.log(`  [${b.platform}] ${b.title || '(no title)'}`));

  await mongoose.disconnect();
  console.log('\nMigration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
