const express = require('express');
const router = express.Router();
const seoController = require('../controllers/seoController');

// Sitemaps
router.get('/sitemap.xml', seoController.getSitemap);
router.get('/sitemap-products.xml', seoController.getProductSitemap);
router.get('/sitemap-categories.xml', seoController.getCategorySitemap);
router.get('/sitemap-blog.xml', seoController.getBlogSitemap);
router.get('/sitemap-vendors.xml', seoController.getVendorSitemap);

// Robots.txt
router.get('/robots.txt', seoController.getRobotsTxt);

// Product feed
router.get('/feed/products.xml', seoController.getProductFeed);

module.exports = router;