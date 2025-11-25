const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth');

// Optional authentication - works for both guests and authenticated users
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

  if (token) {
    try {
      const { verifyAccessToken } = require('../utils/jwt');
      const decoded = verifyAccessToken(token);
      req.user = { _id: decoded.userId, role: decoded.role };
    } catch (err) {
      // Token invalid, treat as guest
    }
  }
  next();
};

// All cart routes support both guest and authenticated users
router.get('/', optionalAuth, cartController.getCart);
router.post('/add', optionalAuth, cartController.addItem);
router.put('/items/:itemId', optionalAuth, cartController.updateItem);
router.delete('/items/:itemId', optionalAuth, cartController.removeItem);
router.delete('/', optionalAuth, cartController.clearCart);
router.post('/coupon', optionalAuth, cartController.applyCoupon);
router.delete('/coupon', optionalAuth, cartController.removeCoupon);

module.exports = router;
