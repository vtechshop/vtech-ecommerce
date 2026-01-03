// FILE: apps/api/src/routes/loyalty.js
const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const { authenticate, authorize } = require('../middleware/auth');
const { contentInteractionLimiter } = require('../middleware/rateLimiter');

// Public: Get points configuration
router.get('/config', loyaltyController.getPointsConfig);

// User routes (authenticated)
router.get('/account', authenticate, loyaltyController.getAccount);
router.get('/transactions', authenticate, loyaltyController.getTransactionHistory);
router.get('/statistics', authenticate, loyaltyController.getStatistics);
router.post('/redeem', authenticate, contentInteractionLimiter, loyaltyController.redeemPoints);

// Admin routes
router.post('/admin/award', authenticate, authorize(['admin']), loyaltyController.awardPointsAdmin);
router.get('/admin/users', authenticate, authorize(['admin']), loyaltyController.getAllUsersLoyalty);

module.exports = router;
