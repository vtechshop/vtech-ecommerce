const express = require('express');
const router = express.Router();
const seoController = require('../controllers/seoController');

// Sitemaps
router.get('/sitemap.xml', seoController.getSitemap);
router.get('/sitemap-products.xml', seoController.getProductSitemap);
router.get('/sitemap-categories.xml', seoController.getCategorySitemap);
router.get('/sitemap-blog.xml', seoController.getBlogSitemap);
router.get('/sitemap-vendors.xml', seoController.getVendorSitemap);
router.get('/sitemap-pages.xml', seoController.getPagesSitemap);

// Robots.txt
router.get('/robots.txt', seoController.getRobotsTxt);

// Product feed
router.get('/feed/products.xml', seoController.getProductFeed);

// Dynamic rendering for SEO (serves pre-rendered HTML to crawlers)
router.get('/render', seoController.renderPage);

module.exports = router;