const mongoose = require('mongoose');

async function fixFeaturedProducts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/shop');
    console.log('Connected to database');

    // Get all featured products
    const products = await mongoose.connection.db
      .collection('products')
      .find({ featured: true })
      .toArray();

    console.log(`\nFound ${products.length} featured products:`);
    products.forEach(p => {
      console.log(`- ${p.title} | Status: ${p.status || 'NO STATUS'} | Price: $${p.price} | Stock: ${p.stock}`);
    });

    // Update all featured products to be active
    console.log('\nUpdating featured products to active status...');
    const result = await mongoose.connection.db
      .collection('products')
      .updateMany(
        { featured: true },
        { $set: { status: 'active' } }
      );

    console.log(`✅ Updated ${result.modifiedCount} products to active status`);

    // Also ensure there are enough featured products (at least 8)
    const featuredCount = await mongoose.connection.db
      .collection('products')
      .countDocuments({ featured: true });

    if (featuredCount < 8) {
      console.log(`\nOnly ${featuredCount} featured products. Adding more...`);

      // Get non-featured products
      const moreProducts = await mongoose.connection.db
        .collection('products')
        .find({ featured: { $ne: true } })
        .limit(8 - featuredCount)
        .toArray();

      if (moreProducts.length > 0) {
        const productIds = moreProducts.map(p => p._id);
        const updateResult = await mongoose.connection.db
          .collection('products')
          .updateMany(
            { _id: { $in: productIds } },
            { $set: { featured: true, status: 'active' } }
          );

        console.log(`✅ Marked ${updateResult.modifiedCount} additional products as featured`);
      }
    }

    // Final count
    const finalCount = await mongoose.connection.db
      .collection('products')
      .countDocuments({ featured: true, status: 'active' });

    console.log(`\n✨ Total active featured products: ${finalCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixFeaturedProducts();
