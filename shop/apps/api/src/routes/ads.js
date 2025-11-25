// FILE: apps/api/src/routes/ads.js
const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');
const adPlacementController = require('../controllers/adPlacementController');
const { authenticate, authorize } = require('../middleware/auth');

// Public - Ad Placement & Tracking
router.get('/placement/:placement', adPlacementController.getAdForPlacement);
router.get('/sponsored', adPlacementController.getSponsoredAds);
router.post('/:id/impression', adPlacementController.trackImpression);
router.post('/:id/click', adPlacementController.trackClick);

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
router.post('/wallet/recharge', adController.rechargeWallet);
router.get('/wallet/transactions', adController.getWalletTransactions);

module.exports = router;
