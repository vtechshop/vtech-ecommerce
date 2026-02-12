// FILE: apps/api/src/controllers/seoController.js
const Product = require('../models/Product');
const Category = require('../models/Category');
const Post = require('../models/Post');
const Vendor = require('../models/Vendor');
const env = require('../config/env');

// Escape special XML characters to prevent parsing errors
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Strip HTML tags and decode entities for plain text output
function stripHtml(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper to ensure URL has proper protocol and www prefix
function ensureProtocol(url, defaultUrl) {
  let result = url || defaultUrl;
  if (result && !result.startsWith('http://') && !result.startsWith('https://')) {
    result = 'https://' + result;
  }
  // Ensure www prefix for vtechkitchen.com (handle both exact and subdomain-less forms)
  result = result.replace(/https?:\/\/(?:www\.)?vtechkitchen\.com/i, 'https://www.vtechkitchen.com');
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
  <sitemap>
    <loc>${apiUrl}/api/seo/sitemap-pages.xml</loc>
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

    const baseUrl = ensureProtocol(env.CLIENT_URL, 'https://www.vtechkitchen.com');

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

    const baseUrl = ensureProtocol(env.CLIENT_URL, 'https://www.vtechkitchen.com');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add the main products listing page
    xml += `
  <url>
    <loc>${baseUrl}/products</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

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

    const baseUrl = ensureProtocol(env.CLIENT_URL, 'https://www.vtechkitchen.com');

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

    const baseUrl = ensureProtocol(env.CLIENT_URL, 'https://www.vtechkitchen.com');

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

// Get pages sitemap (homepage, static/info pages, utility pages)
exports.getPagesSitemap = async (req, res, next) => {
  try {
    const baseUrl = ensureProtocol(env.CLIENT_URL, 'https://www.vtechkitchen.com');
    const now = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/track-order</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/warranty-check</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

    const staticPages = ['about', 'contact', 'privacy', 'terms', 'returns', 'shipping', 'faq'];
    staticPages.forEach(page => {
      xml += `
  <url>
    <loc>${baseUrl}/page/${page}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
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
    const clientUrl = ensureProtocol(env.CLIENT_URL, 'https://www.vtechkitchen.com');

    const txt = `# VTech Kitchen - Robots.txt
# https://www.vtechkitchen.com

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

# Allow important pages
Allow: /products
Allow: /product/
Allow: /category/
Allow: /blog/
Allow: /vendor/
Allow: /page/

# Disallow query parameter variations (prevent duplicate content)
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

// Dynamic HTML rendering for SEO (serves to crawlers)
exports.renderPage = async (req, res, next) => {
  try {
    const { path } = req.query;
    if (!path) {
      return res.status(400).json({ error: 'Path parameter required' });
    }

    const clientUrl = ensureProtocol(env.CLIENT_URL, 'https://www.vtechkitchen.com');
    // Normalize: strip trailing slash so canonical matches internal links
    // e.g., path "/" → fullUrl "https://www.vtechkitchen.com" (not ".../")
    const fullUrl = `${clientUrl}${path}`.replace(/\/$/, '') || clientUrl;

    // Fetch categories and blog posts for site-wide navigation (resolves orphan pages)
    const [navCategories, navPosts, navVendors] = await Promise.all([
      Category.find({ isActive: true }).select('name slug').lean().catch(() => []),
      Post.find({ published: true }).select('title slug').limit(10).lean().catch(() => []),
      Vendor.find({ status: 'active' }).select('storeName slug').lean().catch(() => []),
    ]);

    // Parse the path to determine page type
    const pathParts = path.split('/').filter(Boolean);
    let pageData = {
      title: 'V-Tech Kitchen - Premium Kitchen Appliances & Utensils',
      description: 'Shop premium kitchen appliances and utensils at V-Tech Kitchen. Quality cookware, gadgets, and tools for your kitchen.',
      image: `${clientUrl}/og-image.jpg`,
      type: 'website',
      content: '',
      schema: null,
    };

    // Homepage
    if (pathParts.length === 0 || path === '/') {
      const featuredProducts = await Product.find({ published: true })
        .select('title slug price')
        .sort({ createdAt: -1 })
        .limit(12)
        .lean();

      pageData.content = `
        <h1>V-Tech Kitchen - Premium Kitchen Appliances & Utensils</h1>
        <p>Discover the finest collection of kitchen appliances, cookware, and utensils. Premium quality products from trusted brands.</p>
        ${navCategories.length ? `<h2>Shop by Category</h2><ul>${navCategories.map(c => `<li><a href="${clientUrl}/category/${c.slug}">${c.name}</a></li>`).join('')}</ul>` : ''}
        ${featuredProducts.length ? `<h2>Featured Products</h2><ul>${featuredProducts.map(p => `<li><a href="${clientUrl}/product/${p.slug}">${p.title} - ₹${p.price?.toLocaleString('en-IN')}</a></li>`).join('')}</ul>` : ''}
      `;
    }

    // Product page
    else if (pathParts[0] === 'product' && pathParts[1]) {
      const product = await Product.findOne({ slug: pathParts[1], published: true })
        .populate('vendorId', 'storeName')
        .populate('categoryIds', 'name')
        .lean();

      if (product) {
        pageData.title = `${product.title} - V-Tech Kitchen`;
        pageData.description = (product.description?.substring(0, 155) || `Buy ${product.title} at best price. ${product.shortDescription || ''}`).substring(0, 155);
        pageData.image = product.images?.[0] || pageData.image;
        pageData.type = 'product';
        pageData.content = `
          <h1>${product.title}</h1>
          <p><strong>Price:</strong> ₹${product.price?.toLocaleString('en-IN')}</p>
          <p><strong>Category:</strong> ${product.categoryIds?.[0]?.name || 'Kitchen Products'}</p>
          <p><strong>Availability:</strong> ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</p>
          <p>${product.description || ''}</p>
          ${product.features?.length ? `<h2>Features</h2><ul>${product.features.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
        `;
        pageData.schema = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          description: (product.description || product.shortDescription || `${product.title} - Premium kitchen product`).substring(0, 500),
          image: product.images?.length ? product.images : undefined,
          sku: product.sku || product._id.toString(),
          brand: { '@type': 'Brand', name: product.brand || product.vendorId?.storeName || 'V-Tech Kitchen' },
          offers: {
            '@type': 'Offer',
            price: product.price || 0,
            priceCurrency: 'INR',
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: fullUrl,
            seller: {
              '@type': 'Organization',
              name: product.vendorId?.storeName || 'V-Tech Kitchen',
            },
          },
        };
      }
    }

    // Category page
    else if (pathParts[0] === 'category' && pathParts[1]) {
      const category = await Category.findOne({ slug: pathParts[1], isActive: true }).lean();
      const products = await Product.find({ categoryIds: category?._id, published: true })
        .select('title slug price images')
        .limit(20)
        .lean();

      if (category) {
        pageData.title = `${category.name} - V-Tech Kitchen`;
        pageData.description = category.description || `Shop ${category.name} at V-Tech Kitchen. Best prices, fast delivery.`;
        pageData.image = category.image || pageData.image;
        pageData.content = `
          <h1>${category.name}</h1>
          <p>${category.description || `Explore our collection of ${category.name}.`}</p>
          <h2>Products in ${category.name}</h2>
          <ul>
            ${products.map(p => `<li><a href="${clientUrl}/product/${p.slug}">${p.title} - ₹${p.price?.toLocaleString('en-IN')}</a></li>`).join('')}
          </ul>
        `;
      }
    }

    // Vendor page
    else if (pathParts[0] === 'vendor' && pathParts[1]) {
      const vendor = await Vendor.findOne({ slug: pathParts[1], status: 'active' }).lean();
      const products = await Product.find({ vendorId: vendor?._id, published: true })
        .select('title slug price')
        .limit(20)
        .lean();

      if (vendor) {
        pageData.title = `${vendor.storeName} - V-Tech Kitchen Vendor`;
        pageData.description = vendor.description || `Shop products from ${vendor.storeName} at V-Tech Kitchen.`;
        pageData.image = vendor.logo || pageData.image;
        pageData.content = `
          <h1>${vendor.storeName}</h1>
          <p>${vendor.description || `Welcome to ${vendor.storeName}'s store on V-Tech Kitchen.`}</p>
          <h2>Products from ${vendor.storeName}</h2>
          <ul>
            ${products.map(p => `<li><a href="${clientUrl}/product/${p.slug}">${p.title} - ₹${p.price?.toLocaleString('en-IN')}</a></li>`).join('')}
          </ul>
        `;
      }
    }

    // Blog post page
    else if (pathParts[0] === 'blog' && pathParts[1]) {
      const post = await Post.findOne({ slug: pathParts[1], published: true })
        .populate('author', 'name')
        .lean();

      if (post) {
        pageData.title = `${post.title} - V-Tech Kitchen Blog`;
        pageData.description = (post.excerpt || post.content?.substring(0, 155) || `Read ${post.title} on V-Tech Kitchen Blog.`).substring(0, 155);
        pageData.image = post.featuredImage || pageData.image;
        pageData.type = 'article';
        pageData.content = `
          <h1>${post.title}</h1>
          <p><strong>By:</strong> ${post.author?.name || 'V-Tech Kitchen'}</p>
          <p><strong>Published:</strong> ${new Date(post.createdAt).toLocaleDateString()}</p>
          ${post.excerpt ? `<p>${post.excerpt}</p>` : ''}
          <div>${post.content || ''}</div>
        `;
        pageData.schema = {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: pageData.description,
          image: post.featuredImage,
          author: { '@type': 'Person', name: post.author?.name || 'V-Tech Kitchen' },
          datePublished: post.createdAt,
          dateModified: post.updatedAt,
          url: fullUrl,
        };
      }
    }

    // Products/Search page
    else if (pathParts[0] === 'products' || pathParts[0] === 'search') {
      const recentProducts = await Product.find({ published: true })
        .select('title slug price')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      pageData.title = 'All Products - V-Tech Kitchen';
      pageData.description = 'Browse all premium kitchen appliances, cookware, and utensils at V-Tech Kitchen. Best prices, fast delivery.';
      pageData.content = `
        <h1>All Products - V-Tech Kitchen</h1>
        <p>Browse our complete collection of premium kitchen appliances and utensils.</p>
        ${recentProducts.length ? `<h2>Our Products</h2><ul>${recentProducts.map(p => `<li><a href="${clientUrl}/product/${p.slug}">${p.title} - ₹${p.price?.toLocaleString('en-IN')}</a></li>`).join('')}</ul>` : ''}
      `;
    }

    // Blog listing page
    else if (pathParts[0] === 'blog' && !pathParts[1]) {
      pageData.title = 'Blog - V-Tech Kitchen';
      pageData.description = 'Read tips, guides, and news about kitchen appliances and cooking on the V-Tech Kitchen blog.';
      pageData.content = `
        <h1>Blog - V-Tech Kitchen</h1>
        <p>Tips, guides, and news about kitchen appliances and cooking.</p>
        ${navPosts.length ? `<ul>${navPosts.map(p => `<li><a href="${clientUrl}/blog/${p.slug}">${p.title}</a></li>`).join('')}</ul>` : ''}
      `;
    }

    // Track order page
    else if (pathParts[0] === 'track-order') {
      pageData.title = 'Track Your Order - V-Tech Kitchen';
      pageData.description = 'Track your V-Tech Kitchen order status with your order ID.';
      pageData.content = `<h1>Track Your Order - V-Tech Kitchen</h1><p>Enter your order ID to track your delivery status.</p>`;
    }

    // Warranty check page
    else if (pathParts[0] === 'warranty-check') {
      pageData.title = 'Warranty Check - V-Tech Kitchen';
      pageData.description = 'Check warranty status of your V-Tech Kitchen products using your order ID or serial number.';
      pageData.content = `<h1>Warranty Check - V-Tech Kitchen</h1><p>Verify the warranty status of your purchased products.</p>`;
    }

    // Cookie policy page (not under /page/)
    else if (pathParts[0] === 'cookie-policy') {
      pageData.title = 'Cookie Policy - V-Tech Kitchen';
      pageData.description = 'Learn about how V-Tech Kitchen uses cookies and similar technologies.';
      pageData.content = `<h1>Cookie Policy - V-Tech Kitchen</h1><p>Information about cookies and tracking technologies used on our site.</p>`;
    }

    // Static pages
    else if (pathParts[0] === 'page') {
      const pageName = pathParts[1];
      const pageContent = {
        'privacy': { title: 'Privacy Policy', desc: 'Learn how V-Tech Kitchen protects your privacy and handles your data.' },
        'terms': { title: 'Terms of Service', desc: 'Read the terms and conditions for using V-Tech Kitchen.' },
        'returns': { title: 'Return & Refund Policy', desc: 'Learn about our return and refund policies at V-Tech Kitchen.' },
        'shipping': { title: 'Shipping Information', desc: 'Delivery options, shipping times, and costs for V-Tech Kitchen orders.' },
        'faq': { title: 'Frequently Asked Questions', desc: 'Find answers to common questions about V-Tech Kitchen products and services.' },
        'about': { title: 'About Us', desc: 'Learn about V-Tech Kitchen - your trusted source for premium kitchen products.' },
        'contact': { title: 'Contact Us', desc: 'Get in touch with V-Tech Kitchen for support or inquiries.' },
        'vendor-terms': { title: 'Vendor Terms', desc: 'Terms and conditions for vendors selling on V-Tech Kitchen.' },
        'vendor-guide': { title: 'Vendor Guide', desc: 'Guide for vendors on how to sell on V-Tech Kitchen marketplace.' },
        'affiliate-terms': { title: 'Affiliate Terms', desc: 'Terms and conditions for the V-Tech Kitchen affiliate program.' },
        'affiliate-guide': { title: 'Affiliate Guide', desc: 'Guide to earning with the V-Tech Kitchen affiliate program.' },
      };

      if (pageContent[pageName]) {
        pageData.title = `${pageContent[pageName].title} - V-Tech Kitchen`;
        pageData.description = pageContent[pageName].desc;
        pageData.content = `<h1>${pageContent[pageName].title}</h1><p>${pageContent[pageName].desc}</p>`;
      }
    }

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageData.title}</title>
  <meta name="description" content="${pageData.description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${fullUrl}">

  <!-- Open Graph -->
  <meta property="og:type" content="${pageData.type}">
  <meta property="og:url" content="${fullUrl}">
  <meta property="og:title" content="${pageData.title}">
  <meta property="og:description" content="${pageData.description}">
  <meta property="og:image" content="${pageData.image}">
  <meta property="og:site_name" content="V-Tech Kitchen">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${pageData.title}">
  <meta name="twitter:description" content="${pageData.description}">
  <meta name="twitter:image" content="${pageData.image}">

  ${pageData.schema ? `<script type="application/ld+json">${JSON.stringify(pageData.schema)}</script>` : ''}

  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; color: #1f2937; }
    h1 { color: #1f2937; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { list-style: none; padding: 0; }
    li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    nav.site-nav { padding: 12px 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    nav.site-nav a { font-weight: 500; }
    nav.site-nav .brand { font-weight: 700; font-size: 1.2rem; margin-right: 16px; }
    footer.site-footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
    footer.site-footer h3 { font-size: 0.95rem; margin: 0 0 8px 0; color: #374151; }
    footer.site-footer .footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; }
    footer.site-footer ul { margin: 0; }
    footer.site-footer li { padding: 4px 0; border: none; font-size: 0.9rem; }
  </style>
</head>
<body>
  <header>
    <nav class="site-nav">
      <a href="${clientUrl}" class="brand">V-Tech Kitchen</a>
      <a href="${clientUrl}/products">Products</a>
      ${navCategories.map(c => `<a href="${clientUrl}/category/${c.slug}">${c.name}</a>`).join('\n      ')}
      <a href="${clientUrl}/page/contact">Contact Us</a>
      <a href="${clientUrl}/blog">Blog</a>
      <a href="${clientUrl}/page/about">About</a>
      <a href="${clientUrl}/track-order">Track Order</a>
      <a href="${clientUrl}/warranty-check">Warranty Check</a>
    </nav>
  </header>
  <main>
    ${pageData.content}
  </main>
  <footer class="site-footer">
    <div class="footer-grid">
      <div>
        <h3>Shop by Category</h3>
        <ul>
          <li><a href="${clientUrl}/products">All Products</a></li>
          ${navCategories.map(c => `<li><a href="${clientUrl}/category/${c.slug}">${c.name}</a></li>`).join('\n          ')}
        </ul>
      </div>
      ${navVendors.length ? `<div>
        <h3>Our Vendors</h3>
        <ul>
          ${navVendors.map(v => `<li><a href="${clientUrl}/vendor/${v.slug}">${v.storeName}</a></li>`).join('\n          ')}
        </ul>
      </div>` : ''}
      ${navPosts.length ? `<div>
        <h3>From Our Blog</h3>
        <ul>
          ${navPosts.map(p => `<li><a href="${clientUrl}/blog/${p.slug}">${p.title}</a></li>`).join('\n          ')}
        </ul>
      </div>` : ''}
      <div>
        <h3>Information</h3>
        <ul>
          <li><a href="${clientUrl}/page/about">About Us</a></li>
          <li><a href="${clientUrl}/page/contact">Contact Us</a></li>
          <li><a href="${clientUrl}/page/privacy">Privacy Policy</a></li>
          <li><a href="${clientUrl}/page/terms">Terms of Service</a></li>
          <li><a href="${clientUrl}/page/returns">Return Policy</a></li>
          <li><a href="${clientUrl}/page/shipping">Shipping Info</a></li>
          <li><a href="${clientUrl}/page/faq">FAQ</a></li>
          <li><a href="${clientUrl}/track-order">Track Order</a></li>
          <li><a href="${clientUrl}/warranty-check">Warranty Check</a></li>
        </ul>
      </div>
    </div>
    <p style="margin-top: 24px; font-size: 0.85rem; color: #6b7280;">&copy; ${new Date().getFullYear()} V-Tech Kitchen. All rights reserved.</p>
  </footer>
  <script>
    // Redirect real users to React app
    if (!navigator.userAgent.match(/bot|crawl|spider|slurp|googlebot|bingbot|yandex/i)) {
      window.location.href = "${fullUrl}";
    }
  </script>
</body>
</html>`;

    res.header('Content-Type', 'text/html');
    res.send(html);
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

    const baseUrl = ensureProtocol(env.CLIENT_URL, 'https://www.vtechkitchen.com');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Shop Product Feed</title>
    <link>${baseUrl}</link>
    <description>Product feed for Shop</description>`;

    products.forEach(product => {
      const title = escapeXml(product.title || '');
      const description = escapeXml(stripHtml(product.description || '').substring(0, 500));
      const brand = escapeXml(product.brand || product.vendorId?.storeName || 'Shop');
      const imageLink = escapeXml(product.images?.[0] || '');

      xml += `
    <item>
      <g:id>${product._id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${baseUrl}/product/${product.slug}</g:link>
      <g:image_link>${imageLink}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${product.price} INR</g:price>
      <g:brand>${brand}</g:brand>
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