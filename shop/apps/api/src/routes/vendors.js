// FILE: apps/api/src/routes/vendors.js
const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const razorpayAccountController = require('../controllers/razorpayAccountController');
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize, requireApprovedKYC } = require('../middleware/auth');

// Authenticated onboarding
router.post('/onboard', authenticate, vendorController.onboard);

// Vendor/Admin only routes (MUST come before /:slug)
// Dashboard stats - requires approved KYC
router.get('/dashboard/stats', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.getDashboardStats);

// Category routes - allow vendors to manage categories without KYC approval
router.get('/categories/stats', authenticate, authorize(['vendor', 'admin']), vendorController.getCategoryStats);
router.get('/categories', authenticate, authorize(['vendor', 'admin']), vendorController.getCategories);
router.post('/categories', authenticate, authorize(['vendor', 'admin']), vendorController.createCategory);
router.put('/categories/:id', authenticate, authorize(['vendor', 'admin']), vendorController.updateCategory);
router.delete('/categories/:id', authenticate, authorize(['vendor', 'admin']), vendorController.deleteCategory);

// Product routes - require approved KYC for creating/modifying products
router.get('/products/stats', authenticate, authorize(['vendor', 'admin']), vendorController.getProductStats);
router.get('/products/export', authenticate, authorize(['vendor', 'admin']), vendorController.exportProducts);
router.get('/products', authenticate, authorize(['vendor', 'admin']), vendorController.getVendorProducts);
router.post('/products', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.createProduct);
router.post('/products/bulk-delete', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.bulkDeleteProducts);
router.post('/products/bulk-price-update', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.bulkPriceUpdate);
router.post('/products/import', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.importProducts);
router.put('/products/:id', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.updateProduct);
router.delete('/products/:id', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.deleteProduct);

// Inventory routes - allow vendors to manage inventory without KYC approval
router.get('/inventory/stats', authenticate, authorize(['vendor', 'admin']), vendorController.getInventoryStats);
router.get('/inventory', authenticate, authorize(['vendor', 'admin']), vendorController.getInventory);
router.put('/inventory/:productId', authenticate, authorize(['vendor', 'admin']), vendorController.updateInventory);

// Manual order routes - require approved KYC
router.get('/manual-orders', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.getVendorManualOrders);
router.post('/manual-orders', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.createVendorManualOrder);
router.put('/manual-orders/:id', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.updateVendorManualOrder);
router.put('/manual-orders/:id/cancel', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.cancelVendorManualOrder);

// Order routes - require approved KYC
router.get('/orders/counts', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.getVendorOrderCounts);
router.get('/orders', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.getVendorOrders);
router.get('/orders/:id/invoice', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, invoiceController.downloadInvoiceVendor);
router.put('/orders/:id/status', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.updateOrderStatus);
router.get('/settlements/stats', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.getSettlementStats);
router.get('/settlements/export', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.exportSettlements);
router.get('/settlements', authenticate, authorize(['vendor', 'admin']), requireApprovedKYC, vendorController.getSettlements);

// KYC routes
router.get('/kyc', authenticate, authorize(['vendor', 'admin']), vendorController.getKYC);
router.get('/kyc/stats', authenticate, authorize(['vendor', 'admin']), vendorController.getKYCStats);
router.put('/kyc', authenticate, authorize(['vendor', 'admin']), vendorController.updateKYC);
router.post('/kyc/documents', authenticate, authorize(['vendor', 'admin']), vendorController.uploadKYCDocument);
router.delete('/kyc/documents/:documentId', authenticate, authorize(['vendor', 'admin']), vendorController.deleteKYCDocument);

// Settings routes - allow vendors to manage settings without KYC approval
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
