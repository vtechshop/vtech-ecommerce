// FILE: apps/api/src/controllers/seoController.js
const Product = require('../models/Product');
const Category = require('../models/Category');
const Post = require('../models/Post');
const Vendor = require('../models/Vendor');
const env = require('../config/env');

// Helper to ensure URL has proper protocol
function ensureProtocol(url, defaultUrl) {
  let result = url || defaultUrl;
  if (result && !result.startsWith('http://') && !result.startsWith('https://')) {
    result = 'https://' + result;
  }
  return result.replace(/\/$/, ''); // Remove trailing slash
}

// Get sitemap index
exports.getSitemap = async (req, res, next) => {
  try {
    const apiUrl = ensureProtocol(env.APP_URL, 'https://api.vtechkitchen.com');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${apiUrl}/api/seo/sitemap-products.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${apiUrl}/api/seo/sitemap-categories.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${apiUrl}/api/seo/sitemap-blog.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${apiUrl}/api/seo/sitemap-vendors.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    next(error);
  }
};

// Get product sitemap
exports.getProductSitemap = async (req, res, next) => {
  try {
    const products = await Product.find({ published: true })
      .select('slug updatedAt')
      .limit(50000)
      .lean();

    const baseUrl = ensureProtocol(env.CLIENT_URL, 'https://vtechkitchen.com');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    products.forEach(product => {
      xml += `
  <url>
    <loc>${baseUrl}/product/${product.slug}</loc>
    <lastmod>${product.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    xml += '\n</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    next(error);
  }
};

// Get category sitemap
exports.getCategorySitemap = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('slug updatedAt')
      .lean();

    const baseUrl = ensureProtocol(env.CLIENT_URL, 'https://vtechkitchen.com');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    categories.forEach(category => {
      xml += `
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <lastmod>${category.updatedAt.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    xml += '\n</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    next(error);
  }
};

// Get blog sitemap
exports.getBlogSitemap = async (req, res, next) => {
  try {
    const posts = await Post.find({ published: true })
      .select('slug updatedAt')
      .lean();

    const baseUrl = ensureProtocol(env.CLIENT_URL, 'https://vtechkitchen.com');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    posts.forEach(post => {
      xml += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    xml += '\n</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    next(error);
  }
};

// Get vendor sitemap
exports.getVendorSitemap = async (req, res, next) => {
  try {
    const vendors = await Vendor.find({ status: 'active' })
      .select('slug updatedAt')
      .lean();

    const baseUrl = ensureProtocol(env.CLIENT_URL, 'https://vtechkitchen.com');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    vendors.forEach(vendor => {
      xml += `
  <url>
    <loc>${baseUrl}/vendor/${vendor.slug}</loc>
    <lastmod>${vendor.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    xml += '\n</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    next(error);
  }
};

// Get robots.txt
exports.getRobotsTxt = async (req, res, next) => {
  try {
    const clientUrl = ensureProtocol(env.CLIENT_URL, 'https://vtechkitchen.com');

    const txt = `# VTech Kitchen - Robots.txt
# https://vtechkitchen.com

User-agent: *
Allow: /

# Disallow private/user areas
Disallow: /dashboard/
Disallow: /admin/
Disallow: /checkout/
Disallow: /account/
Disallow: /cart
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /api/

# Disallow query parameter variations (pagination, filters)
Disallow: /*?page=
Disallow: /*?sort=
Disallow: /*?filter=
Disallow: /*?ref=

# Crawl-delay for polite crawling (optional)
Crawl-delay: 1

# Sitemap location
Sitemap: ${clientUrl}/sitemap.xml`;

    res.header('Content-Type', 'text/plain');
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(txt);
  } catch (error) {
    next(error);
  }
};

// Get product feed (Google Merchant Center format)
exports.getProductFeed = async (req, res, next) => {
  try {
    const products = await Product.find({ published: true })
      .populate('vendorId', 'storeName')
      .limit(10000)
      .lean();

    const baseUrl = ensureProtocol(env.CLIENT_URL, 'https://vtechkitchen.com');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Shop Product Feed</title>
    <link>${baseUrl}</link>
    <description>Product feed for Shop</description>`;

    products.forEach(product => {
      xml += `
    <item>
      <g:id>${product._id}</g:id>
      <g:title>${product.title}</g:title>
      <g:description>${product.description?.substring(0, 500)}</g:description>
      <g:link>${baseUrl}/product/${product.slug}</g:link>
      <g:image_link>${product.images?.[0] || ''}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${product.price} USD</g:price>
      <g:brand>${product.brand || product.vendorId?.storeName || 'Shop'}</g:brand>
    </item>`;
    });

    xml += `
  </channel>
</rss>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    next(error);
  }
};