const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { optionalAuth } = require('../middleware/auth');

// All cart routes support both guest and authenticated users
router.get('/', optionalAuth, cartController.getCart);
router.post('/add', optionalAuth, cartController.addItem);
router.put('/items/:itemId', optionalAuth, cartController.updateItem);
router.delete('/items/:itemId', optionalAuth, cartController.removeItem);
router.delete('/', optionalAuth, cartController.clearCart);
router.post('/coupon', optionalAuth, cartController.applyCoupon);
router.delete('/coupon', optionalAuth, cartController.removeCoupon);

module.exports = router;
