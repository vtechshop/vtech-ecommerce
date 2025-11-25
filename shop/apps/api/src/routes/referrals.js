// FILE: apps/api/src/routes/referrals.js
const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/validate/:code', optionalAuth, referralController.validateReferralCode);
router.get('/leaderboard', referralController.getLeaderboard);

// Authenticated user routes
router.get('/my-program', authenticate, referralController.getMyReferralProgram);
router.post('/apply', authenticate, referralController.applyReferralCode);

// Admin routes
router.get('/stats', authenticate, authorize(['admin']), referralController.getReferralStats);

module.exports = router;
