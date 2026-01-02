const mongoose = require('mongoose');

async function addImagesToFeaturedProducts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/shop');
    console.log('Connected to database');

    // Sample product images (placeholder URLs)
    const productImages = {
      'Wireless Bluetooth Headphones': [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500'
      ],
      'Smart Watch Pro': [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500'
      ],
      'Yoga Mat Premium': [
        'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500'
      ],
      'Running Shoes': [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'
      ],
      'default': [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'
      ]
    };

    // Update featured products with images
    const featuredProducts = await mongoose.connection.db
      .collection('products')
      .find({ featured: true })
      .limit(2)
      .toArray();

    console.log(`\nUpdating ${featuredProducts.length} featured products with images...`);

    for (const product of featuredProducts) {
      const images = productImages[product.title] || productImages['default'];

      await mongoose.connection.db
        .collection('products')
        .updateOne(
          { _id: product._id },
          {
            $set: {
              images: images,
              status: 'active',
              featured: true,
              stock: product.stock || 100
            }
          }
        );

      console.log(`✅ Updated ${product.title} with ${images.length} images`);
    }

    // Verify the update
    const updated = await mongoose.connection.db
      .collection('products')
      .find({ featured: true, status: 'active' })
      .limit(2)
      .toArray();

    console.log('\n✨ Featured products after update:');
    updated.forEach(p => {
      console.log(`- ${p.title}: ${p.images?.length || 0} images, Price: $${p.price}, Stock: ${p.stock}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addImagesToFeaturedProducts();
