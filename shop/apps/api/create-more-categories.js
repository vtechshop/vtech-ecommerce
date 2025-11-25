const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();

const Category = require('./src/models/Category');

const categories = [
  {
    name: 'Computers & Laptops',
    slug: 'computers-laptops',
    description: 'Desktop computers, laptops, and accessories',
    image: 'https://images.unsplash.com/photo-1593642532400-2682810df593?w=800',
  },
  {
    name: 'Smartphones & Tablets',
    slug: 'smartphones-tablets',
    description: 'Mobile phones, tablets, and mobile accessories',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
  },
  {
    name: 'Audio & Headphones',
    slug: 'audio-headphones',
    description: 'Headphones, earbuds, speakers, and audio equipment',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
  },
  {
    name: 'Gaming',
    slug: 'gaming',
    description: 'Gaming consoles, accessories, and peripherals',
    image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800',
  },
  {
    name: 'Cameras & Photography',
    slug: 'cameras-photography',
    description: 'Digital cameras, lenses, and photography equipment',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
  },
  {
    name: 'Wearables',
    slug: 'wearables',
    description: 'Smartwatches, fitness trackers, and wearable tech',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
  },
];

async function createCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shop');
    console.log('✅ Connected to MongoDB');

    for (const catData of categories) {
      const existing = await Category.findOne({ slug: catData.slug });
      if (!existing) {
        await Category.create(catData);
        console.log(`✅ Created category: ${catData.name}`);
      } else {
        console.log(`⏭️  Category already exists: ${catData.name}`);
      }
    }

    const total = await Category.countDocuments();
    console.log(`\n🎉 Total categories: ${total}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating categories:', error);
    process.exit(1);
  }
}

createCategories();
