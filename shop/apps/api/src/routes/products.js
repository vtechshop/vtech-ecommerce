const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Review = require('../models/Review');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');
const { apiLimiter, publicReadLimiter } = require('../middleware/rateLimiter');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');

// LIST (public) - Cache for 5 minutes, rate limited
router.get('/', publicReadLimiter, cacheMiddleware(300), async (req, res, next) => {
  try {
    const items = await Product.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
});

// GET by id (public) - Cache for 10 minutes, rate limited
router.get('/:id', publicReadLimiter, cacheMiddleware(600), async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    res.json({ success: true, data: p });
  } catch (e) { next(e); }
});

// Validate multiple products (check if they exist and aren't deleted)
// Support both authenticated and guest users (needed for recently viewed products)
router.post('/validate', optionalAuth, apiLimiter, async (req, res, next) => {
  try {
    const { productIds } = req.body;

    // Validation: Check if productIds is provided and is an array
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return next(new AppError('productIds array is required', 400, 'INVALID_INPUT'));
    }

    // SECURITY: Limit array size to prevent DoS attacks (max 1000 products)
    if (productIds.length > 1000) {
      return next(new AppError('Cannot validate more than 1000 products at once', 400, 'ARRAY_TOO_LARGE'));
    }

    // SECURITY: Validate all product IDs are valid MongoDB ObjectIds
    const invalidIds = productIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return next(new AppError('Invalid product ID format', 400, 'INVALID_PRODUCT_ID'));
    }

    // Find products that exist and aren't deleted
    const validProducts = await Product.find({
      _id: { $in: productIds },
      deleted: { $ne: true }
    }).select('_id').lean();

    // Return array of valid product IDs
    const validProductIds = validProducts.map(p => p._id.toString());

    res.json({
      success: true,
      validProducts: validProductIds
    });
  } catch (err) {
    next(err);
  }
});

// Product creation removed - use /api/vendors/products instead
// Vendors must be authenticated and authorized to create products

// ============= PRODUCT REVIEWS =============

// GET reviews for a product - Cache for 5 minutes
router.get('/:productId/reviews', cacheMiddleware(300), async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' }
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ productId, status: 'approved' })
        .populate('userId', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments({ productId, status: 'approved' })
    ]);

    res.json({
      success: true,
      data: reviews,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (err) {
    next(err);
  }
});

// POST a review for a product
router.post('/:productId/reviews', authenticate, async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' }
      });
    }

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_RATING', message: 'Rating must be between 1 and 5' }
      });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_COMMENT', message: 'Review comment must be at least 10 characters' }
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_REVIEW', message: 'You have already reviewed this product' }
      });
    }

    // Create review
    const review = await Review.create({
      productId,
      userId,
      rating,
      comment: comment.trim(),
      status: 'approved' // Auto-approve reviews
    });

    // Update product rating and review count
    const allReviews = await Review.find({ productId, status: 'approved' });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      reviewCount: allReviews.length
    });

    // Populate user data for response
    const populatedReview = await Review.findById(review._id)
      .populate('userId', 'name email')
      .lean();

    res.status(201).json({ success: true, data: populatedReview });
  } catch (err) {
    // Handle duplicate review error from unique index
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_REVIEW', message: 'You have already reviewed this product' }
      });
    }
    next(err);
  }
});

// PUT (edit) a review
router.put('/:productId/reviews/:reviewId', authenticate, async (req, res, next) => {
  try {
    const { productId, reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // Find the review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review not found' }
      });
    }

    // Check if user owns this review OR is admin
    if (review.userId.toString() !== userId.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only edit your own reviews' }
      });
    }

    // Validate input
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_RATING', message: 'Rating must be between 1 and 5' }
      });
    }

    if (comment && comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_COMMENT', message: 'Review comment must be at least 10 characters' }
      });
    }

    // Update review
    if (rating) review.rating = rating;
    if (comment) review.comment = comment.trim();
    await review.save();

    // Update product rating if rating changed
    if (rating) {
      const allReviews = await Review.find({ productId, status: 'approved' });
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      await Product.findByIdAndUpdate(productId, {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: allReviews.length
      });
    }

    // Populate user data for response
    const populatedReview = await Review.findById(review._id)
      .populate('userId', 'name email')
      .lean();

    res.json({ success: true, data: populatedReview });
  } catch (err) {
    next(err);
  }
});

// DELETE a review
router.delete('/:productId/reviews/:reviewId', authenticate, async (req, res, next) => {
  try {
    const { productId, reviewId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // Find the review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review not found' }
      });
    }

    // Check if user owns this review OR is admin
    if (review.userId.toString() !== userId.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only delete your own reviews' }
      });
    }

    // Delete review
    await Review.findByIdAndDelete(reviewId);

    // Update product rating and review count
    const allReviews = await Review.find({ productId, status: 'approved' });
    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    await Product.findByIdAndUpdate(productId, {
      rating: allReviews.length > 0 ? Math.round(avgRating * 10) / 10 : 0,
      reviewCount: allReviews.length
    });

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
