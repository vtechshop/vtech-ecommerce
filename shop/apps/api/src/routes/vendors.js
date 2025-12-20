// FILE: apps/api/src/routes/vendors.js
const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const razorpayAccountController = require('../controllers/razorpayAccountController');
const { authenticate, authorize, requireApprovedKYC } = require('../middleware/auth');

// Authenticated onboarding
router.post('/onboard', authenticate, vendorController.onboard);

// Vendor/Admin only routes (MUST come before /:slug)
// Dashboard stats - requires approved KYC
router.get('/dashboard/stats', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.getDashboardStats);

// Product routes - require approved KYC for vendors
router.get('/products', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.getVendorProducts);
router.post('/products', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.createProduct);
router.put('/products/:id', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.updateProduct);
router.delete('/products/:id', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.deleteProduct);
router.post('/products/import', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.importProducts);

// Inventory routes - require approved KYC
router.get('/inventory', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.getInventory);
router.put('/inventory/:productId', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.updateInventory);

// Order routes - require approved KYC
router.get('/orders', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.getVendorOrders);
router.put('/orders/:id/status', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.updateOrderStatus);
router.get('/settlements', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.getSettlements);

// KYC routes
router.get('/kyc', authenticate, authorize(['vendor', 'admin']), vendorController.getKYC);
router.put('/kyc', authenticate, authorize(['vendor', 'admin']), vendorController.updateKYC);
router.post('/kyc/documents', authenticate, authorize(['vendor', 'admin']), vendorController.uploadKYCDocument);
router.delete('/kyc/documents/:documentId', authenticate, authorize(['vendor', 'admin']), vendorController.deleteKYCDocument);

// Settings routes
router.get('/settings', authenticate, authorize(['vendor', 'admin']), vendorController.getSettings);
router.put('/settings/profile', authenticate, authorize(['vendor', 'admin']), vendorController.updateProfile);
router.put('/settings/bank', authenticate, authorize(['vendor', 'admin']), vendorController.updateBank);
router.put('/settings/policies', authenticate, authorize(['vendor', 'admin']), vendorController.updatePolicies);
router.put('/settings/payout', authenticate, authorize(['vendor', 'admin']), vendorController.updatePayout);

// Razorpay Route (automatic payment splits) - require approved KYC
router.post('/razorpay/connect', authenticate, authorize(['vendor']), requireApprovedKYC, razorpayAccountController.createVendorLinkedAccount);
router.get('/razorpay/status', authenticate, authorize(['vendor', 'admin']), razorpayAccountController.getVendorAccountStatus);

// Public routes (MUST be before /:slug to avoid being caught by dynamic route)
router.get('/:slug/reviews', vendorController.getVendorReviews);

// Public route (MUST be last to avoid catching other routes)
router.get('/:slug', vendorController.getVendorBySlug);

module.exports = router;
