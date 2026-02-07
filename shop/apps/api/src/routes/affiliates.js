const express = require('express');
const router = express.Router();
const affiliateController = require('../controllers/affiliateController');
const razorpayAccountController = require('../controllers/razorpayAccountController');
const { authenticate } = require('../middleware/auth');
const { catalogTrackingLimiter } = require('../middleware/rateLimiter');

// Public routes - SECURITY: Added rate limiting to prevent click fraud
router.post('/track/click', catalogTrackingLimiter, affiliateController.trackClick);

// Affiliate application (authenticated)
router.post('/apply', authenticate, affiliateController.apply);

// Affiliate-only routes
router.use(authenticate);

router.get('/me', affiliateController.getAffiliateProfile);
router.put('/payment-details', affiliateController.updatePaymentDetails);
router.get('/dashboard/stats', affiliateController.getDashboardStats);
router.get('/links', affiliateController.getLinks);
router.get('/links/stats', affiliateController.getLinkStats);
router.get('/products/stats', affiliateController.getProductStats);
router.get('/commissions/stats', affiliateController.getCommissionStats);
router.get('/commissions', affiliateController.getCommissions);
router.get('/payouts', affiliateController.getPayouts);

// Preferences routes
router.get('/preferences', affiliateController.getPreferences);
router.put('/preferences', affiliateController.updatePreferences);

// Product-specific affiliate links
router.post('/links/generate', affiliateController.generateProductLink);
router.get('/links/product', affiliateController.getProductLinks);
router.delete('/links/:linkId', affiliateController.deleteAffiliateLink);

// KYC routes
router.get('/kyc', affiliateController.getKYC);
router.put('/kyc', affiliateController.updateKYC);
router.post('/kyc/documents', affiliateController.uploadKYCDocument);
router.delete('/kyc/documents/:documentId', affiliateController.deleteKYCDocument);

// Razorpay Route (automatic payment splits)
router.post('/razorpay/connect', razorpayAccountController.createAffiliateLinkedAccount);
router.get('/razorpay/status', razorpayAccountController.getAffiliateAccountStatus);

module.exports = router;