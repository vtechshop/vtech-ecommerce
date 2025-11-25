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

    // Delete existing demo blog ads
    await AdCampaign.deleteMany({ name: /^Blog Demo Ad/i });
    console.log('🗑️  Deleted existing blog demo ads');

    const now = new Date();
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Create blog sidebar ad #1
    const blogAd1 = await AdCampaign.create({
      vendorId: vendor._id,
      name: 'Blog Demo Ad - Latest Tech Reviews',
      type: 'Banner',
      placement: 'blog_sidebar', // NEW: Identifies this is for blog sidebar
      targeting: {
        keywords: [
          { keyword: 'technology', matchType: 'broad' },
          { keyword: 'reviews', matchType: 'broad' }
        ],
        categories: [],
        products: []
      },
      bannerImage: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&h=300&fit=crop',
      position: 'right',
      bannerSize: 'side-small',
      pricing: 'CPC',
      bid: 3,
      dailyBudget: 300,
      totalBudget: 9000,
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

    // Create blog sidebar ad #2
    const blogAd2 = await AdCampaign.create({
      vendorId: vendor._id,
      name: 'Blog Demo Ad - Smart Home Devices',
      type: 'Banner',
      placement: 'blog_sidebar',
      targeting: {
        keywords: [
          { keyword: 'smart home', matchType: 'broad' },
          { keyword: 'iot', matchType: 'broad' }
        ],
        categories: [],
        products: []
      },
      bannerImage: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=300&fit=crop',
      position: 'right',
      bannerSize: 'side-small',
      pricing: 'CPC',
      bid: 4,
      dailyBudget: 400,
      totalBudget: 12000,
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

    // Create blog sidebar ad #3
    const blogAd3 = await AdCampaign.create({
      vendorId: vendor._id,
      name: 'Blog Demo Ad - Gadgets & Accessories',
      type: 'Banner',
      placement: 'blog_sidebar',
      targeting: {
        keywords: [
          { keyword: 'gadgets', matchType: 'broad' },
          { keyword: 'accessories', matchType: 'broad' }
        ],
        categories: [],
        products: []
      },
      bannerImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
      position: 'right',
      bannerSize: 'side-small',
      pricing: 'CPM',
      bid: 8,
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

    console.log('\n✅ SUCCESS! Created blog sponsor ads:\n');
    console.log(`1. ${blogAd1.name}`);
    console.log(`   - Type: ${blogAd1.type}`);
    console.log(`   - Placement: ${blogAd1.placement}`);
    console.log(`   - Position: ${blogAd1.position} | Size: ${blogAd1.bannerSize}`);
    console.log(`   - Pricing: ${blogAd1.pricing} | Bid: $${blogAd1.bid}`);
    console.log(`   - Banner: ${blogAd1.bannerImage}\n`);

    console.log(`2. ${blogAd2.name}`);
    console.log(`   - Type: ${blogAd2.type}`);
    console.log(`   - Placement: ${blogAd2.placement}`);
    console.log(`   - Position: ${blogAd2.position} | Size: ${blogAd2.bannerSize}`);
    console.log(`   - Pricing: ${blogAd2.pricing} | Bid: $${blogAd2.bid}`);
    console.log(`   - Banner: ${blogAd2.bannerImage}\n`);

    console.log(`3. ${blogAd3.name}`);
    console.log(`   - Type: ${blogAd3.type}`);
    console.log(`   - Placement: ${blogAd3.placement}`);
    console.log(`   - Position: ${blogAd3.position} | Size: ${blogAd3.bannerSize}`);
    console.log(`   - Pricing: ${blogAd3.pricing} | Bid: $${blogAd3.bid}`);
    console.log(`   - Banner: ${blogAd3.bannerImage}\n`);

    console.log('🎉 Blog sponsor ads are now ACTIVE!');
    console.log('📍 Visit http://localhost:5173/blog to see them on blog pages');
    console.log('✅ The blog sidebar will now show real ads instead of placeholders!');

    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
