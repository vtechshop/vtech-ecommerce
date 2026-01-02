// FILE: scripts/init-pricing-settings.js
// Script to initialize ad pricing settings
const mongoose = require('mongoose');
const AdPricingSettings = require('../src/models/AdPricingSettings');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shop';

const defaultSettings = [
  // ========== HOMEPAGE PLACEMENTS ==========
  {
    placement: 'homepage_banner',
    displayName: 'Homepage Banner',
    description: 'Premium banner at top of homepage',
    pricingType: 'CPM',
    minBid: 100,
    maxBid: 500,
    recommendedBid: 250,
    floorPrice: 150,
    dailyBudgetMin: 1000
  },
  {
    placement: 'homepage_sidebar_left',
    displayName: 'Homepage - Left Sidebar',
    description: 'Left sidebar on homepage',
    pricingType: 'CPM',
    minBid: 30,
    maxBid: 150,
    recommendedBid: 75,
    floorPrice: 50,
    dailyBudgetMin: 500
  },
  {
    placement: 'homepage_sidebar_right',
    displayName: 'Homepage - Right Sidebar',
    description: 'Right sidebar on homepage',
    pricingType: 'CPM',
    minBid: 30,
    maxBid: 150,
    recommendedBid: 75,
    floorPrice: 50,
    dailyBudgetMin: 500
  },
  {
    placement: 'homepage_middle',
    displayName: 'Homepage - Middle Section',
    description: 'Banner in middle of homepage',
    pricingType: 'CPM',
    minBid: 50,
    maxBid: 250,
    recommendedBid: 125,
    floorPrice: 75,
    dailyBudgetMin: 750
  },
  {
    placement: 'homepage_bottom',
    displayName: 'Homepage - Bottom Section',
    description: 'Banner at bottom of homepage',
    pricingType: 'CPM',
    minBid: 40,
    maxBid: 200,
    recommendedBid: 100,
    floorPrice: 60,
    dailyBudgetMin: 600
  },

  // ========== SEARCH & CATEGORY PLACEMENTS ==========
  {
    placement: 'search_sponsored_products',
    displayName: 'Search Sponsored Products',
    description: 'Sponsored products in search results - High conversion',
    pricingType: 'CPC',
    minBid: 5,
    maxBid: 50,
    recommendedBid: 15,
    floorPrice: 8,
    dailyBudgetMin: 500
  },
  {
    placement: 'search_top',
    displayName: 'Search - Top Banner',
    description: 'Banner at top of search results',
    pricingType: 'CPM',
    minBid: 60,
    maxBid: 300,
    recommendedBid: 150,
    floorPrice: 90,
    dailyBudgetMin: 800
  },
  {
    placement: 'category_top_banner',
    displayName: 'Category Top Banner',
    description: 'Banner at top of category pages',
    pricingType: 'CPM',
    minBid: 50,
    maxBid: 300,
    recommendedBid: 150,
    floorPrice: 75,
    dailyBudgetMin: 750
  },
  {
    placement: 'category_grid',
    displayName: 'Category - Product Grid',
    description: 'Sponsored products in category grid',
    pricingType: 'CPC',
    minBid: 4,
    maxBid: 40,
    recommendedBid: 12,
    floorPrice: 6,
    dailyBudgetMin: 400
  },
  {
    placement: 'category_sidebar',
    displayName: 'Category Sidebar',
    description: 'Sidebar on category pages',
    pricingType: 'CPM',
    minBid: 25,
    maxBid: 125,
    recommendedBid: 65,
    floorPrice: 40,
    dailyBudgetMin: 400
  },

  // ========== PRODUCT PAGE PLACEMENTS ==========
  {
    placement: 'product_sidebar',
    displayName: 'Product Page Sidebar',
    description: 'Sidebar on product pages',
    pricingType: 'CPC',
    minBid: 3,
    maxBid: 30,
    recommendedBid: 10,
    floorPrice: 5,
    dailyBudgetMin: 300
  },
  {
    placement: 'product_top',
    displayName: 'Product - Top Banner',
    description: 'Banner at top of product pages',
    pricingType: 'CPM',
    minBid: 40,
    maxBid: 200,
    recommendedBid: 100,
    floorPrice: 60,
    dailyBudgetMin: 600
  },
  {
    placement: 'product_bottom',
    displayName: 'Product - Bottom Banner',
    description: 'Banner at bottom of product pages',
    pricingType: 'CPM',
    minBid: 35,
    maxBid: 175,
    recommendedBid: 90,
    floorPrice: 50,
    dailyBudgetMin: 500
  },
  {
    placement: 'product_related',
    displayName: 'Product - Related Products',
    description: 'Sponsored products in related section',
    pricingType: 'CPC',
    minBid: 4,
    maxBid: 40,
    recommendedBid: 12,
    floorPrice: 6,
    dailyBudgetMin: 400
  },

  // ========== BLOG PLACEMENTS ==========
  {
    placement: 'blog_top',
    displayName: 'Blog - Top Banner',
    description: 'Banner at top of blog pages',
    pricingType: 'CPM',
    minBid: 20,
    maxBid: 100,
    recommendedBid: 50,
    floorPrice: 30,
    dailyBudgetMin: 300
  },
  {
    placement: 'blog_sidebar',
    displayName: 'Blog - Sidebar',
    description: 'Sidebar on blog pages',
    pricingType: 'CPM',
    minBid: 15,
    maxBid: 75,
    recommendedBid: 40,
    floorPrice: 25,
    dailyBudgetMin: 250
  },
  {
    placement: 'blog_in_content',
    displayName: 'Blog Post - In Content',
    description: 'Ad within blog post content',
    pricingType: 'CPM',
    minBid: 25,
    maxBid: 125,
    recommendedBid: 60,
    floorPrice: 35,
    dailyBudgetMin: 350
  },
  {
    placement: 'blog_bottom',
    displayName: 'Blog Post - Bottom Banner',
    description: 'Banner at bottom of blog posts',
    pricingType: 'CPM',
    minBid: 20,
    maxBid: 100,
    recommendedBid: 50,
    floorPrice: 30,
    dailyBudgetMin: 300
  },
];

async function initializePricingSettings() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const setting of defaultSettings) {
      const existing = await AdPricingSettings.findOne({ placement: setting.placement });

      if (!existing) {
        await AdPricingSettings.create({
          ...setting,
          status: 'active',
          qualityScoreEnabled: true,
          qualityScoreWeights: {
            ctr: 0.4,
            conversionRate: 0.3,
            productRating: 0.3
          },
          auctionType: 'second_price',
          requiresApproval: true,
          autoApproveThreshold: null,
          maxCampaignsPerVendor: 10
        });
        created++;
        console.log(`✅ Created pricing settings for: ${setting.placement}`);
      } else {
        skipped++;
        console.log(`⏭️  Skipped (already exists): ${setting.placement}`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  Created: ${created} pricing settings`);
    console.log(`  Skipped: ${skipped} pricing settings (already existed)`);
    console.log(`  Total: ${defaultSettings.length} placements`);
    console.log('\n✅ Pricing settings initialization complete!');

  } catch (error) {
    console.error('❌ Error initializing pricing settings:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

initializePricingSettings();
