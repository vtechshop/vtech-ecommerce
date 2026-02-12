// FILE: apps/api/src/routes/sitemap.js
const express = require('express');
const router = express.Router();
const sitemapController = require('../controllers/sitemapController');

// Generate sitemap.xml
router.get('/sitemap.xml', sitemapController.generateSitemap);

// Generate robots.txt (fallback)
router.get('/robots.txt', sitemapController.generateRobotsTxt);

// IndexNow key verification
router.get('/b4d7f2e8a1c94d5b8e3f6a7c0d2e1b9a.txt', sitemapController.getIndexNowKey);

module.exports = router;
