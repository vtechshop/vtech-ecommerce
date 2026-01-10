const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const adminAds = require('../controllers/adminAdsController');
const crm = require('../controllers/crmController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');
const { getSecurityStats } = require('../middleware/advancedSecurity');

// secure all admin endpoints
router.use(authenticate);
router.use(authorize(['admin']));

// Dashboard
router.get('/dashboard/stats', admin.getDashboardStats);

// Security Monitoring Dashboard (Amazon-Level)
router.get('/security/stats', (req, res) => {
  try {
    const stats = getSecurityStats();
    res.json({
      success: true,
      data: {
        ...stats,
        message: 'Security statistics retrieved successfully',
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve security statistics',
        code: 'SECURITY_STATS_ERROR',
      },
    });
  }
});

// Users - SECURITY: Added ObjectId validation
router.get('/users', admin.getUsers);
router.get('/users/:id', validateObjectId('id'), admin.getUserById);
router.put('/users/:id', validateObjectId('id'), admin.updateUser);
router.delete('/users/:id', validateObjectId('id'), admin.deleteUser);
router.put('/users/:id/reset-password', validateObjectId('id'), admin.resetUserPassword);

// Products - SECURITY: Added ObjectId validation
router.get('/products', admin.getProducts);
router.get('/products/:id', validateObjectId('id'), admin.getProductById);
router.post('/products', admin.createProduct);
router.put('/products/:id', validateObjectId('id'), admin.updateProduct);
router.delete('/products/:id', validateObjectId('id'), admin.deleteProduct);
router.put('/products/:id/approve', validateObjectId('id'), admin.approveProduct);
router.put('/products/:id/reject', validateObjectId('id'), admin.rejectProduct);
router.put('/products/:id/commission-rules', validateObjectId('id'), admin.updateProductCommissionRules);

// Categories - SECURITY: Added ObjectId validation
router.get('/categories', admin.getCategories);
router.post('/categories', admin.createCategory);
router.put('/categories/:id', validateObjectId('id'), admin.updateCategory);
router.delete('/categories/:id', validateObjectId('id'), admin.deleteCategory);

// Orders - SECURITY: Added ObjectId validation
router.get('/orders', admin.getOrders);
router.get('/orders/:id', validateObjectId('id'), admin.getOrderById);
router.put('/orders/:id/status', validateObjectId('id'), admin.updateOrderStatus);

// Vendors - SECURITY: Added ObjectId validation
router.get('/vendors', admin.getVendors);
router.put('/vendors/:id/approve', validateObjectId('id'), admin.approveVendor);
router.put('/vendors/:id/reject', validateObjectId('id'), admin.rejectVendor);
router.put('/vendors/:id/suspend', validateObjectId('id'), admin.suspendVendor);
router.put('/vendors/:id/commission', validateObjectId('id'), admin.updateVendorCommission);
router.put('/vendors/:id/commission-rules', validateObjectId('id'), admin.updateVendorCommissionRules);

// Affiliates - SECURITY: Added ObjectId validation
router.get('/affiliates', admin.getAffiliates);
router.put('/affiliates/:id/approve', validateObjectId('id'), admin.approveAffiliate);
router.put('/affiliates/:id/reject', validateObjectId('id'), admin.rejectAffiliate);
router.put('/affiliates/:id/suspend', validateObjectId('id'), admin.suspendAffiliate);
router.put('/affiliates/:id/commission-rules', validateObjectId('id'), admin.updateAffiliateCommissionRules);
router.post('/affiliates/:id/payout', validateObjectId('id'), admin.recordAffiliatePayout);

// Commissions / Payouts - SECURITY: Added ObjectId validation
router.get('/commissions', admin.getCommissions);
router.get('/commissions/stats', admin.getCommissionStats);
router.put('/commissions/:id/approve', validateObjectId('id'), admin.approveCommission);
router.put('/commissions/:id/reject', validateObjectId('id'), admin.rejectCommission);
router.put('/commissions/:id/pay', validateObjectId('id'), admin.payCommission);
router.post('/commissions/bulk-approve', admin.bulkApproveCommissions);
router.post('/commissions/bulk-pay', admin.bulkPayCommissions);
router.get('/payouts', admin.getPayouts);
router.post('/payouts', admin.createPayout);

// Enhanced Payout Management - SECURITY: Added ObjectId validation
router.get('/payouts/pending', admin.getVendorPendingPayouts);
router.post('/payouts/process', admin.processVendorPayout);
router.post('/payouts/vendor/:vendorId/batch', validateObjectId('vendorId'), admin.batchProcessVendorPayout);
router.get('/payouts/history', admin.getPayoutHistory);

// Ads - SECURITY: Added ObjectId validation
router.get('/ads/campaigns', admin.getAdCampaigns);
router.post('/ads/campaigns', admin.createAdCampaign);
router.put('/ads/campaigns/:id', validateObjectId('id'), admin.updateAdCampaign);
router.delete('/ads/campaigns/:id', validateObjectId('id'), admin.deleteAdCampaign);
router.put('/ads/campaigns/:id/status', validateObjectId('id'), admin.updateAdCampaignStatus);

// Ads - New Amazon-style management
router.get('/ads/pricing-settings', adminAds.getPricingSettings);
router.get('/ads/pricing-settings/:placement', adminAds.getPricingSettingByPlacement);
router.post('/ads/pricing-settings', adminAds.upsertPricingSettings);
router.post('/ads/pricing-settings/initialize', adminAds.initializeDefaultPricingSettings);

router.get('/ads/campaigns/all', adminAds.getAllCampaigns);
router.get('/ads/campaigns/pending', adminAds.getPendingCampaigns);
router.get('/ads/campaigns/stats', adminAds.getCampaignStatsSummary);
router.put('/ads/campaigns/:id/approve', validateObjectId('id'), adminAds.approveCampaign);
router.put('/ads/campaigns/:id/reject', validateObjectId('id'), adminAds.rejectCampaign);
router.put('/ads/campaigns/:id/pause', validateObjectId('id'), adminAds.pauseCampaign);

// Blog / CMS - SECURITY: Added ObjectId validation
router.get('/posts', admin.getPosts);
router.post('/posts', admin.createPost);
router.put('/posts/:id', validateObjectId('id'), admin.updatePost);
router.delete('/posts/:id', validateObjectId('id'), admin.deletePost);

router.get('/pages', admin.getPages);
router.post('/pages', admin.createPage);
router.put('/pages/:id', validateObjectId('id'), admin.updatePage);
router.delete('/pages/:id', validateObjectId('id'), admin.deletePage);

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

// Data cleanup - Remove orphaned profiles
router.post('/cleanup/orphaned-profiles', admin.cleanupOrphanedProfiles);

module.exports = router;
