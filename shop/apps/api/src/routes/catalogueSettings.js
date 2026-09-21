// FILE: apps/api/src/routes/catalogueSettings.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/catalogueSettingsController');
const { authenticate, authorize } = require('../middleware/auth');

// Public — used by the /catalog page on every load
router.get('/', ctrl.getSettings);

// Admin — full settings for the admin form
router.get('/admin', authenticate, authorize(['admin']), ctrl.getAdminSettings);

// Admin — save settings
router.put('/', authenticate, authorize(['admin']), ctrl.updateSettings);

module.exports = router;
