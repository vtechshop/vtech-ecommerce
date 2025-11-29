// FILE: apps/api/src/routes/catalog.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const recommendationService = require('../services/recommendationService');
const { authenticate } = require('../middleware/auth');

// GET /catalog/products?featured=true&limit=8&tag=electronics
router.get('/products', async (req, res, next) => {
  try {
    const { featured, q, tag, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const query = { published: true }; // Only show published products
    if (featured === 'true') query.featured = true;
    if (q) query.$text = { $search: q };
    if (tag) query.tags = tag.toLowerCase(); // Filter by specific tag

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      Product.countDocuments(query),
    ]);

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/products/:slug
router.get('/products/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug, published: true }).lean();
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' }});
    res.json({ success: true, data: product });
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
router.post('/track/view', async (req, res, next) => {
  try {
    const { productId, duration, source, searchQuery } = req.body;

    const viewData = {
      productId,
      duration: duration || 0,
      source: source || 'direct',
      searchQuery,
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
router.post('/track/search', async (req, res, next) => {
  try {
    const { query, filters, resultsCount } = req.body;

    const searchData = {
      query,
      filters: filters || {},
      resultsCount: resultsCount || 0,
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
router.post('/track/search-click', async (req, res, next) => {
  try {
    const { searchId, productId } = req.body;

    if (!searchId || !productId) {
      return res.status(400).json({
        success: false,
        error: { message: 'searchId and productId are required' }
      });
    }

    await recommendationService.trackSearchClick(searchId, productId);

    res.json({ success: true, message: 'Search click tracked successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
