// FILE: apps/api/src/services/recommendationService.js
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const SearchHistory = require('../models/SearchHistory');
const ProductView = require('../models/ProductView');
const mongoose = require('mongoose');

/**
 * Recommendation Service
 * Provides personalized product recommendations using multiple strategies
 */

class RecommendationService {
  /**
   * Get personalized recommendations for a user
   * @param {String} userId - User ID
   * @param {Object} options - { limit, excludeProductIds, categorySlug }
   * @returns {Array} Recommended products
   */
  async getRecommendations(userId, options = {}) {
    const { limit = 10, excludeProductIds = [], categorySlug = null } = options;

    try {
      // Get recommendations from multiple strategies
      const strategies = [
        this.getCollaborativeFiltering(userId, limit),
        this.getContentBasedRecommendations(userId, limit),
        this.getSearchBasedRecommendations(userId, limit),
        this.getReviewBasedRecommendations(userId, limit),
        this.getTrendingProducts(limit),
      ];

      const results = await Promise.allSettled(strategies);

      // Combine and score recommendations
      const recommendations = this.combineRecommendations(results, limit);

      // Filter out excluded products
      const filtered = recommendations.filter(
        (product) => !excludeProductIds.includes(product._id.toString())
      );

      // Filter by category if specified
      if (categorySlug) {
        return filtered.filter((product) => product.categorySlug === categorySlug).slice(0, limit);
      }

      return filtered.slice(0, limit);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      // Fallback to trending products
      return this.getTrendingProducts(limit);
    }
  }

  /**
   * Collaborative Filtering - "Users who bought this also bought"
   * @param {String} userId - User ID
   * @param {Number} limit - Number of recommendations
   * @returns {Array} Recommended products
   */
  async getCollaborativeFiltering(userId, limit = 10) {
    try {
      // Get user's purchased products
      const userOrders = await Order.find({
        userId,
        status: { $in: ['delivered', 'processing', 'shipped', 'paid'] }
      }).select('items');

      if (!userOrders || userOrders.length === 0) {
        return [];
      }

      // Extract product IDs from orders
      const userProductIds = userOrders
        .flatMap(order => order.items.map(item => item.productId))
        .map(id => id.toString());

      if (userProductIds.length === 0) {
        return [];
      }

      // Find other users who bought the same products
      const similarUserOrders = await Order.find({
        userId: { $ne: userId },
        status: { $in: ['delivered', 'processing', 'shipped', 'paid'] },
        'items.productId': { $in: userProductIds },
      }).select('items userId');

      // Count product frequency across similar users
      const productFrequency = {};

      similarUserOrders.forEach(order => {
        order.items.forEach(item => {
          const productId = item.productId.toString();
          // Skip products user already bought
          if (!userProductIds.includes(productId)) {
            productFrequency[productId] = (productFrequency[productId] || 0) + 1;
          }
        });
      });

      // Get top products by frequency
      const topProductIds = Object.entries(productFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id]) => id);

      if (topProductIds.length === 0) {
        return [];
      }

      // Fetch product details
      const products = await Product.find({
        _id: { $in: topProductIds },
        isActive: true,
        stock: { $gt: 0 },
      }).populate('vendorId', 'businessName');

      // Sort by frequency
      const sortedProducts = topProductIds
        .map(id => products.find(p => p._id.toString() === id))
        .filter(Boolean);

      return sortedProducts;
    } catch (error) {
      console.error('Collaborative filtering error:', error);
      return [];
    }
  }

  /**
   * Content-Based Recommendations - Based on user's browsing/purchase history
   * @param {String} userId - User ID
   * @param {Number} limit - Number of recommendations
   * @returns {Array} Recommended products
   */
  async getContentBasedRecommendations(userId, limit = 10) {
    try {
      // Get user's order history to understand preferences
      const userOrders = await Order.find({
        userId,
        status: { $in: ['delivered', 'processing', 'shipped', 'paid'] }
      }).select('items').populate('items.productId');

      if (!userOrders || userOrders.length === 0) {
        return [];
      }

      // Extract categories and tags from purchased products
      const categories = new Set();
      const vendors = new Set();
      const priceRange = { min: Infinity, max: 0 };

      userOrders.forEach(order => {
        order.items.forEach(item => {
          if (item.productId) {
            if (item.productId.categorySlug) categories.add(item.productId.categorySlug);
            if (item.productId.vendorId) vendors.add(item.productId.vendorId.toString());

            const price = item.productId.price || 0;
            if (price < priceRange.min) priceRange.min = price;
            if (price > priceRange.max) priceRange.max = price;
          }
        });
      });

      const categoryArray = Array.from(categories);

      if (categoryArray.length === 0) {
        return [];
      }

      // Find similar products in the same categories
      const query = {
        isActive: true,
        stock: { $gt: 0 },
        categorySlug: { $in: categoryArray },
      };

      // Add price range filter (±30% of user's typical range)
      if (priceRange.min !== Infinity && priceRange.max !== 0) {
        const margin = (priceRange.max - priceRange.min) * 0.3;
        query.price = {
          $gte: Math.max(0, priceRange.min - margin),
          $lte: priceRange.max + margin,
        };
      }

      const recommendations = await Product.find(query)
        .populate('vendorId', 'businessName')
        .sort({ rating: -1, sold: -1 })
        .limit(limit);

      return recommendations;
    } catch (error) {
      console.error('Content-based recommendations error:', error);
      return [];
    }
  }

  /**
   * Get trending products (fallback strategy)
   * @param {Number} limit - Number of products
   * @returns {Array} Trending products
   */
  async getTrendingProducts(limit = 10) {
    try {
      // Get products with highest sales in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const topProducts = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            status: { $in: ['paid', 'processing', 'shipped', 'delivered'] },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            totalSold: { $sum: '$items.qty' },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: limit },
      ]);

      const productIds = topProducts.map((p) => p._id);

      if (productIds.length === 0) {
        // Fallback to highest-rated products
        return await Product.find({ isActive: true, stock: { $gt: 0 } })
          .populate('vendorId', 'businessName')
          .sort({ rating: -1, sold: -1 })
          .limit(limit);
      }

      const products = await Product.find({
        _id: { $in: productIds },
        isActive: true,
        stock: { $gt: 0 },
      }).populate('vendorId', 'businessName');

      // Sort by total sold
      const sortedProducts = productIds
        .map(id => products.find(p => p._id.toString() === id.toString()))
        .filter(Boolean);

      return sortedProducts;
    } catch (error) {
      console.error('Trending products error:', error);
      return [];
    }
  }

  /**
   * Get "Frequently Bought Together" recommendations
   * @param {String} productId - Product ID
   * @param {Number} limit - Number of recommendations
   * @returns {Array} Related products
   */
  async getFrequentlyBoughtTogether(productId, limit = 4) {
    try {
      // Find orders containing this product
      const orders = await Order.find({
        'items.productId': productId,
        status: { $in: ['delivered', 'processing', 'shipped', 'paid'] },
      }).select('items');

      if (!orders || orders.length === 0) {
        return [];
      }

      // Count frequency of other products in the same orders
      const productFrequency = {};

      orders.forEach(order => {
        order.items.forEach(item => {
          const itemProductId = item.productId.toString();
          if (itemProductId !== productId.toString()) {
            productFrequency[itemProductId] = (productFrequency[itemProductId] || 0) + 1;
          }
        });
      });

      // Get top products by frequency
      const topProductIds = Object.entries(productFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([id]) => id);

      if (topProductIds.length === 0) {
        return [];
      }

      // Fetch product details
      const products = await Product.find({
        _id: { $in: topProductIds },
        isActive: true,
        stock: { $gt: 0 },
      }).populate('vendorId', 'businessName');

      // Sort by frequency
      const sortedProducts = topProductIds
        .map(id => products.find(p => p._id.toString() === id))
        .filter(Boolean);

      return sortedProducts;
    } catch (error) {
      console.error('Frequently bought together error:', error);
      return [];
    }
  }

  /**
   * Get similar products based on category and attributes
   * @param {String} productId - Product ID
   * @param {Number} limit - Number of recommendations
   * @returns {Array} Similar products
   */
  async getSimilarProducts(productId, limit = 8) {
    try {
      const product = await Product.findById(productId);

      if (!product) {
        return [];
      }

      const query = {
        _id: { $ne: productId },
        isActive: true,
        stock: { $gt: 0 },
        categorySlug: product.categorySlug,
      };

      // Similar price range (±20%)
      if (product.price) {
        const margin = product.price * 0.2;
        query.price = {
          $gte: product.price - margin,
          $lte: product.price + margin,
        };
      }

      const similarProducts = await Product.find(query)
        .populate('vendorId', 'businessName')
        .sort({ rating: -1, sold: -1 })
        .limit(limit);

      return similarProducts;
    } catch (error) {
      console.error('Similar products error:', error);
      return [];
    }
  }

  /**
   * Get personalized recommendations (legacy method for backward compatibility)
   * @param {String} userId - User ID
   * @param {Number} limit - Number of recommendations
   * @returns {Array} Recommended products
   */
  async getPersonalizedRecommendations(userId, limit = 8) {
    return this.getRecommendations(userId, { limit });
  }

  /**
   * Get search-based recommendations from user's search history
   * @param {String} userId - User ID
   * @param {Number} limit - Number of recommendations
   * @returns {Array} Recommended products based on search history
   */
  async getSearchBasedRecommendations(userId, limit = 10) {
    try {
      // Get recent search queries
      const recentSearches = await SearchHistory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      if (recentSearches.length === 0) {
        return [];
      }

      // Extract keywords and categories from searches
      const keywords = recentSearches.map(s => s.query).join(' ');
      const categories = [...new Set(recentSearches.map(s => s.filters?.category).filter(Boolean))];

      // Build search query
      const query = {
        published: true,
        stock: { $gt: 0 },
      };

      // Add text search if keywords exist
      if (keywords) {
        query.$text = { $search: keywords };
      }

      // Add category filter if exists
      if (categories.length > 0) {
        query.categoryIds = { $in: categories };
      }

      // Find products matching search patterns
      const products = await Product.find(query)
        .sort({ rating: -1, soldCount: -1 })
        .limit(limit)
        .populate('categoryIds', 'name')
        .populate('vendorId', 'businessName')
        .lean();

      return products;
    } catch (error) {
      console.error('Search-based recommendations error:', error);
      return [];
    }
  }

  /**
   * Get recommendations based on highly reviewed products by user
   * @param {String} userId - User ID
   * @param {Number} limit - Number of recommendations
   * @returns {Array} Recommended products based on user's reviews
   */
  async getReviewBasedRecommendations(userId, limit = 10) {
    try {
      // Get user's highly-rated reviews
      const userReviews = await Review.find({
        userId,
        rating: { $gte: 4 },
        status: 'approved'
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      if (userReviews.length === 0) {
        return [];
      }

      // Get products user reviewed positively
      const reviewedProductIds = userReviews.map(r => r.productId);
      const reviewedProducts = await Product.find({
        _id: { $in: reviewedProductIds }
      }).lean();

      // Extract patterns from liked products
      const categories = [...new Set(reviewedProducts.flatMap(p => p.categoryIds || []))];
      const tags = [...new Set(reviewedProducts.flatMap(p => p.tags || []))];
      const brands = [...new Set(reviewedProducts.map(p => p.brand).filter(Boolean))];

      // Find similar highly-rated products
      const query = {
        published: true,
        _id: { $nin: reviewedProductIds },
        rating: { $gte: 4 }, // Only recommend well-rated products
        stock: { $gt: 0 },
        $or: [
          { categoryIds: { $in: categories } },
          { tags: { $in: tags } },
          { brand: { $in: brands } },
        ],
      };

      const products = await Product.find(query)
        .sort({ rating: -1, reviewCount: -1 })
        .limit(limit)
        .populate('categoryIds', 'name')
        .populate('vendorId', 'businessName')
        .lean();

      return products;
    } catch (error) {
      console.error('Review-based recommendations error:', error);
      return [];
    }
  }

  /**
   * Get product snippets based on popular searches
   * @param {Number} limit - Number of snippets
   * @returns {Array} Popular search queries with products
   */
  async getProductSnippetsFromSearches(limit = 5) {
    try {
      const daysAgo = 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Get most popular search queries
      const popularSearches = await SearchHistory.aggregate([
        { $match: { createdAt: { $gte: startDate }, resultsCount: { $gt: 0 } } },
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 },
            avgResults: { $avg: '$resultsCount' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);

      if (popularSearches.length === 0) {
        return [];
      }

      // Get products for top searches
      const snippets = await Promise.all(
        popularSearches.map(async (search) => {
          const products = await Product.find({
            $text: { $search: search._id },
            published: true,
            stock: { $gt: 0 },
          })
            .sort({ rating: -1, soldCount: -1 })
            .limit(10)
            .select('title slug images price compareAt rating reviewCount')
            .lean();

          return {
            query: search._id,
            searchCount: search.count,
            products,
          };
        })
      );

      return snippets.filter(s => s.products.length > 0);
    } catch (error) {
      console.error('Product snippets from searches error:', error);
      return [];
    }
  }

  /**
   * Get top reviewed products
   * @param {Number} limit - Number of products
   * @param {Number} minRating - Minimum rating
   * @returns {Array} Top reviewed products
   */
  async getTopReviewedProducts(limit = 10, minRating = 4.5) {
    try {
      const products = await Product.find({
        published: true,
        rating: { $gte: minRating },
        reviewCount: { $gte: 5 }, // At least 5 reviews
        stock: { $gt: 0 },
      })
        .sort({ rating: -1, reviewCount: -1 })
        .limit(limit)
        .populate('categoryIds', 'name')
        .populate('vendorId', 'businessName')
        .lean();

      return products;
    } catch (error) {
      console.error('Top reviewed products error:', error);
      return [];
    }
  }

  /**
   * Track product view for recommendations
   * @param {Object} viewData - View tracking data
   */
  async trackProductView(viewData) {
    try {
      const productView = new ProductView(viewData);
      await productView.save();

      // Update product view count
      await Product.findByIdAndUpdate(
        viewData.productId,
        { $inc: { viewCount: 1 } }
      );

      return productView;
    } catch (error) {
      console.error('Track product view error:', error);
      return null;
    }
  }

  /**
   * Track search query
   * @param {Object} searchData - Search tracking data
   */
  async trackSearch(searchData) {
    try {
      const searchHistory = new SearchHistory(searchData);
      await searchHistory.save();
      return searchHistory;
    } catch (error) {
      console.error('Track search error:', error);
      return null;
    }
  }

  /**
   * Update search history with clicked product
   * @param {String} searchId - Search history ID
   * @param {String} productId - Product ID that was clicked
   */
  async trackSearchClick(searchId, productId) {
    try {
      await SearchHistory.findByIdAndUpdate(
        searchId,
        {
          $push: {
            clickedProducts: {
              productId,
              clickedAt: new Date()
            }
          }
        }
      );
    } catch (error) {
      console.error('Track search click error:', error);
    }
  }

  /**
   * Combine recommendations from multiple strategies with scoring
   * @param {Array} results - Results from Promise.allSettled
   * @param {Number} limit - Number of final recommendations
   * @returns {Array} Combined and scored recommendations
   */
  combineRecommendations(results, limit) {
    const productScores = new Map();

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        // Weight: Collaborative > Content-based > Search-based > Review-based > Trending
        const weights = [3, 2, 2.5, 2, 1];
        const weight = weights[index] || 1;

        result.value.forEach((product, position) => {
          const productId = product._id.toString();
          const positionScore = (result.value.length - position) / result.value.length;
          const score = weight * positionScore;

          if (productScores.has(productId)) {
            productScores.set(productId, {
              product,
              score: productScores.get(productId).score + score,
            });
          } else {
            productScores.set(productId, { product, score });
          }
        });
      }
    });

    // Sort by score and return products
    return Array.from(productScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.product);
  }
}

module.exports = new RecommendationService();
