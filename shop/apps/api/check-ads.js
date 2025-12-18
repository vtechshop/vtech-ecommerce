// Diagnostic script to check ad placements
// Run with: node check-ads.js

const mongoose = require('mongoose');

// Update this with your MongoDB connection string
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

const adCampaignSchema = new mongoose.Schema({}, { strict: false });
const AdCampaign = mongoose.model('AdCampaign', adCampaignSchema);

async function checkAds() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find ALL campaigns (regardless of status)
    const allCampaigns = await AdCampaign.find({})
      .select('name placement position status bid startAt endAt')
      .lean();

    console.log(`Found ${allCampaigns.length} total campaigns in database:\n`);

    // Find campaigns with status 'active' (lowercase)
    const activeCampaigns = await AdCampaign.find({ status: 'active' })
      .select('name placement position status bid startAt endAt')
      .lean();

    console.log(`Found ${activeCampaigns.length} campaigns with status='active' (lowercase):\n`);

    // Use all campaigns for now to see what we have
    const campaigns = allCampaigns;

    console.log(`\nShowing all ${campaigns.length} campaigns:\n`);
    console.log('═══════════════════════════════════════════════════════════════');

    campaigns.forEach((campaign, index) => {
      console.log(`\n${index + 1}. ${campaign.name}`);
      console.log(`   Placement: "${campaign.placement}" (type: ${typeof campaign.placement})`);
      console.log(`   Position: ${campaign.position}`);
      console.log(`   Bid: $${campaign.bid}`);
      console.log(`   Start: ${campaign.startAt}`);
      console.log(`   End: ${campaign.endAt || 'No end date'}`);
      console.log(`   Status: ${campaign.status}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\nPlacements Summary:');
    console.log('───────────────────────────────────────────────────────────────');

    const placementCounts = {};
    campaigns.forEach(c => {
      const placement = c.placement || 'MISSING';
      placementCounts[placement] = (placementCounts[placement] || 0) + 1;
    });

    Object.entries(placementCounts).forEach(([placement, count]) => {
      console.log(`   "${placement}": ${count} ad(s)`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\nExpected placement values (for matching):');
    console.log('───────────────────────────────────────────────────────────────');
    const expectedPlacements = [
      'blog_sidebar',
      'blog_top',
      'blog_in_content',
      'blog_bottom',
      'product_sidebar',
      'product_top',
      'product_bottom',
      'homepage_banner',
      'homepage_sidebar_left',
      'homepage_sidebar_right'
    ];

    expectedPlacements.forEach(p => {
      const hasMatch = campaigns.some(c => c.placement === p);
      console.log(`   ${p}: ${hasMatch ? '✓ HAS ADS' : '✗ NO ADS'}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\nPotential Issues:');
    console.log('───────────────────────────────────────────────────────────────');

    campaigns.forEach(c => {
      const placement = c.placement || '';

      // Check for common issues
      if (!placement) {
        console.log(`   ⚠ "${c.name}": Missing placement field`);
      } else if (placement.includes(' ')) {
        console.log(`   ⚠ "${c.name}": Placement contains spaces: "${placement}"`);
        // Suggest fix
        const fixed = placement.toLowerCase().replace(/\s+/g, '_');
        console.log(`      → Should be: "${fixed}"`);
      } else if (placement !== placement.toLowerCase()) {
        console.log(`   ⚠ "${c.name}": Placement has uppercase letters: "${placement}"`);
        console.log(`      → Should be: "${placement.toLowerCase()}"`);
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('Connection closed.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAds();
