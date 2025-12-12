const express = require('express');
const router = express.Router();
const affiliateController = require('../controllers/affiliateController');
const { authenticate } = require('../middleware/auth');
const { catalogTrackingLimiter } = require('../middleware/rateLimiter');

// Public routes - SECURITY: Added rate limiting to prevent click fraud
router.post('/track/click', catalogTrackingLimiter, affiliateController.trackClick);

// Affiliate application (authenticated)
router.post('/apply', authenticate, affiliateController.apply);

// Affiliate-only routes
router.use(authenticate);

router.get('/dashboard/stats', affiliateController.getDashboardStats);
router.get('/links', affiliateController.getLinks);
router.get('/commissions', affiliateController.getCommissions);
router.get('/payouts', affiliateController.getPayouts);

// Product-specific affiliate links
router.post('/links/generate', affiliateController.generateProductLink);
router.get('/links/product', affiliateController.getProductLinks);
router.delete('/links/:linkId', affiliateController.deleteAffiliateLink);

// KYC routes
router.get('/kyc', affiliateController.getKYC);
router.put('/kyc', affiliateController.updateKYC);
router.post('/kyc/documents', affiliateController.uploadKYCDocument);
router.delete('/kyc/documents/:documentId', affiliateController.deleteKYCDocument);

module.exports = router;