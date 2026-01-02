const mongoose = require('mongoose');

async function markProductsAsFeatured() {
  try {
    await mongoose.connect('mongodb://localhost:27017/vtech-shop');
    console.log('Connected to database');

    // Get 8 active products
    const products = await mongoose.connection.db
      .collection('products')
      .find({ status: 'active' })
      .limit(8)
      .toArray();

    if (products.length === 0) {
      console.log('No active products found. Creating sample featured products...');
      // If no products exist, just mark any products as featured
      const anyProducts = await mongoose.connection.db
        .collection('products')
        .find({})
        .limit(8)
        .toArray();

      const productIds = anyProducts.map(p => p._id);
      const result = await mongoose.connection.db
        .collection('products')
        .updateMany(
          { _id: { $in: productIds } },
          { $set: { featured: true } }
        );

      console.log(`Marked ${result.modifiedCount} products as featured`);
    } else {
      // Mark these products as featured
      const productIds = products.map(p => p._id);
      const result = await mongoose.connection.db
        .collection('products')
        .updateMany(
          { _id: { $in: productIds } },
          { $set: { featured: true } }
        );

      console.log(`Marked ${result.modifiedCount} active products as featured`);
    }

    // Count total featured products
    const count = await mongoose.connection.db
      .collection('products')
      .countDocuments({ featured: true });

    console.log(`Total featured products: ${count}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

markProductsAsFeatured();
