const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get user statistics
router.get('/stats', userController.getStats);

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile
router.put('/profile', userController.updateProfile);

// Change password
router.put('/password', userController.changePassword);

// Get login activity
router.get('/login-activity', userController.getLoginActivity);

// API Keys management
router.get('/api-keys', userController.getAPIKeys);
router.post('/api-keys', userController.createAPIKey);
router.delete('/api-keys/:id', userController.deleteAPIKey);

// Delete account
router.delete('/account', userController.deleteAccount);

// Get user addresses
router.get('/addresses', userController.getAddresses);

// Add address
router.post('/addresses', userController.addAddress);

// Update address
router.put('/addresses/:id', userController.updateAddress);

// Delete address
router.delete('/addresses/:id', userController.deleteAddress);

// Set default address
router.put('/addresses/:id/default', userController.setDefaultAddress);

// Wishlist routes
router.get('/wishlist', userController.getWishlist);
router.post('/wishlist/toggle/:productId', userController.toggleWishlist);
router.post('/wishlist/:productId', userController.addToWishlist);
router.delete('/wishlist/:productId', userController.removeFromWishlist);

// Email preferences
router.get('/email-preferences', userController.getEmailPreferences);
router.put('/email-preferences', userController.updateEmailPreferences);

module.exports = router;