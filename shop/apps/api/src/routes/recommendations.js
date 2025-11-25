// FILE: apps/api/src/routes/recommendations.js
const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticate } = require('../middleware/auth');

// Authenticated routes - personalized recommendations
router.get('/personalized', authenticate, recommendationController.getPersonalizedRecommendations);

// Public routes - product-based recommendations
router.get('/similar/:productId', recommendationController.getSimilarProducts);
router.get('/frequently-bought-together/:productId', recommendationController.getFrequentlyBoughtTogether);
router.get('/trending', recommendationController.getTrendingProducts);

module.exports = router;
