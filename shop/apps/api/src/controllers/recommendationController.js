// FILE: apps/api/src/controllers/recommendationController.js
const recommendationService = require('../services/recommendationService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Get personalized recommendations for user
 * GET /api/recommendations/personalized
 */
exports.getPersonalizedRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { limit = 10, category, exclude } = req.query;

  const excludeProductIds = exclude ? exclude.split(',') : [];

  const recommendations = await recommendationService.getRecommendations(userId, {
    limit: parseInt(limit),
    excludeProductIds,
    categorySlug: category,
  });

  res.json({
    success: true,
    data: recommendations,
  });
});

/**
 * Get similar products for a product
 * GET /api/recommendations/similar/:productId
 */
exports.getSimilarProducts = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { limit = 8 } = req.query;

  const similarProducts = await recommendationService.getSimilarProducts(
    productId,
    parseInt(limit)
  );

  res.json({
    success: true,
    data: similarProducts,
  });
});

/**
 * Get frequently bought together products
 * GET /api/recommendations/frequently-bought-together/:productId
 */
exports.getFrequentlyBoughtTogether = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { limit = 4 } = req.query;

  const products = await recommendationService.getFrequentlyBoughtTogether(
    productId,
    parseInt(limit)
  );

  res.json({
    success: true,
    data: products,
  });
});

/**
 * Get trending products
 * GET /api/recommendations/trending
 */
exports.getTrendingProducts = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const products = await recommendationService.getTrendingProducts(parseInt(limit));

  res.json({
    success: true,
    data: products,
  });
});
