// FILE: apps/api/src/routes/index.js
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const catalogRoutes = require('./catalog');
const cartRoutes = require('./cart');
const checkoutRoutes = require('./checkout');
const orderRoutes = require('./orders');
const shippingRoutes = require('./shipping');
const vendorRoutes = require('./vendors');
const affiliateRoutes = require('./affiliates');
const adRoutes = require('./ads');
const cmsRoutes = require('./cms');
const adminRoutes = require('./admin');
const seoRoutes = require('./seo');
const contactRoutes = require('./contact');
const paymentRoutes = require('./payment');
const productRoutes = require('./products');
const userRoutes = require('./user');
const communicationRoutes = require('./communication');
const uploadRoutes = require('./upload');
const flashSaleRoutes = require('./flashSales');
const recommendationRoutes = require('./recommendations');
const referralRoutes = require('./referrals');
const ticketRoutes = require('./tickets');
const warrantyRoutes = require('./warranties');
const notificationRoutes = require('./notifications');
const blogRoutes = require('./blog');
const loyaltyRoutes = require('./loyalty');
const newsletterRoutes = require('./newsletter');
const gdprRoutes = require('./gdpr');

// Mount routes
router.use('/auth', authRoutes);
router.use('/catalog', catalogRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/orders', orderRoutes);
router.use('/shipping', shippingRoutes);
router.use('/vendors', vendorRoutes);
router.use('/affiliates', affiliateRoutes);
router.use('/ads', adRoutes);
router.use('/cms', cmsRoutes);
router.use('/admin', adminRoutes);
router.use('/seo', seoRoutes);
router.use('/contact', contactRoutes);
router.use('/payment', paymentRoutes);
router.use('/products', productRoutes);
router.use('/user', userRoutes);
router.use('/communication', communicationRoutes);
router.use('/upload', uploadRoutes);
router.use('/flash-sales', flashSaleRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/referrals', referralRoutes);
router.use('/tickets', ticketRoutes);
router.use('/warranties', warrantyRoutes);
router.use('/notifications', notificationRoutes);
router.use('/blog', blogRoutes);
router.use('/loyalty', loyaltyRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/gdpr', gdprRoutes);

// Chatbot routes - with optional authentication for personalized responses
const { optionalAuth } = require('../middleware/auth');
router.post('/chatbot/message', optionalAuth, require('../controllers/chatbotController').handleMessage);

// Public settings endpoint (for ad placements, etc.)
router.get('/settings/public', require('../controllers/adPlacementController').getPublicSettings);

// Health check endpoint - keeps server awake and checks DB connection
router.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;