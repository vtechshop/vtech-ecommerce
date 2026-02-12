// FILE: apps/api/src/controllers/sitemapController.js

const Product = require('../models/Product');
const Category = require('../models/Category');
const Post = require('../models/Post');
const Page = require('../models/Page');
const Vendor = require('../models/Vendor');
const env = require('../config/env');

// Always return https://www.vtechkitchen.com
function getBaseUrl() {
  let url = env.CLIENT_URL || 'https://www.vtechkitchen.com';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  url = url.replace('https://vtechkitchen.com', 'https://www.vtechkitchen.com');
  return url.replace(/\/$/, '');
}

const BASE_URL = getBaseUrl();

// Escape XML
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ======================
// MAIN SITEMAP GENERATOR
// ======================
exports.generateSitemap = async (req, res, next) => {
  try {
    const now = new Date().toISOString();

    const [products, categories, posts, pages, vendors] = await Promise.all([
      Product.find({ published: true }).select('slug updatedAt title images').lean(),
      Category.find({ isActive: true }).select('slug updatedAt name image').lean(),
      Post.find({ published: true }).select('slug updatedAt title featuredImage').lean(),
      Page.find({ status: 'published' }).select('slug updatedAt').lean(),
      Vendor.find({ status: 'active' }).select('slug updatedAt storeName logo').lean(),
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    // ===== HOME =====
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    // ===== STATIC PAGES (NO /search) =====
    const staticPages = [
      { path: '/products', priority: '0.9', changefreq: 'daily' },
      { path: '/blog', priority: '0.8', changefreq: 'weekly' },
      { path: '/page/about', priority: '0.7', changefreq: 'monthly' },
      { path: '/page/contact', priority: '0.7', changefreq: 'monthly' },
      { path: '/track-order', priority: '0.6', changefreq: 'monthly' },
      { path: '/warranty-check', priority: '0.6', changefreq: 'monthly' },
      { path: '/page/privacy', priority: '0.5', changefreq: 'monthly' },
      { path: '/page/terms', priority: '0.5', changefreq: 'monthly' },
      { path: '/page/returns', priority: '0.5', changefreq: 'monthly' },
      { path: '/page/shipping', priority: '0.5', changefreq: 'monthly' },
      { path: '/page/faq', priority: '0.5', changefreq: 'monthly' },
    ];

    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // ===== CATEGORIES =====
    categories.forEach(category => {
      const lastmod = category.updatedAt ? new Date(category.updatedAt).toISOString() : now;
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/category/${category.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      if (category.image) {
        xml += '    <image:image>\n';
        xml += `      <image:loc>${escapeXml(category.image)}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(category.name)}</image:title>\n`;
        xml += '    </image:image>\n';
      }
      xml += '  </url>\n';
    });

    // ===== PRODUCTS =====
    products.forEach(product => {
      if (!product.slug) return;

      const lastmod = product.updatedAt ? new Date(product.updatedAt).toISOString() : now;
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/product/${product.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.9</priority>\n';

      if (product.images && product.images.length > 0) {
        product.images.slice(0, 5).forEach((img, idx) => {
          if (!img) return;
          xml += '    <image:image>\n';
          xml += `      <image:loc>${escapeXml(img)}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(product.title || 'Product')} ${idx + 1}</image:title>\n`;
          xml += '    </image:image>\n';
        });
      }

      xml += '  </url>\n';
    });

    // ===== BLOG POSTS =====
    posts.forEach(post => {
      const lastmod = post.updatedAt ? new Date(post.updatedAt).toISOString() : now;
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/blog/${post.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      if (post.featuredImage) {
        xml += '    <image:image>\n';
        xml += `      <image:loc>${escapeXml(post.featuredImage)}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(post.title)}</image:title>\n`;
        xml += '    </image:image>\n';
      }
      xml += '  </url>\n';
    });

    // ===== CUSTOM PAGES =====
    pages.forEach(page => {
      const lastmod = page.updatedAt ? new Date(page.updatedAt).toISOString() : now;
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/page/${page.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.5</priority>\n';
      xml += '  </url>\n';
    });

    // ===== VENDORS =====
    vendors.forEach(vendor => {
      const lastmod = vendor.updatedAt ? new Date(vendor.updatedAt).toISOString() : now;
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/vendor/${vendor.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      if (vendor.logo) {
        xml += '    <image:image>\n';
        xml += `      <image:loc>${escapeXml(vendor.logo)}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(vendor.storeName)} Store</image:title>\n`;
        xml += '    </image:image>\n';
      }
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    console.error('SITEMAP ERROR:', error);
    next(error);
  }
};

// ======================
// ROBOTS.TXT GENERATOR
// ======================
exports.generateRobotsTxt = async (req, res, next) => {
  try {
    const robotsTxt = `# VTech Kitchen Robots.txt

User-agent: *
Allow: /

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

Allow: /products
Allow: /product/
Allow: /category/
Allow: /blog/
Allow: /vendor/
Allow: /page/

Disallow: /*?ref=

Crawl-delay: 1

Sitemap: ${BASE_URL}/sitemap.xml
`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(robotsTxt);
  } catch (error) {
    next(error);
  }
};
