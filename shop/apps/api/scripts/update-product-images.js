// Script to update product images with real URLs
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

const productImages = {
  'banana-slicer': [
    'https://images.unsplash.com/photo-1590868309235-ea34bed7bd7f?w=600'
  ],
  'wireless-bluetooth-headphones': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'
  ],
  'smart-fitness-watch': [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'
  ],
  'portable-power-bank-20000mah': [
    'https://images.unsplash.com/photo-1609592869038-eea1b55ef612?w=600'
  ],
  'wireless-gaming-mouse': [
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600'
  ],
  '4k-webcam-for-streaming': [
    'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600'
  ],
  'mechanical-keyboard-rgb': [
    'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600'
  ],
  'mechanical-keyboard-rgb-1': [
    'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600'
  ],
  'phone-stand-wireless-charger': [
    'https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=600'
  ],
  'laptop-stand-aluminum': [
    'https://images.unsplash.com/photo-1527443060795-0402a18906c0?w=600'
  ],
  'led-desk-lamp-with-usb-charging': [
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600'
  ],
  'usb-c-hub-7-in-1': [
    'https://images.unsplash.com/photo-1625723044792-44de16ccb4e8?w=600'
  ],
  'usb-c-hub-7-in-1-1': [
    'https://images.unsplash.com/photo-1625723044792-44de16ccb4e8?w=600'
  ],
  'gaming-monitor-27-144hz': [
    'https://images.unsplash.com/photo-1527443195645-1133f7f28990?w=600'
  ],
  'gaming-headset-71-surround': [
    'https://images.unsplash.com/photo-1599669454699-248893623440?w=600'
  ],
  'gaming-chair-ergonomic-rgb': [
    'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=600'
  ],
  'drone-with-4k-camera': [
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600'
  ],
  'iphone-15-pro': [
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600'
  ],
  'samsung-galaxy-s24': [
    'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600'
  ],
  'oneplus-12': [
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600'
  ]
};

async function updateImages() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const Product = mongoose.model('Product', new mongoose.Schema({
      slug: String,
      images: [String]
    }));

    for (const [slug, images] of Object.entries(productImages)) {
      const result = await Product.updateOne(
        { slug },
        { $set: { images } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated: ${slug}`);
      } else {
        console.log(`⏭️  Skipped (not found): ${slug}`);
      }
    }

    // Also update any products with localhost URLs
    const localhostProducts = await Product.find({
      images: { $regex: /localhost/ }
    });

    for (const product of localhostProducts) {
      if (productImages[product.slug]) {
        continue; // Already handled above
      }
      // Set a generic placeholder
      await Product.updateOne(
        { _id: product._id },
        { $set: { images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'] } }
      );
      console.log(`✅ Fixed localhost URL: ${product.slug}`);
    }

    console.log('\n✅ All images updated!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateImages();
