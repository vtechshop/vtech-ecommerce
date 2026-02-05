// FILE: apps/api/src/routes/communication.js
const express = require('express');
const router = express.Router();
const communication = require('../controllers/communicationController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Admin-only routes
router.get('/', authorize(['admin']), communication.getAllCommunications);
router.get('/stats', authorize(['admin']), communication.getStats);
router.post('/bulk-update', authorize(['admin']), communication.bulkUpdateCommunications);
router.get('/:id', authorize(['admin']), communication.getCommunicationById);
router.put('/:id', authorize(['admin']), communication.updateCommunication);
router.put('/:id/read', authorize(['admin']), communication.markAsRead);
router.post('/:id/resend', authorize(['admin']), communication.resendCommunication);
router.delete('/:id', authorize(['admin']), communication.deleteCommunication);

// Send messages (admin only)
router.post('/send/whatsapp', authorize(['admin']), communication.sendWhatsApp);
router.post('/send/email', authorize(['admin']), communication.sendEmail);
router.post('/send/sms', authorize(['admin']), communication.sendSMS);
router.post('/send/campaign', authorize(['admin']), communication.sendMarketingCampaign);

module.exports = router;
