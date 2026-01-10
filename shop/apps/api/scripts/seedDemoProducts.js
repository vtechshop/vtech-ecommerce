// Run with: node apps/api/scripts/seedDemoProducts.js
// Creates demo products with ALL fields populated for testing
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Vendor = require('../src/models/Vendor');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

const demoProducts = [
  {
    title: 'Premium Stainless Steel Mixer Grinder',
    description: 'High-performance 750W mixer grinder with 3 stainless steel jars. Perfect for grinding, blending, and making chutneys. Includes wet grinding jar, dry grinding jar, and chutney jar. Motor overload protection and shock-proof body for safety.',
    brand: 'V-Tech Kitchen',
    price: 4999,
    compareAt: 6999,
    cost: 3500,
    stock: 50,
    lowStockThreshold: 10,
    trackInventory: true,
    weight: 5.5,
    dimensions: { length: 12, width: 10, height: 15, unit: 'in' },
    taxable: true,
    taxRate: 18,
    taxIncluded: false,
    published: true,
    featured: true,
    tags: ['mixer grinder', 'kitchen appliances', 'stainless steel', 'grinding', 'blending'],

    // YouTube demo video
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',

    // Warranty Information
    hasWarranty: true,
    warranty: {
      duration: 24,
      durationType: 'months',
      description: 'Comprehensive warranty covering motor and electrical components',
      terms: 'Warranty void if product is tampered with or damaged due to misuse. Original purchase receipt required for warranty claims.',
      provider: 'V-Tech Kitchen Official Service Center',
      activationRequired: false
    },

    // Product Specifications
    specifications: [
      { label: 'Motor Power', value: '750 Watts' },
      { label: 'Material', value: 'Stainless Steel' },
      { label: 'Number of Jars', value: '3 (Wet, Dry, Chutney)' },
      { label: 'Jar Capacity', value: '1.5L, 1L, 0.5L' },
      { label: 'Color', value: 'Silver & Black' },
      { label: 'Speed Settings', value: '3 Speed + Pulse' },
      { label: 'Cord Length', value: '1.2 meters' },
      { label: 'Voltage', value: '220-240V, 50Hz' },
      { label: 'Weight', value: '5.5 kg' },
      { label: 'Dimensions', value: '12" x 10" x 15"' }
    ],

    // FAQ
    faqs: [
      {
        question: 'Is this mixer grinder suitable for wet grinding?',
        answer: 'Yes, this mixer grinder comes with a dedicated wet grinding jar with a capacity of 1.5L, perfect for making dosa and idli batter.'
      },
      {
        question: 'What is the warranty period?',
        answer: 'The product comes with a 2-year comprehensive warranty covering motor and all electrical components.'
      },
      {
        question: 'Can it grind hard spices like turmeric?',
        answer: 'Absolutely! The 750W motor is powerful enough to grind even the hardest spices including turmeric, black pepper, and dry coconut.'
      },
      {
        question: 'Is the body shock-proof?',
        answer: 'Yes, the mixer grinder features a shock-proof ABS plastic body for complete safety during operation.'
      },
      {
        question: 'What is included in the box?',
        answer: 'The package includes: Main unit, 3 stainless steel jars with lids, user manual, and warranty card.'
      }
    ],

    // SEO
    seo: {
      title: 'Premium 750W Mixer Grinder - 3 SS Jars | V-Tech Kitchen',
      description: 'Buy premium stainless steel mixer grinder with 750W motor, 3 jars for wet/dry grinding. 2-year warranty. Fast delivery. Best price guaranteed!',
      keywords: ['mixer grinder', 'kitchen appliances', 'stainless steel grinder', '750w mixer', 'wet grinder', 'buy mixer grinder online']
    },

    // Structured Data for Rich Snippets
    structuredData: {
      schemaType: 'Product',
      properties: {
        brand: 'V-Tech Kitchen',
        model: 'VTK-MG-750',
        aggregateRating: {
          ratingValue: 4.5,
          reviewCount: 127
        },
        offers: {
          price: 4999,
          priceCurrency: 'INR',
          availability: 'InStock'
        }
      },
      customSnippets: []
    }
  },

  {
    title: 'Electric Rice Cooker 1.8L - Auto Shut Off',
    description: 'Multi-functional electric rice cooker with 1.8L capacity, perfect for 4-6 people. Features automatic keep-warm function, non-stick inner pot, and steam basket for healthy cooking. Cook perfect rice every time with one-touch operation.',
    brand: 'V-Tech Home',
    price: 2499,
    compareAt: 3499,
    cost: 1800,
    stock: 75,
    lowStockThreshold: 15,
    trackInventory: true,
    weight: 3.2,
    dimensions: { length: 10, width: 10, height: 8, unit: 'in' },
    taxable: true,
    taxRate: 18,
    taxIncluded: false,
    published: true,
    featured: true,
    tags: ['rice cooker', 'electric cooker', 'kitchen appliances', 'automatic', 'non-stick'],

    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',

    hasWarranty: true,
    warranty: {
      duration: 12,
      durationType: 'months',
      description: 'Warranty covers heating element and electrical components',
      terms: 'Does not cover physical damage or scratches on non-stick coating due to misuse.',
      provider: 'V-Tech Authorized Service Center',
      activationRequired: true
    },

    specifications: [
      { label: 'Capacity', value: '1.8 Liters (Uncooked Rice)' },
      { label: 'Material', value: 'Aluminum with Non-Stick Coating' },
      { label: 'Power Consumption', value: '700 Watts' },
      { label: 'Color', value: 'White' },
      { label: 'Special Features', value: 'Auto Shut-off, Keep Warm Function' },
      { label: 'Included Accessories', value: 'Steam Basket, Rice Spatula, Measuring Cup' },
      { label: 'Cooking Time', value: '20-25 minutes for white rice' },
      { label: 'Voltage', value: '220-240V, 50Hz' },
      { label: 'Weight', value: '3.2 kg' },
      { label: 'Cord Length', value: '1 meter' }
    ],

    faqs: [
      {
        question: 'How much rice can I cook at once?',
        answer: '1.8L capacity can cook approximately 8-10 cups of cooked rice, suitable for 4-6 people.'
      },
      {
        question: 'Does it have automatic shut-off?',
        answer: 'Yes, the cooker automatically switches to keep-warm mode once rice is cooked and shuts off after extended keep-warm period.'
      },
      {
        question: 'Can I steam vegetables while cooking rice?',
        answer: 'Yes, the included steam basket allows you to steam vegetables, dumplings, or other foods while rice cooks below.'
      },
      {
        question: 'Is the inner pot removable?',
        answer: 'Yes, the non-stick inner pot is completely removable for easy cleaning and serving.'
      }
    ],

    seo: {
      title: '1.8L Electric Rice Cooker - Auto Shut Off | V-Tech Home',
      description: 'Shop electric rice cooker with 1.8L capacity, auto shut-off, keep-warm function. Perfect rice every time. Free steam basket included!',
      keywords: ['rice cooker', 'electric rice cooker', 'automatic rice cooker', 'buy rice cooker', '1.8l rice cooker', 'non-stick rice cooker']
    },

    structuredData: {
      schemaType: 'Product',
      properties: {
        brand: 'V-Tech Home',
        model: 'VTH-RC-1.8',
        aggregateRating: {
          ratingValue: 4.7,
          reviewCount: 89
        }
      }
    }
  },

  {
    title: 'Professional Chef Knife Set - 8 Pieces',
    description: 'Premium German stainless steel knife set including chef knife, bread knife, utility knife, paring knife, kitchen shears, and wooden storage block. Ergonomic handles for comfortable grip. Perfect for professional and home chefs.',
    brand: 'SharpEdge Pro',
    price: 3999,
    compareAt: 5999,
    cost: 2500,
    stock: 30,
    lowStockThreshold: 5,
    trackInventory: true,
    weight: 2.8,
    dimensions: { length: 14, width: 6, height: 10, unit: 'in' },
    taxable: true,
    taxRate: 12,
    taxIncluded: false,
    published: true,
    featured: false,
    tags: ['knife set', 'chef knife', 'kitchen knives', 'stainless steel', 'german steel', 'cutlery'],

    hasWarranty: true,
    warranty: {
      duration: 5,
      durationType: 'years',
      description: 'Lifetime warranty against manufacturing defects',
      terms: 'Does not cover normal wear and tear, improper use, or damage from dishwasher.',
      provider: 'SharpEdge Pro',
      activationRequired: false
    },

    specifications: [
      { label: 'Material', value: 'German High-Carbon Stainless Steel' },
      { label: 'Handle Material', value: 'Ergonomic Pakkawood' },
      { label: 'Number of Pieces', value: '8 (6 Knives + Shears + Block)' },
      { label: 'Chef Knife Length', value: '8 inches' },
      { label: 'Bread Knife Length', value: '8 inches' },
      { label: 'Utility Knife Length', value: '5 inches' },
      { label: 'Paring Knife Length', value: '3.5 inches' },
      { label: 'Hardness', value: 'HRC 56-58' },
      { label: 'Edge Angle', value: '15 degrees per side' },
      { label: 'Dishwasher Safe', value: 'Hand wash recommended' }
    ],

    faqs: [
      {
        question: 'Are these knives dishwasher safe?',
        answer: 'While they can technically go in the dishwasher, we strongly recommend hand washing to maintain the blade edge and prevent handle damage.'
      },
      {
        question: 'Do the knives need sharpening?',
        answer: 'The knives come razor-sharp out of the box. With proper care and using a honing steel regularly, they can stay sharp for years. Professional sharpening recommended once a year for heavy use.'
      },
      {
        question: 'What is included in the set?',
        answer: '8" Chef Knife, 8" Bread Knife, 5" Utility Knife, 3.5" Paring Knife, 2 Steak Knives, Kitchen Shears, and Wooden Storage Block.'
      }
    ],

    seo: {
      title: 'Professional Chef Knife Set 8pcs - German Steel | SharpEdge',
      description: 'Premium 8-piece German stainless steel knife set. Includes chef, bread, utility knives + wooden block. 5-year warranty. Sharp & durable!',
      keywords: ['chef knife set', 'german steel knives', 'professional knives', 'kitchen knife set', 'stainless steel knives']
    },

    structuredData: {
      schemaType: 'Product',
      properties: {
        brand: 'SharpEdge Pro',
        model: 'SEP-KS-8PC'
      }
    }
  }
];

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[seed] Connected to database');
    console.log('🌱 Creating demo products with ALL fields populated...\n');

    // Find first category and vendor
    const category = await Category.findOne();
    const vendor = await Vendor.findOne();

    if (!category) {
      console.log('❌ No category found. Please create a category first.');
      process.exit(1);
    }

    if (!vendor) {
      console.log('❌ No vendor found. Please run seedUser.js first.');
      process.exit(1);
    }

    // Delete existing demo products
    await Product.deleteMany({ title: { $in: demoProducts.map(p => p.title) } });

    // Create products
    for (const productData of demoProducts) {
      const product = await Product.create({
        ...productData,
        vendorId: vendor._id,
        categoryIds: [category._id],
        images: [
          'https://images.unsplash.com/photo-1556911261-6bd341186b2f?w=500',
          'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=500',
          'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500'
        ]
      });

      console.log(`✅ Created: ${product.title}`);
      console.log(`   SKU: ${product.sku}`);
      console.log(`   Price: ₹${product.price}`);
      console.log(`   Specifications: ${product.specifications.length} items`);
      console.log(`   FAQs: ${product.faqs.length} questions`);
      console.log(`   Tags: ${product.tags.join(', ')}`);
      console.log(`   SEO: ${product.seo.title}`);
      console.log('');
    }

    console.log(`\n✅ Successfully created ${demoProducts.length} demo products!`);
    console.log('\n📝 All products include:');
    console.log('   - Complete product information (title, description, price)');
    console.log('   - Multiple images and YouTube video');
    console.log('   - Detailed specifications (10+ fields)');
    console.log('   - FAQs (3-5 questions each)');
    console.log('   - Warranty information');
    console.log('   - SEO meta tags (title, description, keywords)');
    console.log('   - Structured data for rich snippets');
    console.log('   - Product tags');
    console.log('   - Tax and inventory settings');
    console.log('\nYou can now view these in your admin dashboard!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
