// FILE: apps/api/src/ssr/renderHomePage.js
const Product = require('../models/Product');
const Category = require('../models/Category');
const seoService = require('../services/seoService');
const HtmlShell = require('./HtmlShell');

const renderHomePage = async (req, res) => {
  try {
    const [featuredProducts, categories] = await Promise.all([
      Product.find({ published: true, featured: true }).limit(8).lean(),
      Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
    ]);

    // Generate JSON-LD
    const jsonLD = seoService.generateWebSiteJsonLD();

    // Meta tags
    const meta = {
      title: 'Shop - Multi-Vendor Marketplace',
      description: 'Discover amazing products from trusted vendors',
      canonical: process.env.CLIENT_URL,
    };

    const html = `<div id="ssr-home" data-featured='${JSON.stringify(featuredProducts)}' data-categories='${JSON.stringify(categories)}'></div>`;

    const fullHtml = HtmlShell({ html, meta, jsonLD });

    res.send(fullHtml);
  } catch (error) {
    console.error('SSR Error:', error);
    res.status(500).send('Server error');
  }
};

module.exports = renderHomePage;