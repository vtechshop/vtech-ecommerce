// FILE: apps/api/src/routes/notifications.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');

const allRoles = ['admin', 'vendor', 'affiliate', 'customer'];

// Get paginated notifications for the authenticated user
router.get(
  '/',
  authenticate,
  authorize(allRoles),
  notificationController.getNotifications
);

// Get notification counts (all authenticated users)
router.get(
  '/counts',
  authenticate,
  authorize(allRoles),
  notificationController.getNotificationCounts
);

// Mark notifications as read
router.post(
  '/mark-read',
  authenticate,
  authorize(allRoles),
  notificationController.markNotificationsRead
);

module.exports = router;
