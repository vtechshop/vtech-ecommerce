// FILE: apps/api/src/routes/ads.js
const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const adPlacementController = require('../controllers/adPlacementController');
const { authenticate, authorize } = require('../middleware/auth');
const { catalogTrackingLimiter } = require('../middleware/rateLimiter');

// Public - Ad Placement & Tracking
router.get('/placement/:placement', adPlacementController.getAdForPlacement);
router.get('/sponsored', adPlacementController.getSponsoredAds);
// SECURITY: Added rate limiting to prevent impression/click fraud
router.post('/:id/impression', catalogTrackingLimiter, adPlacementController.trackImpression);
router.post('/:id/click', catalogTrackingLimiter, adPlacementController.trackClick);

// Public - Legacy
router.post('/auction', adController.runAuction);
router.post('/events', adController.trackEvent);

// Vendor/Admin
router.use(authenticate);
router.use(authorize(['vendor', 'admin']));

router.get('/campaigns', adController.getCampaigns);
router.post('/campaigns', adController.createCampaign);
router.get('/campaigns/:id', adController.getCampaignById);
router.put('/campaigns/:id', adController.updateCampaign);
router.delete('/campaigns/:id', adController.deleteCampaign);

router.get('/campaigns/:campaignId/creatives', adController.getCreatives);
router.post('/campaigns/:campaignId/creatives', adController.createCreative);

router.get('/campaigns/:id/report', adController.getCampaignReport);

router.get('/wallet', adController.getWallet);
router.post('/wallet/recharge/create-order', adController.createWalletRechargeOrder);
router.post('/wallet/recharge/verify', adController.verifyWalletRechargePayment);
router.post('/wallet/recharge', adController.rechargeWallet); // DEPRECATED
router.get('/wallet/transactions', adController.getWalletTransactions);

module.exports = router;
