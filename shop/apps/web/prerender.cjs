// FILE: apps/web/prerender.js
// Post-build prerendering script using Puppeteer
// Generates static HTML for SEO-critical pages

const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DIST_DIR = path.join(__dirname, 'dist');
const API_URL = process.env.VITE_API_URL || 'https://api.vtechkitchen.com/api';
const PORT = 4173;

// Serve static files from dist
function createServer() {
  return http.createServer((req, res) => {
    let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

    // For SPA routes, serve index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
    };

    res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');

    try {
      const content = fs.readFileSync(filePath);
      res.end(content);
    } catch (err) {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
}

// Fetch dynamic routes from API
async function fetchRoutes() {
  const routes = [
    '/',
    '/search',
    '/blog',
    '/page/about',
    '/page/contact',
    '/page/privacy-policy',
    '/page/terms-of-service',
    '/page/return-policy',
    '/page/faq',
    '/track-order',
  ];

  try {
    // Fetch products
    console.log('Fetching products from API...');
    const productsRes = await axios.get(`${API_URL}/catalog/products?limit=500&published=true`);
    // Handle both response formats: { data: { products: [] } } or { data: [] }
    const products = productsRes.data?.data?.products || productsRes.data?.data || [];
    products.forEach(p => {
      if (p.slug) routes.push(`/product/${p.slug}`);
    });
    console.log(`  Added ${products.length} product routes`);

    // Fetch categories
    console.log('Fetching categories from API...');
    const categoriesRes = await axios.get(`${API_URL}/catalog/categories`);
    const categories = categoriesRes.data?.data || [];
    categories.forEach(c => {
      if (c.slug) routes.push(`/category/${c.slug}`);
    });
    console.log(`  Added ${categories.length} category routes`);

    // Fetch blog posts
    console.log('Fetching blog posts from API...');
    try {
      const postsRes = await axios.get(`${API_URL}/cms/posts?status=published&limit=100`);
      const posts = postsRes.data?.data || [];
      posts.forEach(p => {
        if (p.slug) routes.push(`/blog/${p.slug}`);
      });
      console.log(`  Added ${posts.length} blog routes`);
    } catch (e) {
      console.log('  No blog posts found');
    }

    // Fetch vendors
    console.log('Fetching vendors from API...');
    try {
      const vendorsRes = await axios.get(`${API_URL}/vendors?status=active&limit=100`);
      const vendors = vendorsRes.data?.data || [];
      vendors.forEach(v => {
        if (v.slug) routes.push(`/vendor/${v.slug}`);
      });
      console.log(`  Added ${vendors.length} vendor routes`);
    } catch (e) {
      console.log('  No vendors found');
    }

  } catch (error) {
    console.error('Error fetching routes:', error.message);
    console.log('Continuing with static routes only...');
  }

  return [...new Set(routes)]; // Remove duplicates
}

// Render a single page
async function renderPage(browser, url, route) {
  const page = await browser.newPage();

  try {
    // Set user agent to look like Googlebot
    await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');

    // Navigate and wait for network idle
    await page.goto(url, {
      waitUntil: 'networkidle2', // Less strict - allows 2 ongoing connections
      timeout: 60000 // 60 seconds timeout
    });

    // Wait for React to render
    await page.waitForSelector('#root', { timeout: 10000 });

    // Additional wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the rendered HTML
    const html = await page.content();

    // Determine file path
    const filePath = route === '/'
      ? path.join(DIST_DIR, 'index.html')
      : path.join(DIST_DIR, route, 'index.html');

    // Create directory if needed
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the prerendered HTML
    fs.writeFileSync(filePath, html);

    return true;
  } catch (error) {
    console.error(`  Error rendering ${route}:`, error.message);
    return false;
  } finally {
    await page.close();
  }
}

// Main prerender function
async function prerender() {
  console.log('\n========================================');
  console.log('Starting Prerender Process');
  console.log('========================================\n');

  // Check if dist exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Fetch routes
  console.log('Step 1: Fetching routes...\n');
  const routes = await fetchRoutes();
  console.log(`\nTotal routes to prerender: ${routes.length}\n`);

  // Start server
  console.log('Step 2: Starting local server...');
  const server = createServer();
  server.listen(PORT);
  console.log(`  Server running on http://localhost:${PORT}\n`);

  // Launch browser
  console.log('Step 3: Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('  Browser launched\n');

  // Render pages
  console.log('Step 4: Rendering pages...\n');
  let success = 0;
  let failed = 0;

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const url = `http://localhost:${PORT}${route}`;

    process.stdout.write(`  [${i + 1}/${routes.length}] ${route}... `);

    const result = await renderPage(browser, url, route);
    if (result) {
      console.log('OK');
      success++;
    } else {
      console.log('FAILED');
      failed++;
    }
  }

  // Cleanup
  await browser.close();
  server.close();

  // Summary
  console.log('\n========================================');
  console.log('Prerender Complete!');
  console.log('========================================');
  console.log(`  Success: ${success}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Total:   ${routes.length}`);
  console.log('========================================\n');

  if (failed > 0) {
    console.log('Some pages failed to prerender. Check the errors above.');
  }
}

// Run
prerender().catch(console.error);
