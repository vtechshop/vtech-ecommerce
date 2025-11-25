// FILE: apps/api/src/services/searchService.js
const Product = require('../models/Product');

class SearchService {
  async searchProducts(query, filters = {}) {
    const searchQuery = { published: true };

    // Text search
    if (query) {
      searchQuery.$text = { $search: query };
    }

    // Category filter
    if (filters.category) {
      searchQuery.categoryIds = filters.category;
    }

    // Price range
    if (filters.minPrice || filters.maxPrice) {
      searchQuery.price = {};
      if (filters.minPrice) searchQuery.price.$gte = parseFloat(filters.minPrice);
      if (filters.maxPrice) searchQuery.price.$lte = parseFloat(filters.maxPrice);
    }

    // Brand filter
    if (filters.brand) {
      searchQuery.brand = filters.brand;
    }

    // In stock only
    if (filters.inStock === 'true') {
      searchQuery.stock = { $gt: 0 };
    }

    return searchQuery;
  }

  buildSortQuery(sortBy) {
    const sortMap = {
      price: { price: 1 },
      '-price': { price: -1 },
      '-createdAt': { createdAt: -1 },
      title: { title: 1 },
      '-rating': { rating: -1 },
    };

    return sortMap[sortBy] || { createdAt: -1 };
  }

  async getAutocompleteSuggestions(query, limit = 10) {
    const products = await Product.find(
      { $text: { $search: query }, published: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select('title slug')
      .lean();

    return products.map((p) => ({
      value: p.title,
      slug: p.slug,
    }));
  }
}

module.exports = new SearchService();