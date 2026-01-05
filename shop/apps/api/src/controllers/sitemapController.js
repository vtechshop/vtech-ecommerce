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

# Explicitly allow static assets (CSS, JS, images)
Allow: /assets/
Allow: /static/
Allow: /src/
Allow: /*.css$
Allow: /*.js$
Allow: /*.jpg$
Allow: /*.jpeg$
Allow: /*.png$
Allow: /*.gif$
Allow: /*.svg$
Allow: /*.webp$
Allow: /*.avif$

# Disallow admin and private areas only
Disallow: /dashboard/
Disallow: /admin/
Disallow: /checkout/
Disallow: /account/

# Allow all public pages
Allow: /products/
Allow: /product/
Allow: /categories/
Allow: /category/
Allow: /vendor/
Allow: /vendors/
Allow: /blog/
Allow: /about
Allow: /contact
Allow: /search

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
