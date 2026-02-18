// FILE: apps/api/src/routes/appConfig.js
const express = require('express');
const router = express.Router();
const appConfigController = require('../controllers/appConfigController');
const { authenticate, authorize } = require('../middleware/auth');

// Public
router.get('/app', appConfigController.getConfig);

// Admin only
router.put('/app', authenticate, authorize(['admin']), appConfigController.updateConfig);

module.exports = router;
