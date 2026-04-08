// FILE: apps/api/src/routes/banners.js
const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { authenticate, authorize } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Public
router.get('/', cacheMiddleware(300), bannerController.getActiveBanners);

// Admin only
router.get('/all', authenticate, authorize(['admin']), bannerController.getAllBanners);
router.post('/fix-platform', authenticate, authorize(['admin']), bannerController.fixBannerPlatforms);
router.post('/', authenticate, authorize(['admin']), upload.single('image'), bannerController.createBanner);
router.put('/:id', authenticate, authorize(['admin']), upload.single('image'), bannerController.updateBanner);
router.delete('/:id', authenticate, authorize(['admin']), bannerController.deleteBanner);

module.exports = router;
