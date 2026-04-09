const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const adminAds = require('../controllers/adminAdsController');
const crm = require('../controllers/crmController');
const invoiceController = require('../controllers/invoiceController');
const sitemapController = require('../controllers/sitemapController');
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
router.get('/users/stats', admin.getUserStats);
router.get('/users/:id', validateObjectId('id'), admin.getUserById);
router.get('/users/:id/activity', validateObjectId('id'), admin.getUserActivity);
router.put('/users/:id', validateObjectId('id'), admin.updateUser);
router.delete('/users/:id', validateObjectId('id'), admin.deleteUser);
router.put('/users/:id/reset-password', validateObjectId('id'), admin.resetUserPassword);
router.post('/users/bulk-update', admin.bulkUpdateUsers);

// Products - SECURITY: Added ObjectId validation
router.get('/products', admin.getProducts);
router.get('/products/:id', validateObjectId('id'), admin.getProductById);
router.post('/products', admin.createProduct);
router.put('/products/:id', validateObjectId('id'), admin.updateProduct);
router.delete('/products/:id', validateObjectId('id'), admin.deleteProduct);
router.put('/products/:id/approve', validateObjectId('id'), admin.approveProduct);
router.put('/products/:id/reject', validateObjectId('id'), admin.rejectProduct);
router.post('/products/reassign', admin.reassignProducts);
router.put('/products/:id/commission-rules', validateObjectId('id'), admin.updateProductCommissionRules);

// Categories - SECURITY: Added ObjectId validation
router.get('/categories', admin.getCategories);
router.post('/categories', admin.createCategory);
router.put('/categories/:id', validateObjectId('id'), admin.updateCategory);
router.delete('/categories/:id', validateObjectId('id'), admin.deleteCategory);

// Orders - SECURITY: Added ObjectId validation
router.get('/orders/counts', admin.getOrderCounts);
router.get('/orders', admin.getOrders);
router.get('/orders/:id', validateObjectId('id'), admin.getOrderById);
router.get('/orders/:id/invoice', validateObjectId('id'), invoiceController.downloadInvoiceAdmin);
router.put('/orders/:id/status', validateObjectId('id'), admin.updateOrderStatus);
router.put('/orders/:id/address', validateObjectId('id'), admin.updateOrderAddress);

// Vendors - SECURITY: Added ObjectId validation
router.get('/vendors', admin.getVendors);
router.get('/vendors/stats', admin.getVendorStats);
router.put('/vendors/:id/approve', validateObjectId('id'), admin.approveVendor);
router.put('/vendors/:id/reject', validateObjectId('id'), admin.rejectVendor);
router.put('/vendors/:id/suspend', validateObjectId('id'), admin.suspendVendor);
router.delete('/vendors/:id', validateObjectId('id'), admin.deleteVendor);
router.put('/vendors/:id/commission', validateObjectId('id'), admin.updateVendorCommission);
router.put('/vendors/:id/commission-rules', validateObjectId('id'), admin.updateVendorCommissionRules);
router.put('/vendors/:id/settlement-config', validateObjectId('id'), admin.updateVendorSettlementConfig);

// Affiliates - SECURITY: Added ObjectId validation
router.get('/affiliates', admin.getAffiliates);
router.get('/affiliates/stats', admin.getAffiliateStats);
router.put('/affiliates/:id/approve', validateObjectId('id'), admin.approveAffiliate);
router.put('/affiliates/:id/reject', validateObjectId('id'), admin.rejectAffiliate);
router.put('/affiliates/:id/suspend', validateObjectId('id'), admin.suspendAffiliate);
router.delete('/affiliates/:id', validateObjectId('id'), admin.deleteAffiliate);
router.put('/affiliates/:id/commission-rules', validateObjectId('id'), admin.updateAffiliateCommissionRules);
router.post('/affiliates/:id/payout', validateObjectId('id'), admin.recordAffiliatePayout);

// Commissions / Payouts - SECURITY: Added ObjectId validation
router.get('/commissions', admin.getCommissions);
router.get('/commissions/stats', admin.getCommissionStats);
router.get('/commissions/export', admin.exportVendorCommissions);
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

// Razorpay Route - Release held transfers
router.post('/payouts/release-transfers/:orderId', validateObjectId('orderId'), admin.releaseHeldTransfers);

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
router.get('/ads/analytics', adminAds.getAdAnalytics);
router.get('/ads/wallets', adminAds.getAllWallets);

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
router.get('/settings/stats', admin.getSettingsStats);
router.get('/settings/export', admin.exportSettings);
router.post('/settings/bulk-update', admin.bulkUpdateSettings);
router.get('/settings', admin.getSettings);
router.put('/settings/:key', admin.updateSetting);

// Audit
router.get('/audit-logs', admin.getAuditLogs);

// Contact Submissions
router.get('/contact-submissions/stats', admin.getContactSubmissionStats);
router.get('/contact-submissions', admin.getContactSubmissions);
router.get('/contact-submissions/:id', validateObjectId('id'), admin.getContactSubmissionById);
router.put('/contact-submissions/:id/status', validateObjectId('id'), admin.updateContactSubmissionStatus);
router.put('/contact-submissions/:id/notes', validateObjectId('id'), admin.updateContactSubmissionNotes);
router.post('/contact-submissions/:id/reply', validateObjectId('id'), admin.replyToContactSubmission);
router.delete('/contact-submissions/:id', validateObjectId('id'), admin.deleteContactSubmission);
router.post('/contact-submissions/bulk-update', admin.bulkUpdateContactSubmissions);

// KYC Management
router.get('/kyc/pending', admin.getPendingKYC);
router.get('/kyc/vendors/:id', admin.getVendorKYC);
router.get('/kyc/affiliates/:id', admin.getAffiliateKYC);
router.put('/kyc/vendors/:id/approve', admin.approveVendorKYC);
router.put('/kyc/vendors/:id/reject', admin.rejectVendorKYC);
router.put('/kyc/affiliates/:id/approve', admin.approveAffiliateKYC);
router.put('/kyc/affiliates/:id/reject', admin.rejectAffiliateKYC);

// Reviews Management
router.get('/reviews/stats', admin.getReviewStats);
router.get('/reviews', admin.getReviews);
router.get('/reviews/:id', validateObjectId('id'), admin.getReviewById);
router.put('/reviews/:id/status', validateObjectId('id'), admin.updateReviewStatus);
router.delete('/reviews/:id', validateObjectId('id'), admin.deleteReview);
router.put('/reviews/:id/respond', validateObjectId('id'), admin.respondToReview);
router.post('/reviews/bulk-update', admin.bulkUpdateReviews);

// CRM - Customer Relationship Management
router.get('/crm/stats', crm.getCRMStats);
router.get('/crm/customers', crm.getCRMCustomers);
router.get('/crm/customers/:id/orders', crm.getCustomerOrders);

// CRM - Support Tickets
router.get('/crm/tickets/stats', crm.getTicketStats);
router.get('/crm/tickets', crm.getTickets);
router.put('/crm/tickets/:id/status', validateObjectId('id'), crm.updateTicketStatus);
router.put('/crm/tickets/:id/priority', validateObjectId('id'), crm.updateTicketPriority);
router.post('/crm/tickets/:id/reply', validateObjectId('id'), crm.replyToTicket);

// Payments
router.get('/payments/stats', admin.getPaymentStats);
router.get('/payments', admin.getPayments);

// Manual Orders (In-store / Phone sales)
router.get('/manual-orders', admin.getManualOrders);
router.post('/manual-orders', admin.createManualOrder);
router.put('/manual-orders/:id', validateObjectId('id'), admin.updateManualOrder);
router.put('/manual-orders/:id/cancel', validateObjectId('id'), admin.cancelManualOrder);

// Data cleanup - Remove orphaned profiles
router.post('/cleanup/orphaned-profiles', admin.cleanupOrphanedProfiles);

// Carousel Management
router.get('/carousel', admin.getCarouselItems);
router.get('/carousel/:id', validateObjectId('id'), admin.getCarouselItem);
router.post('/carousel', admin.createCarouselItem);
router.put('/carousel/:id', validateObjectId('id'), admin.updateCarouselItem);
router.delete('/carousel/:id', validateObjectId('id'), admin.deleteCarouselItem);
router.put('/carousel/reorder', admin.reorderCarouselItems);

// Inventory Management (Amazon-style)
router.get('/inventory/stats', admin.getInventoryStats);
router.get('/inventory/export', admin.exportInventory);
router.get('/inventory', admin.getInventory);
router.put('/inventory/:productId/stock', validateObjectId('productId'), admin.updateInventoryStock);
router.post('/inventory/:productId/restock-reminder', validateObjectId('productId'), admin.sendRestockReminder);

// SEO - IndexNow bulk URL submission
router.post('/seo/indexnow/submit', sitemapController.submitIndexNow);

module.exports = router;
