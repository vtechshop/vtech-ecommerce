// FILE: apps/api/src/routes/coupons.js
const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { authenticate, authorize } = require('../middleware/auth');

// Public
router.get('/', couponController.getActiveCoupons);

// Auth required
router.get('/validate', authenticate, couponController.validateCoupon);

// Admin only
router.get('/all', authenticate, authorize(['admin']), couponController.getAllCoupons);
router.post('/', authenticate, authorize(['admin']), couponController.createCoupon);
router.put('/:id', authenticate, authorize(['admin']), couponController.updateCoupon);
router.delete('/:id', authenticate, authorize(['admin']), couponController.deleteCoupon);

module.exports = router;
