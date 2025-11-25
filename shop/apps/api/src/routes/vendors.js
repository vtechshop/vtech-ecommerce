// FILE: apps/api/src/routes/vendors.js
const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticate, authorize } = require('../middleware/auth');

// Authenticated onboarding
router.post('/onboard', authenticate, vendorController.onboard);

// Vendor/Admin only routes (MUST come before /:slug)
router.get('/dashboard/stats', authenticate, authorize(['vendor', 'admin']), vendorController.getDashboardStats);

router.get('/products', authenticate, authorize(['vendor', 'admin']), vendorController.getVendorProducts);
router.post('/products', authenticate, authorize(['vendor', 'admin']), vendorController.createProduct);
router.put('/products/:id', authenticate, authorize(['vendor', 'admin']), vendorController.updateProduct);
router.delete('/products/:id', authenticate, authorize(['vendor', 'admin']), vendorController.deleteProduct);
router.post('/products/import', authenticate, authorize(['vendor', 'admin']), vendorController.importProducts);

router.get('/inventory', authenticate, authorize(['vendor', 'admin']), vendorController.getInventory);
router.put('/inventory/:productId', authenticate, authorize(['vendor', 'admin']), vendorController.updateInventory);

router.get('/orders', authenticate, authorize(['vendor', 'admin']), vendorController.getVendorOrders);
router.put('/orders/:id/status', authenticate, authorize(['vendor', 'admin']), vendorController.updateOrderStatus);
router.get('/settlements', authenticate, authorize(['vendor', 'admin']), vendorController.getSettlements);

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

// Public route (MUST be last to avoid catching other routes)
router.get('/:slug', vendorController.getVendorBySlug);

module.exports = router;
