// FILE: apps/api/src/ssr/renderVendorPage.js
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const seoService = require('../services/seoService');
const HtmlShell = require('./HtmlShell');

const renderVendorPage = async (req, res) => {
  try {
    const { slug } = req.params;

    const vendor = await Vendor.findOne({ slug, status: 'active' })
      .populate('userId', 'name')
      .lean();

    if (!vendor) {
      return res.status(404).send('Vendor not found');
    }

    // Get vendor's products
    const products = await Product.find({
      vendorId: vendor._id,
      published: true,
    })
      .limit(12)
      .sort({ createdAt: -1 })
      .lean();

    // Generate JSON-LD
    const jsonLD = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: vendor.storeName,
      description: vendor.description,
      url: `${process.env.CLIENT_URL}/vendor/${slug}`,
      aggregateRating: vendor.rating
        ? {
            '@type': 'AggregateRating',
            ratingValue: vendor.rating,
            reviewCount: vendor.reviewCount,
          }
        : undefined,
    };

    // Meta tags
    const meta = {
      title: `${vendor.storeName} - Shop`,
      description: vendor.description || `Shop from ${vendor.storeName}`,
      canonical: `${process.env.CLIENT_URL}/vendor/${slug}`,
    };

    const html = `<div id="ssr-vendor" data-vendor='${JSON.stringify(
      vendor
    )}' data-products='${JSON.stringify(products)}'></div>`;

    const fullHtml = HtmlShell({ html, meta, jsonLD });

    res.send(fullHtml);
  } catch (error) {
    console.error('SSR Error:', error);
    res.status(500).send('Server error');
  }
};

module.exports = renderVendorPage;