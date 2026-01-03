// FILE: apps/api/src/routes/newsletter.js
const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const { authenticate, requireRole } = require('../middleware/auth');
const { contentInteractionLimiter, publicReadLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/subscribe', contentInteractionLimiter, newsletterController.subscribe);
router.get('/unsubscribe', publicReadLimiter, newsletterController.unsubscribe);
router.put('/preferences', contentInteractionLimiter, newsletterController.updatePreferences);

// Admin routes - Subscribers
router.get('/admin/subscribers', authenticate, requireRole(['admin']), newsletterController.getAllSubscribers);
router.get('/admin/statistics', authenticate, requireRole(['admin']), newsletterController.getStatistics);
router.delete('/admin/subscribers/:id', authenticate, requireRole(['admin']), newsletterController.deleteSubscriber);

// Admin routes - Campaigns
router.post('/admin/campaigns', authenticate, requireRole(['admin']), newsletterController.createCampaign);
router.get('/admin/campaigns', authenticate, requireRole(['admin']), newsletterController.getAllCampaigns);

module.exports = router;
