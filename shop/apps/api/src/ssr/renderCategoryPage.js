// FILE: apps/api/src/ssr/renderCategoryPage.js
const Category = require('../models/Category');
const Product = require('../models/Product');
const seoService = require('../services/seoService');
const HtmlShell = require('./HtmlShell');

const renderCategoryPage = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug, isActive: true }).lean();

    if (!category) {
      return res.status(404).send('Category not found');
    }

    const products = await Product.find({
      categoryIds: category._id,
      published: true,
    })
      .limit(12)
      .lean();

    // Generate JSON-LD
    const jsonLD = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: category.name,
      description: category.description,
      numberOfItems: products.length,
    };

    // Meta tags
    const meta = {
      title: `${category.name} - Shop`,
      description: category.description || `Browse ${category.name} products`,
      canonical: `${process.env.CLIENT_URL}/category/${slug}`,
    };

    const html = `<div id="ssr-category" data-category='${JSON.stringify(category)}' data-products='${JSON.stringify(products)}'></div>`;

    const fullHtml = HtmlShell({ html, meta, jsonLD });

    res.send(fullHtml);
  } catch (error) {
    console.error('SSR Error:', error);
    res.status(500).send('Server error');
  }
};

module.exports = renderCategoryPage;