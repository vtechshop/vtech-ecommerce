// FILE: apps/api/src/routes/catalog.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const recommendationService = require('../services/recommendationService');
const { authenticate } = require('../middleware/auth');
const { catalogTrackingLimiter } = require('../middleware/rateLimiter');
const { cacheMiddleware } = require('../middleware/cache');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');

// Strip symbols that break $text search; keep letters, digits, spaces, hyphens, dots
function sanitizeSearch(q) {
  if (!q) return '';
  return q.replace(/[^a-zA-Z0-9ऀ-ॿ஀-௿\s\-.]/g, ' ').replace(/\s+/g, ' ').trim();
}

// GET /catalog/products?featured=true&limit=8&tag=electronics&vendor=demo-electronics
router.get('/products', cacheMiddleware(300), async (req, res, next) => {
  try {
    const { featured, q, tag, vendor, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    // SECURITY: Cap limit to prevent large data retrieval (max 100 items per request)
    const cappedLimit = Math.min(parseInt(limit), 100);

    const query = { published: true }; // Only show published products
    if (featured === 'true') query.featured = true;
    if (tag) query.tags = tag.toLowerCase(); // Filter by specific tag

    // Text search: multi-word uses AND logic (like Amazon) so only relevant products show
    let searchWords = [];
    const cleanQ = sanitizeSearch(q);
    if (cleanQ) {
      searchWords = cleanQ.split(/\s+/)
        .map(w => w.replace(/^[+\-"]+/, '')) // sanitize operators
        .filter(w => w.length >= 2 || /^\d+$/.test(w)); // keep numbers like "3", "6", "9"

      if (searchWords.length > 1) {
        // Require ALL words — "+chapati +pressing +machine" = AND with stemming
        query.$text = { $search: searchWords.map(w => `+${w}`).join(' ') };
      } else {
        query.$text = { $search: cleanQ };
      }
    }

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

    // When text search is active, project text score for relevance sorting
    let sortOption;
    let projection = {};
    if (cleanQ) {
      projection = { score: { $meta: 'textScore' } };
      // Sort by relevance (text score) by default or when explicitly requested
      if (sort === 'relevance' || sort === '-createdAt') {
        sortOption = { score: { $meta: 'textScore' } };
      } else {
        sortOption = sort;
      }
    } else if (sort === 'relevance') {
      // No text query but relevance sort requested — fall back to pinned-first then newest
      sortOption = { displayOrder: -1, createdAt: -1 };
    } else if (sort === '-createdAt') {
      // Default "Newest First" — respect pinned products first
      sortOption = { displayOrder: -1, createdAt: -1 };
    } else {
      sortOption = sort;
    }

    let [items, total] = await Promise.all([
      Product.find(query, projection).populate('vendorId', 'storeName slug').sort(sortOption).skip(skip).limit(cappedLimit).lean(),
      Product.countDocuments(query),
    ]);

    // Fallback: if strict AND search returns 0 results, try broader OR search
    if (cleanQ && total === 0 && searchWords.length > 1) {
      query.$text = { $search: cleanQ };
      [items, total] = await Promise.all([
        Product.find(query, projection).populate('vendorId', 'storeName slug').sort(sortOption).skip(skip).limit(cappedLimit).lean(),
        Product.countDocuments(query),
      ]);
    }

    // Re-rank by exact word match count so "3MM" ranks above "9MM" when searching "3mm"
    if (cleanQ && searchWords.length > 0 && (sort === 'relevance' || sort === '-createdAt')) {
      const lcWords = searchWords.map(w => w.toLowerCase());
      items.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const aHits = lcWords.filter(w => aTitle.includes(w)).length;
        const bHits = lcWords.filter(w => bTitle.includes(w)).length;
        if (bHits !== aHits) return bHits - aHits;
        return (b.score || 0) - (a.score || 0);
      });
    }

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: cappedLimit } });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/products/:slug
router.get('/products/:slug', cacheMiddleware(600), async (req, res, next) => {
  try {
    const { slug } = req.params;
    const populate = [
      { path: 'vendorId', select: 'storeName slug' },
      { path: 'categoryIds', select: 'name slug' },
    ];

    // 1. Exact slug match
    let product = await Product.findOne({ slug, published: true }).populate(populate).lean();

    // 2. Fallback: convert slug to keywords → $text search
    //    e.g. "vegetable-cutting-machine-with-conveyor" finds
    //    "Automatic Vegetable Cutting Machine with Conveyor"
    if (!product) {
      const keywords = slug.replace(/-+/g, ' ').trim();
      if (keywords.length > 2) {
        try {
          product = await Product.findOne(
            { published: true, $text: { $search: keywords } },
            { score: { $meta: 'textScore' } }
          )
            .sort({ score: { $meta: 'textScore' } })
            .populate(populate)
            .lean();
        } catch {
          // $text index not available — skip fallback
        }
      }
    }

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
    const searchTerm = sanitizeSearch(q);
    if (!searchTerm || searchTerm.length < 1) {
      return res.json({ success: true, data: { suggestions: [], products: [], categories: [] } });
    }

    // Normalize: collapse hyphens/spaces so "pre p" and "pre-p" both match "Pre-Programmed"
    const normalizedTerm = searchTerm.replace(/[-\s]+/g, ' ').trim();
    const escapedTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow space/hyphen interchangeably, and optional whitespace between digit-letter transitions
    const flexPattern = escapedTerm
      .replace(/\s+/g, '[\\s\\-]+')
      .replace(/(\d)([a-zA-Z])/g, '$1\\s*$2')
      .replace(/([a-zA-Z])(\d)/g, '$1\\s*$2');
    const regex = new RegExp(flexPattern, 'i');

    // Run regex queries + category in parallel
    const [regexProducts, categories] = await Promise.all([
      Product.find({ published: true, title: regex })
        .sort({ sold: -1 })
        .limit(8)
        .select('title slug price images')
        .lean(),

      Category.find({ isActive: true, name: regex })
        .limit(4)
        .select('name slug image')
        .lean(),
    ]);

    // If regex found fewer than 3 products, supplement with $text search
    let products = regexProducts;
    if (regexProducts.length < 3 && searchTerm.length >= 2) {
      try {
        const textProducts = await Product.find(
          { published: true, $text: { $search: searchTerm } },
          { score: { $meta: 'textScore' } }
        )
          .sort({ score: { $meta: 'textScore' } })
          .limit(8)
          .select('title slug price images')
          .lean();

        // Merge: regex first, then text results not already included
        const existingIds = new Set(regexProducts.map(p => p._id.toString()));
        const extra = textProducts.filter(p => !existingIds.has(p._id.toString()));
        products = [...regexProducts, ...extra].slice(0, 5);
      } catch {
        // $text search failed (no text index or error) — use regex results only
        products = regexProducts.slice(0, 5);
      }
    } else {
      products = regexProducts.slice(0, 5);
    }

    // Build keyword suggestions from matched titles
    const suggestions = [...new Set(products.map(p => p.title.toLowerCase()))].slice(0, 5);

    res.json({
      success: true,
      data: { suggestions, products, categories },
    });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/search-related?q=banana&limit=8 — Amazon-style "Related to your search"
// Finds products in the same categories as search results (but not the results themselves)
router.get('/search-related', async (req, res, next) => {
  try {
    const { q, limit = 8, exclude = '' } = req.query;
    const cleanRelQ = sanitizeSearch(q);
    if (!cleanRelQ || cleanRelQ.length < 2) {
      return res.json({ success: true, data: [] });
    }
    const cappedLimit = Math.min(parseInt(limit), 20);

    // Step 1: Find products matching the query to identify relevant categories
    const matched = await Product.find(
      { published: true, $text: { $search: cleanRelQ } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(10).select('_id categoryIds').lean();

    // Collect IDs to exclude (matched products + any the frontend already shows)
    const excludeIds = matched.map(p => p._id);
    if (exclude) {
      exclude.split(',').forEach(id => {
        if (mongoose.Types.ObjectId.isValid(id.trim())) {
          excludeIds.push(new mongoose.Types.ObjectId(id.trim()));
        }
      });
    }

    // Step 2: Collect category IDs from matched products
    const categoryIds = [...new Set(
      matched.flatMap(p => (p.categoryIds || []).map(id => id.toString()))
    )];

    if (categoryIds.length === 0) {
      // No category context — return trending products as fallback
      const trending = await Product.find({ published: true, _id: { $nin: excludeIds } })
        .sort({ sold: -1, rating: -1 })
        .limit(cappedLimit)
        .populate('vendorId', 'storeName slug')
        .lean();
      return res.json({ success: true, data: trending });
    }

    // Step 3: Find other products in same categories (excluding already-matched ones)
    const related = await Product.find({
      published: true,
      _id: { $nin: excludeIds },
      categoryIds: { $in: categoryIds.map(id => new mongoose.Types.ObjectId(id)) },
    })
      .sort({ rating: -1, sold: -1 })
      .limit(cappedLimit)
      .populate('vendorId', 'storeName slug')
      .lean();

    res.json({ success: true, data: related });
  } catch (err) {
    next(err);
  }
});

// POST /catalog/shipping/check-restriction — validate state/district/pincode against DB
router.post('/shipping/check-restriction', async (req, res, next) => {
  try {
    const { state = '', district = '', pincode = '' } = req.body;
    const ShippingRestriction = require('../models/ShippingRestriction');

    // Hardcoded: Andaman & Nicobar, Lakshadweep always blocked
    const ALWAYS_BLOCKED = [
      'andaman and nicobar islands', 'andaman and nicobar',
      'andaman & nicobar islands',   'andaman & nicobar', 'lakshadweep',
    ];
    if (state && ALWAYS_BLOCKED.includes(state.trim().toLowerCase())) {
      return res.json({ restricted: true, type: 'state',
        message: `We currently don't deliver to ${state} through our standard shipping — but we can arrange it for you!` });
    }

    // 1. State restriction
    if (state) {
      const sr = await ShippingRestriction.findOne({
        type: 'state', stateName: new RegExp(`^${state.trim()}$`, 'i'), isActive: true,
      });
      if (sr) return res.json({ restricted: true, type: 'state',
        message: `We currently don't deliver to ${state} through our standard shipping — but we can arrange it for you!` });
    }

    // 2. District restriction
    if (state && district) {
      const dr = await ShippingRestriction.findOne({
        type: 'district',
        stateName:    new RegExp(`^${state.trim()}$`,    'i'),
        districtName: new RegExp(`^${district.trim()}$`, 'i'),
        isActive: true,
      });
      if (dr) return res.json({ restricted: true, type: 'district',
        message: `We currently don't deliver to ${district}, ${state} through our standard shipping — but we can arrange it for you!` });
    }

    // 3. Pincode restriction
    if (pincode) {
      const pr = await ShippingRestriction.findOne({ type: 'pincode', pincode: pincode.trim(), isActive: true });
      if (pr) return res.json({ restricted: true, type: 'pincode',
        message: `We currently don't deliver to pincode ${pincode} through our standard shipping — but we can arrange it for you!` });
    }

    res.json({ restricted: false });
  } catch (err) { next(err); }
});

// GET /catalog/categories?limit=6
router.get('/categories', cacheMiddleware(1800), async (req, res, next) => {
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
router.get('/categories/:slug', cacheMiddleware(600), async (req, res, next) => {
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
router.get('/recommendations/trending', cacheMiddleware(600), async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const trendingProducts = await recommendationService.getTrendingProducts(parseInt(limit));

    res.json({ success: true, data: trendingProducts });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/recommendations/top-reviewed - Top reviewed products (no auth required)
router.get('/recommendations/top-reviewed', cacheMiddleware(600), async (req, res, next) => {
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
    const { query, filters, resultsCount, source } = req.body;

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
      source: ['text', 'voice', 'autocomplete'].includes(source) ? source : 'text',
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

// GET /catalog/settings - Public settings for frontend
router.get('/settings', cacheMiddleware(1800), async (req, res, next) => {
  try {
    const Setting = require('../models/Setting');
    const { category, keys } = req.query;

    const query = { isPublic: true };

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    // Filter by specific keys if provided (comma-separated)
    if (keys) {
      const keyList = keys.split(',').map(k => k.trim());
      query.key = { $in: keyList };
    }

    const settings = await Setting.find(query)
      .select('key value type category description')
      .lean();

    // Convert to key-value object for easier frontend consumption
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      success: true,
      data: settingsMap,
      meta: {
        count: settings.length,
        details: settings, // Full setting details if needed
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/meta-feed - Meta (Facebook) product catalog feed in RSS/XML format
// Register this URL in Meta Commerce Manager → Catalog → Data Sources → Data feed
router.get('/meta-feed', async (req, res, next) => {
  try {
    const products = await Product.find({ published: true })
      .populate('vendorId', 'storeName')
      .select('_id title description slug images price compareAtPrice stock brand categoryIds sku')
      .limit(5000)
      .lean();

    const BASE_URL = 'https://www.vtechkitchen.com';

    const escapeXml = (str = '') =>
      String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const items = products.map(p => {
      const imageUrl = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '';
      const additionalImages = Array.isArray(p.images) && p.images.length > 1
        ? p.images.slice(1, 4).map(img => `<g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join('\n      ')
        : '';
      const availability = (p.stock > 0) ? 'in stock' : 'out of stock';
      const price = `${Number(p.price).toFixed(2)} INR`;
      const brand = escapeXml(p.brand || p.vendorId?.storeName || 'V-Tech Kitchen');
      const description = escapeXml(
        (p.description || p.title || '').substring(0, 5000)
      );

      return `    <item>
      <g:id>${escapeXml(String(p._id))}</g:id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${description}</g:description>
      <g:link>${BASE_URL}/product/${escapeXml(p.slug)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      ${additionalImages}
      <g:availability>${availability}</g:availability>
      <g:price>${price}</g:price>${p.compareAtPrice && p.compareAtPrice > p.price ? `\n      <g:sale_price>${price}</g:sale_price>` : ''}
      <g:brand>${brand}</g:brand>
      <g:condition>new</g:condition>${p.sku ? `\n      <g:mpn>${escapeXml(p.sku)}</g:mpn>` : ''}
      <g:google_product_category>Kitchen &amp; Dining</g:google_product_category>
    </item>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>V-Tech Kitchen</title>
    <link>${BASE_URL}</link>
    <description>Premium kitchen appliances and cookware</description>
${items}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
