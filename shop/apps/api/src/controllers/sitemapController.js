// FILE: apps/api/src/controllers/sitemapController.js
const Product = require('../models/Product');
const Category = require('../models/Category');
const Post = require('../models/Post');
const Page = require('../models/Page');

const BASE_URL = process.env.FRONTEND_URL || 'https://vtechkitchen.com';

// Generate XML sitemap
exports.generateSitemap = async (req, res, next) => {
  try {
    const now = new Date().toISOString();

    // Fetch all published products, categories, posts, and pages
    const [products, categories, posts, pages] = await Promise.all([
      Product.find({ published: true }).select('slug updatedAt').lean(),
      Category.find().select('slug updatedAt').lean(),
      Post.find({ status: 'published' }).select('slug updatedAt').lean(),
      Page.find({ status: 'published' }).select('slug updatedAt').lean(),
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

    // Static pages - high priority
    const staticPages = [
      { path: '/products', priority: '0.9', changefreq: 'daily' },
      { path: '/categories', priority: '0.9', changefreq: 'daily' },
      { path: '/about', priority: '0.7', changefreq: 'monthly' },
      { path: '/contact', priority: '0.7', changefreq: 'monthly' },
      { path: '/blog', priority: '0.8', changefreq: 'weekly' },
      { path: '/track-order', priority: '0.6', changefreq: 'monthly' },
      { path: '/privacy-policy', priority: '0.5', changefreq: 'monthly' },
      { path: '/terms-of-service', priority: '0.5', changefreq: 'monthly' },
      { path: '/return-policy', priority: '0.5', changefreq: 'monthly' },
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
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/category/${category.slug}</loc>\n`;
      xml += `    <lastmod>${category.updatedAt || now}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });

    // Products - medium-high priority
    products.forEach(product => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/product/${product.slug}</loc>\n`;
      xml += `    <lastmod>${product.updatedAt || now}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';
    });

    // Blog posts - medium priority
    posts.forEach(post => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/blog/${post.slug}</loc>\n`;
      xml += `    <lastmod>${post.updatedAt || now}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    });

    // Custom pages - medium priority
    pages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/${page.slug}</loc>\n`;
      xml += `    <lastmod>${page.updatedAt || now}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
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
    const robotsTxt = `# Allow all search engines to crawl the site
User-agent: *
Allow: /

# Disallow admin and private areas
Disallow: /dashboard/
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/

# Allow specific public pages
Allow: /products/
Allow: /categories/
Allow: /blog/
Allow: /about
Allow: /contact

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
