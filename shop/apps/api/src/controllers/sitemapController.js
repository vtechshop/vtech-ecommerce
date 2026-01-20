// FILE: apps/api/src/controllers/sitemapController.js
const Product = require('../models/Product');
const Category = require('../models/Category');
const Post = require('../models/Post');
const Page = require('../models/Page');
const Vendor = require('../models/Vendor');
const env = require('../config/env');

// Use CLIENT_URL for frontend pages (consistent with seoController)
// Ensure URL always has https:// protocol (fixes Google Search Console "Invalid URL" errors)
let BASE_URL = env.CLIENT_URL || 'https://vtechkitchen.com';
if (BASE_URL && !BASE_URL.startsWith('http://') && !BASE_URL.startsWith('https://')) {
  BASE_URL = 'https://' + BASE_URL;
}
// Remove trailing slash if present
BASE_URL = BASE_URL.replace(/\/$/, '');

// Generate XML sitemap
exports.generateSitemap = async (req, res, next) => {
  try {
    const now = new Date().toISOString();

    // Fetch all published products, categories, posts, pages, and vendors
    const [products, categories, posts, pages, vendors] = await Promise.all([
      Product.find({ published: true }).select('slug updatedAt').lean(),
      Category.find({ isActive: true }).select('slug updatedAt').lean(),
      Post.find({ status: 'published' }).select('slug updatedAt').lean(),
      Page.find({ status: 'published' }).select('slug updatedAt').lean(),
      Vendor.find({ status: 'active' }).select('slug updatedAt').lean(),
    ]);

    // Build sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Homepage - highest priority
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    // Static pages - high priority (paths must match actual frontend routes)
    // NOTE: /search is the main products listing page in this app
    const staticPages = [
      { path: '/search', priority: '0.9', changefreq: 'daily' },
      { path: '/blog', priority: '0.8', changefreq: 'weekly' },
      { path: '/page/about', priority: '0.7', changefreq: 'monthly' },
      { path: '/page/contact', priority: '0.7', changefreq: 'monthly' },
      { path: '/track-order', priority: '0.6', changefreq: 'monthly' },
      { path: '/page/privacy-policy', priority: '0.5', changefreq: 'monthly' },
      { path: '/page/terms-of-service', priority: '0.5', changefreq: 'monthly' },
      { path: '/page/return-policy', priority: '0.5', changefreq: 'monthly' },
    ];

    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Categories - high priority
    categories.forEach(category => {
      const lastmod = category.updatedAt ? new Date(category.updatedAt).toISOString() : now;
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/category/${category.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });

    // Products - medium-high priority
    products.forEach(product => {
      const lastmod = product.updatedAt ? new Date(product.updatedAt).toISOString() : now;
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/product/${product.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';
    });

    // Blog posts - medium priority
    posts.forEach(post => {
      const lastmod = post.updatedAt ? new Date(post.updatedAt).toISOString() : now;
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/blog/${post.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    });

    // Custom pages - medium priority
    pages.forEach(page => {
      const lastmod = page.updatedAt ? new Date(page.updatedAt).toISOString() : now;
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/${page.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    });

    // Vendors - medium priority
    vendors.forEach(vendor => {
      const lastmod = vendor.updatedAt ? new Date(vendor.updatedAt).toISOString() : now;
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/vendor/${vendor.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    // Set proper headers for XML
    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);
  } catch (error) {
    next(error);
  }
};

// Generate robots.txt (fallback if static file not found)
exports.generateRobotsTxt = async (req, res, next) => {
  try {
    const robotsTxt = `# VTech Kitchen - Robots.txt
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
Sitemap: ${BASE_URL}/sitemap.xml
`;

    res.header('Content-Type', 'text/plain');
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(robotsTxt);
  } catch (error) {
    next(error);
  }
};
