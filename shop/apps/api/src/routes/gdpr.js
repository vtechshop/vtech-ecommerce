// FILE: apps/api/src/routes/gdpr.js
const express = require('express');
const router = express.Router();
const gdprController = require('../controllers/gdprController');
const { authenticate, authorize } = require('../middleware/auth');

// User routes (authenticated users can export/delete their own data)
router.get('/export', authenticate, gdprController.exportData);
router.post('/request-deletion', authenticate, gdprController.requestDeletion);
router.post('/cancel-deletion', authenticate, gdprController.cancelDeletion);

// Admin routes (for handling user requests)
router.post('/admin/anonymize/:userId', authenticate, authorize(['admin']), gdprController.anonymizeUser);
router.delete('/admin/permanently-delete/:userId', authenticate, authorize(['admin']), gdprController.permanentlyDeleteUser);

module.exports = router;
