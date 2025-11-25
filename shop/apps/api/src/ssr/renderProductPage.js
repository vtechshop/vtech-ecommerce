// FILE: apps/api/src/ssr/renderProductPage.js
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const seoService = require('../services/seoService');
const HtmlShell = require('./HtmlShell');

const renderProductPage = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({ slug, published: true })
      .populate('vendorId')
      .lean();

    if (!product) {
      return res.status(404).send('Product not found');
    }

    // Generate JSON-LD
    const jsonLD = seoService.generateProductJsonLD(product, product.vendorId);

    // Meta tags
    const meta = {
      title: `${product.title} - Shop`,
      description: product.description?.substring(0, 160),
      ogImage: product.images?.[0],
      canonical: `${process.env.CLIENT_URL}/product/${slug}`,
    };

    // In a full SSR implementation, you'd render the actual React component
    // For now, return HTML shell with meta tags and JSON-LD
    const html = `<div id="ssr-product" data-product='${JSON.stringify(product)}'></div>`;

    const fullHtml = HtmlShell({ html, meta, jsonLD });

    res.send(fullHtml);
  } catch (error) {
    console.error('SSR Error:', error);
    res.status(500).send('Server error');
  }
};

module.exports = renderProductPage;