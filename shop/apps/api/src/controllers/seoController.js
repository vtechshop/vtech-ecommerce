// FILE: apps/api/src/controllers/seoController.js
const Product = require('../models/Product');
const Category = require('../models/Category');
const Post = require('../models/Post');
const Vendor = require('../models/Vendor');
const Review = require('../models/Review');
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

    const staticPages = ['about', 'contact', 'privacy', 'terms', 'returns', 'shipping', 'faq', 'vendor-terms', 'vendor-guide', 'affiliate-terms', 'affiliate-guide', 'cookie-policy'];
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

      pageData.title = 'V-Tech Kitchen - Premium Kitchen Appliances';
      pageData.description = 'Shop premium kitchen appliances, commercial equipment & cookware at V-Tech Kitchen. Cast iron tawa, cutting machines & more. Free shipping over ₹500.';
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
        // Fetch approved reviews for this product
        const productReviews = await Review.find({ productId: product._id, status: 'approved' })
          .populate('userId', 'name')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .catch(() => []);

        pageData.title = `${product.title} - V-Tech Kitchen`.substring(0, 70);
        pageData.description = (product.description?.substring(0, 155) || `Buy ${product.title} at best price. ${product.shortDescription || ''}`).substring(0, 160);
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

        // Price valid for 1 year from now
        const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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
            priceValidUntil,
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: fullUrl,
            seller: {
              '@type': 'Organization',
              name: product.vendorId?.storeName || 'V-Tech Kitchen',
            },
          },
        };

        // Add aggregateRating if product has reviews
        if (product.rating > 0 && product.reviewCount > 0) {
          pageData.schema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          };
        }

        // Add individual reviews if available
        if (productReviews.length > 0) {
          pageData.schema.review = productReviews.map(r => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.userId?.name || 'Customer' },
            datePublished: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : undefined,
            reviewBody: r.comment || r.title || '',
            name: r.title || undefined,
            reviewRating: {
              '@type': 'Rating',
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
          }));
        }
      }
    }

    // Category page
    else if (pathParts[0] === 'category' && pathParts[1]) {
      const category = await Category.findOne({ slug: pathParts[1], isActive: true }).lean();
      const products = await Product.find({ categoryIds: category?._id, published: true })
        .select('title slug price images')
        .limit(20)
        .lean();

      // Derive a readable name from the slug in case the category isn't in DB
      const slugCategoryName = pathParts[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

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
      } else {
        pageData.title = `${slugCategoryName} - V-Tech Kitchen`;
        pageData.description = `Shop ${slugCategoryName} products at V-Tech Kitchen. Premium quality kitchen equipment with best prices and fast delivery across India.`;
        pageData.content = `<h1>${slugCategoryName}</h1><p>Browse our collection of premium ${slugCategoryName} products at V-Tech Kitchen. Discover high-quality kitchen equipment at the best prices.</p>`;
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
        const blogSuffix = ' - V-Tech Kitchen Blog';
        pageData.title = (post.title + blogSuffix).length <= 70 ? post.title + blogSuffix : post.title.substring(0, 70 - blogSuffix.length) + blogSuffix;
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
      pageData.description = 'Browse all premium kitchen appliances, cookware, and commercial kitchen equipment at V-Tech Kitchen. Best prices with fast pan-India delivery. Trusted by thousands.';
      pageData.content = `
        <h1>All Products - V-Tech Kitchen</h1>
        <p>Browse our complete collection of premium kitchen appliances and utensils.</p>
        ${recentProducts.length ? `<h2>Our Products</h2><ul>${recentProducts.map(p => `<li><a href="${clientUrl}/product/${p.slug}">${p.title} - ₹${p.price?.toLocaleString('en-IN')}</a></li>`).join('')}</ul>` : ''}
      `;
    }

    // Blog listing page
    else if (pathParts[0] === 'blog' && !pathParts[1]) {
      pageData.title = 'Blog - V-Tech Kitchen';
      pageData.description = 'Read tips, guides, cooking ideas, and kitchen appliance reviews on the V-Tech Kitchen blog. Expert advice on cookware, grinders, cutting machines, and more.';
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
        'privacy': {
          title: 'Privacy Policy - V-Tech Kitchen',
          desc: 'V-Tech Kitchen privacy policy explains how we collect, use, and protect your personal information when you shop with us. Your data security is our priority.',
          body: '<h1>Privacy Policy</h1><p>V-Tech Kitchen is committed to protecting your privacy. This policy explains how we collect, store, and use your personal information when you visit or make a purchase from our website.</p><h2>Data We Collect</h2><p>We collect information you provide during registration, purchases, and communications — including name, email, phone number, and delivery address.</p><h2>How We Use Your Data</h2><p>Your data is used to process orders, send order updates, provide customer support, and improve our services. We do not sell your personal information to third parties.</p><h2>Contact</h2><p>For privacy concerns, email vtechshop.customercare@gmail.com.</p>',
        },
        'terms': {
          title: 'Terms of Service - V-Tech Kitchen',
          desc: 'Read V-Tech Kitchen terms of service covering account usage, orders, payments, shipping, returns, and user responsibilities on our marketplace platform.',
          body: '<h1>Terms of Service</h1><p>By using V-Tech Kitchen, you agree to these terms governing your use of our marketplace. Please read them carefully before making a purchase.</p><h2>Account Usage</h2><p>Users must be 18 years or older to create an account. You are responsible for maintaining account security and all activities under your account.</p><h2>Orders &amp; Payments</h2><p>All payments are processed securely via Razorpay. Prices include applicable GST unless stated otherwise. Orders are confirmed only after successful payment.</p><h2>Returns &amp; Refunds</h2><p>We offer a 7-day return policy on eligible products in original condition. Refunds are processed within 5-7 business days.</p><h2>Intellectual Property</h2><p>All content on V-Tech Kitchen is protected by copyright. Unauthorized reproduction or distribution is prohibited.</p>',
        },
        'returns': {
          title: 'Returns & Refunds Policy - V-Tech Kitchen',
          desc: 'Easy returns and refunds at V-Tech Kitchen. 7-day return policy with free pickup, quick refund processing, and hassle-free exchange options for all products.',
          body: '<h1>Returns &amp; Refunds Policy</h1><p>V-Tech Kitchen offers a 7-day return policy on eligible products. We want you to be fully satisfied with your purchase.</p><h2>How to Initiate a Return</h2><p>Contact us within 7 days of delivery via email or phone. Provide your order ID and reason for return. We will arrange free pickup for eligible returns.</p><h2>Refund Timeline</h2><p>Refunds are processed within 5-7 business days after we receive the returned product. The amount is credited back to your original payment method.</p><h2>Non-Returnable Items</h2><p>Perishable goods, customized products, and items damaged due to misuse are not eligible for return.</p>',
        },
        'shipping': {
          title: 'Shipping Information - V-Tech Kitchen',
          desc: 'Free shipping on orders over ₹500 at V-Tech Kitchen. Standard delivery in 2-10 days, express in 2-3 days. Pan-India coverage with real-time order tracking.',
          body: '<h1>Shipping Information</h1><p>V-Tech Kitchen ships across India with reliable courier partners. Enjoy free shipping on all orders above ₹500.</p><h2>Delivery Times</h2><ul><li><strong>Standard Delivery:</strong> 2-10 business days</li><li><strong>Express Delivery:</strong> 2-3 business days (available in select cities)</li></ul><h2>Shipping Charges</h2><p>Free shipping on orders above ₹500. Orders below ₹500 attract a flat ₹49 shipping fee.</p><h2>Order Tracking</h2><p>Track your order in real-time using your order ID on our Track Order page. SMS and email updates are sent at every delivery milestone.</p>',
        },
        'faq': {
          title: 'Frequently Asked Questions - V-Tech Kitchen',
          desc: 'Find answers about orders, payments, shipping, returns, vendor program and affiliate commissions at V-Tech Kitchen. Quick help for all queries and concerns.',
          body: '<h1>Frequently Asked Questions</h1><h2>Orders &amp; Tracking</h2><p>Track your order using the Track Order page with your order ID. You will receive real-time delivery updates via SMS and email.</p><h2>Payments</h2><p>We accept UPI, credit/debit cards, net banking, and EMI through Razorpay. All transactions are 100% secure and encrypted.</p><h2>Returns &amp; Refunds</h2><p>Return eligible products within 7 days of delivery. Contact support to initiate a return. Refunds are processed in 5-7 business days.</p><h2>Vendor Program</h2><p>Apply to become a vendor on V-Tech Kitchen through the vendor registration page. Expand your reach to customers across India.</p><h2>Affiliate Program</h2><p>Earn 5-8% commission by promoting V-Tech Kitchen products. Join through your account dashboard.</p>',
        },
        'about': {
          title: 'About V-Tech Kitchen | Equipment Manufacturer, Coimbatore',
          desc: 'V-Tech Kitchen is a leading manufacturer of commercial kitchen equipment in Coimbatore. Premium blenders, grinders, cutting machines, and cookware for professional kitchens.',
          body: '<h1>About V-Tech Kitchen</h1><p>V-Tech Kitchen is a leading manufacturer and retailer of commercial kitchen equipment based in Coimbatore, Tamil Nadu, India. We design and manufacture premium kitchen appliances for both home kitchens and professional catering businesses.</p><h2>Our Products</h2><ul><li>Cast Iron Tawa &amp; Cookware</li><li>Electric Cutting &amp; Chopping Machines</li><li>Industrial Blenders &amp; Wet Grinders</li><li>Commercial Kitchen Equipment</li><li>Kitchen Utensils &amp; Accessories</li></ul><h2>Our Mission</h2><p>Empowering professional kitchens across India with durable, high-quality equipment that makes cooking easier, faster, and more efficient.</p><h2>Get in Touch</h2><p>Call us at +91 99438 82409 or email vtechshop.customercare@gmail.com. Available Monday to Saturday, 9AM - 7PM IST.</p>',
        },
        'contact': {
          title: 'Contact V-Tech Kitchen - Support & Inquiries',
          desc: 'Get in touch with V-Tech Kitchen for product inquiries, orders, or support. Call +91 99438 82409, email us, or use our contact form. Available Mon-Sat 9AM-7PM IST.',
          body: '<h1>Contact V-Tech Kitchen</h1><p>We are here to help with product inquiries, order support, warranty claims, and general questions.</p><h2>Contact Details</h2><ul><li><strong>Phone:</strong> +91 99438 82409</li><li><strong>Email:</strong> vtechshop.customercare@gmail.com</li><li><strong>Hours:</strong> Monday to Saturday, 9AM - 7PM IST</li></ul><h2>Our Location</h2><p>Coimbatore, Tamil Nadu, India.</p><h2>Support</h2><p>For order issues, tracking, returns, or warranty claims, please have your order ID ready when contacting us for faster resolution.</p>',
        },
        'vendor-terms': {
          title: 'Vendor Terms & Conditions - V-Tech Kitchen',
          desc: 'Terms and conditions for selling on V-Tech Kitchen marketplace. Commission structure, product listing guidelines, payment terms, and vendor responsibilities.',
          body: '<h1>Vendor Terms &amp; Conditions</h1><p>These terms govern your participation as a vendor on V-Tech Kitchen marketplace. By registering as a vendor, you agree to these terms.</p><h2>Commission Structure</h2><p>V-Tech Kitchen charges a commission on each sale completed through the platform. Commission rates vary by product category and are detailed in your vendor agreement.</p><h2>Product Listings</h2><p>All products must be accurately described with correct images, pricing, and specifications. Misleading or inaccurate listings will be removed without notice.</p><h2>Order Fulfilment</h2><p>Vendors must ship confirmed orders within 2 business days. Failure to fulfil orders may result in account suspension.</p><h2>Payments</h2><p>Vendor settlements are processed weekly. Minimum payout threshold is ₹500.</p>',
        },
        'vendor-guide': {
          title: 'Vendor Guide - V-Tech Kitchen Marketplace',
          desc: 'Step-by-step guide to selling on V-Tech Kitchen marketplace. Set up your store, list products, manage orders, and grow your business with our full support.',
          body: '<h1>Vendor Guide</h1><p>Welcome to V-Tech Kitchen marketplace. This guide helps you get started as a vendor and maximize your sales.</p><h2>Getting Started</h2><ol><li>Register as a vendor on V-Tech Kitchen</li><li>Complete KYC verification with Aadhaar/PAN</li><li>Set up your store profile and logo</li><li>List your products with images and descriptions</li></ol><h2>Managing Orders</h2><p>Track and manage orders through your vendor dashboard. Ship orders within 2 business days of confirmation to maintain good ratings.</p><h2>Payments &amp; Settlements</h2><p>Receive weekly settlements for completed orders directly to your bank account. Track all earnings in the settlements section of your dashboard.</p>',
        },
        'affiliate-terms': {
          title: 'Affiliate Program Terms - V-Tech Kitchen',
          desc: 'Terms and conditions for V-Tech Kitchen affiliate program. Learn about commission rates, payment terms, promotional guidelines, and partner responsibilities.',
          body: '<h1>Affiliate Program Terms</h1><p>The V-Tech Kitchen Affiliate Program allows you to earn commissions by promoting our products to your audience.</p><h2>Commission Rates</h2><p>Earn 5-8% commission on every sale generated through your unique affiliate links. Commission rates vary by product category.</p><h2>Eligibility</h2><p>You must have an active V-Tech Kitchen account and comply with all promotional guidelines to participate in the affiliate program.</p><h2>Payment Terms</h2><p>Commissions are paid monthly via bank transfer or UPI. Minimum payout threshold is ₹500. Earnings are tracked in your affiliate dashboard.</p><h2>Prohibited Activities</h2><p>Spam, self-referrals, cookie stuffing, and misleading promotions are strictly prohibited and may result in immediate account termination.</p>',
        },
        'affiliate-guide': {
          title: 'Affiliate Guide - V-Tech Kitchen',
          desc: 'Complete guide to V-Tech Kitchen affiliate program. Earn 5-8% commissions by promoting products. Learn about tiers, payment methods, and how to maximize your earnings.',
          body: '<h1>Affiliate Guide</h1><p>Join V-Tech Kitchen\'s affiliate program and start earning commissions by sharing product links with your audience.</p><h2>How It Works</h2><ol><li>Sign up for the affiliate program from your account dashboard</li><li>Get unique product affiliate links</li><li>Share links on social media, blogs, YouTube, or websites</li><li>Earn 5-8% commission on every completed sale</li></ol><h2>Tips to Maximize Earnings</h2><ul><li>Focus on high-value products (commercial equipment, cast iron cookware)</li><li>Create product review content and comparison articles</li><li>Share during festive seasons and sale events</li><li>Use all available channels — Instagram, YouTube, WhatsApp</li></ul><h2>Payouts</h2><p>Earnings are paid monthly. Track all clicks, conversions, and earnings in your affiliate dashboard.</p>',
        },
      };

      if (pageContent[pageName]) {
        pageData.title = pageContent[pageName].title;
        pageData.description = pageContent[pageName].desc;
        pageData.content = pageContent[pageName].body;
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
          <li><a href="${clientUrl}/cookie-policy">Cookie Policy</a></li>
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