// FILE: apps/api/src/services/catalogService.js
const Product = require('../models/Product');
const Category = require('../models/Category');

class CatalogService {
  async getProducts(filters = {}, pagination = {}) {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      brand,
      inStock,
      featured,
      sortBy = '-createdAt',
    } = filters;

    const { page = 1, limit = 20 } = pagination;

    const query = { published: true };

    // Category filter
    if (category) {
      query.categoryIds = category;
    }

    // Search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Brand filter
    if (brand) {
      query.brand = brand;
    }

    // In stock filter
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Featured filter
    if (featured === 'true') {
      query.featured = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('vendorId', 'storeName slug')
        .lean(),
      Product.countDocuments(query),
    ]);

    return {
      products,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    };
  }

  async getProductBySlug(slug) {
    const product = await Product.findOne({ slug, published: true })
      .populate('vendorId', 'storeName slug rating reviewCount')
      .populate('categoryIds', 'name slug')
      .lean();

    if (product) {
      // Increment view count
      await Product.updateOne({ _id: product._id }, { $inc: { viewCount: 1 } });
    }

    return product;
  }

  async getRelatedProducts(productId, limit = 8) {
    const product = await Product.findById(productId);

    if (!product) {
      return [];
    }

    const priceMin = product.price * 0.7;
const priceMax = product.price * 1.3;
const relatedProducts = await Product.find({
  _id: { $ne: productId },
  published: true,
  categoryIds: { $in: product.categoryIds },
  price: { $gte: priceMin, $lte: priceMax },
  stock: { $gt: 0 },
})
  .limit(limit)
  .sort({ rating: -1 })
  .lean();

return relatedProducts;
}
async getFeaturedProducts(limit = 8) {
const products = await Product.find({
published: true,
featured: true,
stock: { $gt: 0 },
})
.limit(limit)
.sort({ rating: -1 })
.lean();
return products;
}
async getCategories() {
const categories = await Category.find({ isActive: true })
.sort({ sortOrder: 1 })
.lean();
return categories;
}
async getCategoryBySlug(slug) {
const category = await Category.findOne({ slug, isActive: true }).lean();
return category;
}
async getBrands() {
const brands = await Product.distinct('brand', { published: true });
return brands.filter(Boolean).sort();
}
}
module.exports = new CatalogService();