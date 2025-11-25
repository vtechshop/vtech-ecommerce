// FILE: apps/api/src/routes/notifications.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');

// Get notification counts (admin/vendor only)
router.get(
  '/counts',
  authenticate,
  authorize('admin', 'vendor'),
  notificationController.getNotificationCounts
);

// Mark notifications as read
router.post(
  '/mark-read',
  authenticate,
  authorize('admin', 'vendor'),
  notificationController.markNotificationsRead
);

module.exports = router;
