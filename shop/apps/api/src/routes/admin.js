const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const crm = require('../controllers/crmController');
const { authenticate, authorize } = require('../middleware/auth');

// secure all admin endpoints
router.use(authenticate);
router.use(authorize(['admin']));

// Dashboard
router.get('/dashboard/stats', admin.getDashboardStats);

// Users
router.get('/users', admin.getUsers);
router.get('/users/:id', admin.getUserById);
router.put('/users/:id', admin.updateUser);
router.delete('/users/:id', admin.deleteUser);
router.put('/users/:id/reset-password', admin.resetUserPassword);

// Products
router.get('/products', admin.getProducts);
router.get('/products/:id', admin.getProductById);
router.post('/products', admin.createProduct);
router.put('/products/:id', admin.updateProduct);
router.delete('/products/:id', admin.deleteProduct);
router.put('/products/:id/approve', admin.approveProduct);
router.put('/products/:id/reject', admin.rejectProduct);
router.put('/products/:id/commission-rules', admin.updateProductCommissionRules);

// Categories
router.get('/categories', admin.getCategories);
router.post('/categories', admin.createCategory);
router.put('/categories/:id', admin.updateCategory);
router.delete('/categories/:id', admin.deleteCategory);

// Orders
router.get('/orders', admin.getOrders);
router.get('/orders/:id', admin.getOrderById);
router.put('/orders/:id/status', admin.updateOrderStatus);

// Vendors
router.get('/vendors', admin.getVendors);
router.put('/vendors/:id/approve', admin.approveVendor);
router.put('/vendors/:id/reject', admin.rejectVendor);
router.put('/vendors/:id/suspend', admin.suspendVendor);
router.put('/vendors/:id/commission', admin.updateVendorCommission);
router.put('/vendors/:id/commission-rules', admin.updateVendorCommissionRules);

// Affiliates
router.get('/affiliates', admin.getAffiliates);
router.put('/affiliates/:id/approve', admin.approveAffiliate);
router.put('/affiliates/:id/reject', admin.rejectAffiliate);
router.put('/affiliates/:id/suspend', admin.suspendAffiliate);
router.put('/affiliates/:id/commission-rules', admin.updateAffiliateCommissionRules);

// Commissions / Payouts
router.get('/commissions', admin.getCommissions);
router.get('/commissions/stats', admin.getCommissionStats);
router.put('/commissions/:id/approve', admin.approveCommission);
router.put('/commissions/:id/reject', admin.rejectCommission);
router.put('/commissions/:id/pay', admin.payCommission);
router.post('/commissions/bulk-approve', admin.bulkApproveCommissions);
router.post('/commissions/bulk-pay', admin.bulkPayCommissions);
router.get('/payouts', admin.getPayouts);
router.post('/payouts', admin.createPayout);

// Enhanced Payout Management
router.get('/payouts/pending', admin.getVendorPendingPayouts);
router.post('/payouts/process', admin.processVendorPayout);
router.post('/payouts/vendor/:vendorId/batch', admin.batchProcessVendorPayout);
router.get('/payouts/history', admin.getPayoutHistory);

// Ads
router.get('/ads/campaigns', admin.getAdCampaigns);
router.post('/ads/campaigns', admin.createAdCampaign);
router.put('/ads/campaigns/:id', admin.updateAdCampaign);
router.delete('/ads/campaigns/:id', admin.deleteAdCampaign);
router.put('/ads/campaigns/:id/status', admin.updateAdCampaignStatus);

// Blog / CMS
router.get('/posts', admin.getPosts);
router.post('/posts', admin.createPost);
router.put('/posts/:id', admin.updatePost);
router.delete('/posts/:id', admin.deletePost);

router.get('/pages', admin.getPages);
router.post('/pages', admin.createPage);
router.put('/pages/:id', admin.updatePage);
router.delete('/pages/:id', admin.deletePage);

// Settings
router.get('/settings', admin.getSettings);
router.put('/settings/:key', admin.updateSetting);

// Audit
router.get('/audit-logs', admin.getAuditLogs);

// Contact Submissions
router.get('/contact-submissions', admin.getContactSubmissions);
router.get('/contact-submissions/:id', admin.getContactSubmissionById);
router.put('/contact-submissions/:id/status', admin.updateContactSubmissionStatus);
router.put('/contact-submissions/:id/notes', admin.updateContactSubmissionNotes);
router.delete('/contact-submissions/:id', admin.deleteContactSubmission);

// KYC Management
router.get('/kyc/pending', admin.getPendingKYC);
router.get('/kyc/vendors/:id', admin.getVendorKYC);
router.get('/kyc/affiliates/:id', admin.getAffiliateKYC);
router.put('/kyc/vendors/:id/approve', admin.approveVendorKYC);
router.put('/kyc/vendors/:id/reject', admin.rejectVendorKYC);
router.put('/kyc/affiliates/:id/approve', admin.approveAffiliateKYC);
router.put('/kyc/affiliates/:id/reject', admin.rejectAffiliateKYC);

// Reviews Management
router.get('/reviews', admin.getReviews);
router.get('/reviews/:id', admin.getReviewById);
router.put('/reviews/:id/status', admin.updateReviewStatus);
router.delete('/reviews/:id', admin.deleteReview);
router.put('/reviews/:id/respond', admin.respondToReview);

// CRM - Customer Relationship Management
router.get('/crm/stats', crm.getCRMStats);
router.get('/crm/customers', crm.getCRMCustomers);
router.get('/crm/customers/:id/orders', crm.getCustomerOrders);

// Payments
router.get('/payments/stats', admin.getPaymentStats);
router.get('/payments', admin.getPayments);

module.exports = router;
