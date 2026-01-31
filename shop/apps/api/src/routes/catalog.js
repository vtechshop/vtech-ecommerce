// FILE: apps/api/src/routes/catalog.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const recommendationService = require('../services/recommendationService');
const { authenticate } = require('../middleware/auth');
const { catalogTrackingLimiter } = require('../middleware/rateLimiter');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');

// GET /catalog/products?featured=true&limit=8&tag=electronics&vendor=demo-electronics
router.get('/products', async (req, res, next) => {
  try {
    const { featured, q, tag, vendor, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    // SECURITY: Cap limit to prevent large data retrieval (max 100 items per request)
    const cappedLimit = Math.min(parseInt(limit), 100);

    const query = { published: true }; // Only show published products
    if (featured === 'true') query.featured = true;
    if (q) query.$text = { $search: q };
    if (tag) query.tags = tag.toLowerCase(); // Filter by specific tag

    // Filter by vendor slug
    if (vendor) {
      const Vendor = require('../models/Vendor');
      const vendorDoc = await Vendor.findOne({ slug: vendor }).lean();
      if (vendorDoc) {
        query.vendorId = vendorDoc._id;
      } else {
        // Vendor not found, return empty results
        return res.json({ success: true, data: [], meta: { total: 0, page: Number(page), limit: cappedLimit } });
      }
    }

    const skip = (parseInt(page) - 1) * cappedLimit;

    const [items, total] = await Promise.all([
      Product.find(query).populate('vendorId', 'storeName slug').sort(sort).skip(skip).limit(cappedLimit).lean(),
      Product.countDocuments(query),
    ]);

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: cappedLimit } });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/products/:slug
router.get('/products/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug, published: true }).populate('vendorId', 'storeName slug').lean();
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' }});
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/autocomplete?q=mix - Amazon-style search suggestions
router.get('/autocomplete', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { suggestions: [], products: [], categories: [] } });
    }

    const searchTerm = q.trim();
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedTerm, 'i');

    // Run all queries in parallel
    const [products, categories, textSuggestions] = await Promise.all([
      // Top 5 matching products with images and prices
      Product.find({ published: true, title: regex })
        .sort({ sold: -1 })
        .limit(5)
        .select('title slug price images')
        .lean(),

      // Matching categories
      Category.find({ isActive: true, name: regex })
        .limit(4)
        .select('name slug image')
        .lean(),

      // Text-based keyword suggestions from product titles
      Product.aggregate([
        { $match: { published: true, title: regex } },
        { $group: { _id: null, titles: { $addToSet: '$title' } } },
        { $project: { _id: 0, titles: { $slice: ['$titles', 8] } } },
      ]),
    ]);

    // Build keyword suggestions from product titles
    const titles = textSuggestions[0]?.titles || [];
    const suggestions = titles
      .map(t => t.toLowerCase())
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5);

    res.json({
      success: true,
      data: { suggestions, products, categories },
    });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/categories?limit=6
router.get('/categories', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/categories/:slug
router.get('/categories/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug, isActive: true }).lean();
    if (!category) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' }});
    }

    // Fetch products in this category
    const products = await Product.find({
      published: true,
      categoryIds: { $in: [category._id] },
    })
      .populate('vendorId', 'storeName slug')
      .lean();

    res.json({ success: true, data: { category, items: products } });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/recommendations - Personalized recommendations for logged-in users
router.get('/recommendations', authenticate, async (req, res, next) => {
  try {
    const { limit = 12 } = req.query;
    const userId = req.user._id;

    const recommendations = await recommendationService.getRecommendations(userId, {
      limit: parseInt(limit)
    });

    res.json({ success: true, data: recommendations });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/recommendations/trending - Trending products (no auth required)
router.get('/recommendations/trending', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const trendingProducts = await recommendationService.getTrendingProducts(parseInt(limit));

    res.json({ success: true, data: trendingProducts });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/recommendations/top-reviewed - Top reviewed products (no auth required)
router.get('/recommendations/top-reviewed', async (req, res, next) => {
  try {
    const { limit = 10, minRating = 4.5 } = req.query;

    const topReviewed = await recommendationService.getTopReviewedProducts(
      parseInt(limit),
      parseFloat(minRating)
    );

    res.json({ success: true, data: topReviewed });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/recommendations/search-snippets - Popular search snippets (no auth required)
router.get('/recommendations/search-snippets', async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;

    const snippets = await recommendationService.getProductSnippetsFromSearches(parseInt(limit));

    res.json({ success: true, data: snippets });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/products/:productId/similar - Similar products
router.get('/products/:productId/similar', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { limit = 8 } = req.query;

    const similarProducts = await recommendationService.getSimilarProducts(
      productId,
      parseInt(limit)
    );

    res.json({ success: true, data: similarProducts });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/products/:productId/related - Alias for similar products (frontend compatibility)
router.get('/products/:productId/related', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { limit = 8 } = req.query;

    const relatedProducts = await recommendationService.getSimilarProducts(
      productId,
      parseInt(limit)
    );

    res.json({ success: true, data: relatedProducts });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/products/:productId/bought-together - Frequently bought together
router.get('/products/:productId/bought-together', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { limit = 4 } = req.query;

    const boughtTogether = await recommendationService.getFrequentlyBoughtTogether(
      productId,
      parseInt(limit)
    );

    res.json({ success: true, data: boughtTogether });
  } catch (err) {
    next(err);
  }
});

// POST /catalog/track/view - Track product view
router.post('/track/view', catalogTrackingLimiter, async (req, res, next) => {
  try {
    const { productId, duration, source, searchQuery } = req.body;

    // SECURITY: Validate productId is a valid MongoDB ObjectId
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return next(new AppError('Invalid or missing productId', 400, 'INVALID_PRODUCT_ID'));
    }

    // SECURITY: Validate duration is a non-negative number
    const parsedDuration = parseInt(duration) || 0;
    if (parsedDuration < 0 || parsedDuration > 86400000) { // Max 24 hours in milliseconds
      return next(new AppError('Duration must be between 0 and 86400000 ms', 400, 'INVALID_DURATION'));
    }

    // SECURITY: Validate source is a reasonable string
    const allowedSources = ['direct', 'search', 'recommendation', 'category', 'related', 'external'];
    const validatedSource = allowedSources.includes(source) ? source : 'direct';

    // SECURITY: Limit searchQuery length to prevent large payloads
    if (searchQuery && searchQuery.length > 200) {
      return next(new AppError('searchQuery must be less than 200 characters', 400, 'QUERY_TOO_LONG'));
    }

    const viewData = {
      productId,
      duration: parsedDuration,
      source: validatedSource,
      searchQuery: searchQuery ? searchQuery.substring(0, 200) : undefined,
    };

    // Add userId if authenticated
    if (req.user) {
      viewData.userId = req.user._id;
    } else {
      // Use sessionId for guest users
      viewData.sessionId = req.sessionID || req.headers['x-session-id'];
    }

    await recommendationService.trackProductView(viewData);

    res.json({ success: true, message: 'View tracked successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /catalog/track/search - Track search query
router.post('/track/search', catalogTrackingLimiter, async (req, res, next) => {
  try {
    const { query, filters, resultsCount } = req.body;

    // SECURITY: Validate query string length
    if (!query || typeof query !== 'string') {
      return next(new AppError('Search query is required and must be a string', 400, 'INVALID_QUERY'));
    }

    if (query.length > 200) {
      return next(new AppError('Search query must be less than 200 characters', 400, 'QUERY_TOO_LONG'));
    }

    // SECURITY: Validate filters object structure
    if (filters && typeof filters !== 'object') {
      return next(new AppError('Filters must be an object', 400, 'INVALID_FILTERS'));
    }

    // SECURITY: Limit filters object size
    if (filters && JSON.stringify(filters).length > 1000) {
      return next(new AppError('Filters object is too large', 400, 'FILTERS_TOO_LARGE'));
    }

    // SECURITY: Validate resultsCount is a non-negative number
    const parsedResultsCount = parseInt(resultsCount) || 0;
    if (parsedResultsCount < 0 || parsedResultsCount > 10000) {
      return next(new AppError('Results count must be between 0 and 10000', 400, 'INVALID_RESULTS_COUNT'));
    }

    const searchData = {
      query: query.substring(0, 200),
      filters: filters || {},
      resultsCount: parsedResultsCount,
    };

    // Add userId if authenticated
    if (req.user) {
      searchData.userId = req.user._id;
    } else {
      // Use sessionId for guest users
      searchData.sessionId = req.sessionID || req.headers['x-session-id'];
    }

    const searchHistory = await recommendationService.trackSearch(searchData);

    res.json({
      success: true,
      message: 'Search tracked successfully',
      searchId: searchHistory?._id
    });
  } catch (err) {
    next(err);
  }
});

// POST /catalog/track/search-click - Track clicked product from search
router.post('/track/search-click', catalogTrackingLimiter, async (req, res, next) => {
  try {
    const { searchId, productId } = req.body;

    // SECURITY: Validate searchId is a valid MongoDB ObjectId
    if (!searchId || !mongoose.Types.ObjectId.isValid(searchId)) {
      return next(new AppError('Invalid or missing searchId', 400, 'INVALID_SEARCH_ID'));
    }

    // SECURITY: Validate productId is a valid MongoDB ObjectId
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return next(new AppError('Invalid or missing productId', 400, 'INVALID_PRODUCT_ID'));
    }

    await recommendationService.trackSearchClick(searchId, productId);

    res.json({ success: true, message: 'Search click tracked successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
