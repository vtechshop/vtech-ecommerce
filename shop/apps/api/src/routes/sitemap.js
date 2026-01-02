// FILE: apps/api/src/routes/sitemap.js
const express = require('express');
const router = express.Router();
const sitemapController = require('../controllers/sitemapController');

// Generate sitemap.xml
router.get('/sitemap.xml', sitemapController.generateSitemap);

// Generate robots.txt (fallback)
router.get('/robots.txt', sitemapController.generateRobotsTxt);

module.exports = router;
