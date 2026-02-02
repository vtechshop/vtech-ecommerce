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

// Dynamic HTML rendering for SEO (serves to crawlers)
exports.renderPage = async (req, res, next) => {
  try {
    const { path } = req.query;
    if (!path) {
      return res.status(400).json({ error: 'Path parameter required' });
    }

    const clientUrl = ensureProtocol(env.CLIENT_URL, 'https://vtechkitchen.com');
    const fullUrl = `${clientUrl}${path}`;

    // Parse the path to determine page type
    const pathParts = path.split('/').filter(Boolean);
    let pageData = {
      title: 'V-Tech Kitchen - Premium Kitchen Appliances & Utensils',
      description: 'Shop premium kitchen appliances and utensils at V-Tech Kitchen. Discover quality cookware, gadgets, and tools for your modern kitchen.',
      image: `${clientUrl}/og-image.jpg`,
      type: 'website',
      content: '',
      schema: null,
    };

    // Product page
    if (pathParts[0] === 'product' && pathParts[1]) {
      const product = await Product.findOne({ slug: pathParts[1], published: true })
        .populate('vendorId', 'storeName')
        .populate('categoryIds', 'name')
        .lean();

      if (product) {
        pageData.title = `${product.title} - V-Tech Kitchen`;
        pageData.description = product.description?.substring(0, 160) || `Buy ${product.title} at best price. ${product.shortDescription || ''}`;
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
          description: product.description,
          image: product.images,
          sku: product.sku || product._id.toString(),
          brand: { '@type': 'Brand', name: product.brand || product.vendorId?.storeName || 'V-Tech Kitchen' },
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'INR',
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: fullUrl,
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
        pageData.description = post.excerpt || post.content?.substring(0, 160) || `Read ${post.title} on V-Tech Kitchen Blog.`;
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

    // Search page
    else if (pathParts[0] === 'search') {
      pageData.title = 'Search Products - V-Tech Kitchen';
      pageData.description = 'Search for premium kitchen appliances, cookware, and utensils at V-Tech Kitchen.';
      pageData.content = `
        <h1>Search Products</h1>
        <p>Find the best kitchen appliances and utensils at V-Tech Kitchen.</p>
        <p>Browse our categories: Cookware, Appliances, Utensils, Gadgets</p>
      `;
    }

    // Static pages
    else if (pathParts[0] === 'page') {
      const pageName = pathParts[1];
      const pageContent = {
        'privacy-policy': { title: 'Privacy Policy', desc: 'Learn how V-Tech Kitchen protects your privacy and handles your data.' },
        'terms-of-service': { title: 'Terms of Service', desc: 'Read the terms and conditions for using V-Tech Kitchen.' },
        'return-policy': { title: 'Return Policy', desc: 'Learn about our return and refund policies at V-Tech Kitchen.' },
        'about': { title: 'About Us', desc: 'Learn about V-Tech Kitchen - your trusted source for premium kitchen products.' },
        'contact': { title: 'Contact Us', desc: 'Get in touch with V-Tech Kitchen for support or inquiries.' },
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
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1f2937; }
    a { color: #3b82f6; }
    ul { list-style: none; padding: 0; }
    li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="${clientUrl}">V-Tech Kitchen</a> |
      <a href="${clientUrl}/search">Products</a> |
      <a href="${clientUrl}/blog">Blog</a> |
      <a href="${clientUrl}/page/contact">Contact</a>
    </nav>
  </header>
  <main>
    ${pageData.content}
  </main>
  <footer>
    <p>&copy; 2024 V-Tech Kitchen. All rights reserved.</p>
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