const mongoose = require('mongoose');
const AdCampaign = require('./src/models/AdCampaign');
const Vendor = require('./src/models/Vendor');

mongoose.connect('mongodb://localhost:27017/shop')
  .then(async () => {
    console.log('✅ Connected to MongoDB (shop database)');

    // Find a vendor ID (use existing vendor)
    let vendor = await Vendor.findOne();

    if (!vendor) {
      console.log('⚠️  No vendors found. Creating demo vendor...');
      vendor = await Vendor.create({
        userId: new mongoose.Types.ObjectId(),
        businessName: 'Demo Tech Store',
        contactEmail: 'vendor@example.com',
        status: 'approved'
      });
    }

    console.log(`📦 Using vendor: ${vendor.businessName}`);

    // Delete existing demo homepage ads
    await AdCampaign.deleteMany({ name: /^Homepage Demo Ad/i });
    console.log('🗑️  Deleted existing homepage demo ads');

    const now = new Date();
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Create homepage banner ad
    const bannerAd = await AdCampaign.create({
      vendorId: vendor._id,
      name: 'Homepage Demo Ad - Summer Sale Banner',
      type: 'Banner',
      placement: 'homepage_banner', // NEW: Identifies this is for homepage banner
      targeting: {
        keywords: [],
        categories: [],
        products: []
      },
      bannerImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop',
      position: 'top',
      bannerSize: 'hero',
      pricing: 'CPM',
      bid: 10,
      dailyBudget: 1000,
      totalBudget: 30000,
      startAt: now,
      endAt: oneMonthLater,
      status: 'active',
      stats: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        revenue: 0
      }
    });

    // Create left sidebar ad
    const leftAd = await AdCampaign.create({
      vendorId: vendor._id,
      name: 'Homepage Demo Ad - Gaming Gear',
      type: 'Banner',
      placement: 'homepage_sidebar_left', // NEW: Identifies this is for homepage left sidebar
      targeting: {
        keywords: [
          { keyword: 'gaming', matchType: 'broad' },
          { keyword: 'console', matchType: 'broad' }
        ],
        categories: [],
        products: []
      },
      bannerImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=500&fit=crop',
      position: 'left',
      bannerSize: 'side-large',
      pricing: 'CPC',
      bid: 5,
      dailyBudget: 500,
      totalBudget: 15000,
      startAt: now,
      endAt: oneMonthLater,
      status: 'active',
      stats: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        revenue: 0
      }
    });

    // Create right sidebar ad
    const rightAd = await AdCampaign.create({
      vendorId: vendor._id,
      name: 'Homepage Demo Ad - Electronics Sale',
      type: 'Banner',
      placement: 'homepage_sidebar_right', // NEW: Identifies this is for homepage right sidebar
      targeting: {
        keywords: [
          { keyword: 'electronics', matchType: 'broad' },
          { keyword: 'smartphone', matchType: 'broad' }
        ],
        categories: [],
        products: []
      },
      bannerImage: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=500&fit=crop',
      position: 'right',
      bannerSize: 'side-large',
      pricing: 'CPC',
      bid: 4,
      dailyBudget: 500,
      totalBudget: 15000,
      startAt: now,
      endAt: oneMonthLater,
      status: 'active',
      stats: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        revenue: 0
      }
    });

    console.log('\n✅ SUCCESS! Created homepage sponsor ads:\n');
    console.log(`1. ${bannerAd.name}`);
    console.log(`   - Type: ${bannerAd.type}`);
    console.log(`   - Position: ${bannerAd.position} | Size: ${bannerAd.bannerSize}`);
    console.log(`   - Pricing: ${bannerAd.pricing} | Bid: $${bannerAd.bid}`);
    console.log(`   - Banner: ${bannerAd.bannerImage}\n`);

    console.log(`2. ${leftAd.name}`);
    console.log(`   - Type: ${leftAd.type}`);
    console.log(`   - Position: ${leftAd.position} | Size: ${leftAd.bannerSize}`);
    console.log(`   - Pricing: ${leftAd.pricing} | Bid: $${leftAd.bid}`);
    console.log(`   - Banner: ${leftAd.bannerImage}\n`);

    console.log(`3. ${rightAd.name}`);
    console.log(`   - Type: ${rightAd.type}`);
    console.log(`   - Position: ${rightAd.position} | Size: ${rightAd.bannerSize}`);
    console.log(`   - Pricing: ${rightAd.pricing} | Bid: $${rightAd.bid}`);
    console.log(`   - Banner: ${rightAd.bannerImage}\n`);

    console.log('🎉 Homepage sponsor ads are now ACTIVE!');
    console.log('📍 Visit http://localhost:5173 to see them on the homepage');
    console.log('⚠️  Note: Ads use /ads/auction endpoint - check if it returns these ads');

    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
