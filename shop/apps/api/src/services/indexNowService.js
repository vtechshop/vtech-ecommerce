// FILE: apps/api/src/services/indexNowService.js
const axios = require('axios');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Post = require('../models/Post');
const Page = require('../models/Page');
const Vendor = require('../models/Vendor');
const env = require('../config/env');

const INDEXNOW_KEY = 'b4d7f2e8a1c94d5b8e3f6a7c0d2e1b9a';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

function getBaseUrl() {
  let url = env.CLIENT_URL || 'https://www.vtechkitchen.com';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  url = url.replace('https://vtechkitchen.com', 'https://www.vtechkitchen.com');
  return url.replace(/\/$/, '');
}

const BASE_URL = getBaseUrl();
const HOST = new URL(BASE_URL).host; // www.vtechkitchen.com

/**
 * Submit a batch of URLs to IndexNow API.
 * IndexNow supports up to 10,000 URLs per request.
 * @param {string[]} urls - Array of full URLs to submit
 * @returns {Object} { success, submitted, status, error }
 */
async function submitUrls(urls) {
  if (!urls || urls.length === 0) {
    return { success: false, submitted: 0, error: 'No URLs provided' };
  }

  try {
    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    };

    const response = await axios.post(INDEXNOW_ENDPOINT, payload, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      timeout: 30000,
    });

    // IndexNow returns 200 (OK) or 202 (Accepted)
    console.log(`IndexNow: Submitted ${urls.length} URLs, status: ${response.status}`);
    return {
      success: true,
      submitted: urls.length,
      status: response.status,
    };
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error(`IndexNow submission failed: status=${status}`, data || error.message);
    return {
      success: false,
      submitted: 0,
      status,
      error: data || error.message,
    };
  }
}

/**
 * Submit a single URL to IndexNow (GET method, simpler for one-off submissions).
 * @param {string} url - The full URL to submit
 */
async function submitSingleUrl(url) {
  try {
    const response = await axios.get(INDEXNOW_ENDPOINT, {
      params: {
        url,
        key: INDEXNOW_KEY,
        keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
      },
      timeout: 10000,
    });
    console.log(`IndexNow: Submitted ${url}, status: ${response.status}`);
    return { success: true, url, status: response.status };
  } catch (error) {
    console.error(`IndexNow single submit failed for ${url}:`, error.response?.status || error.message);
    return { success: false, url, error: error.message };
  }
}

/**
 * Collect all indexable URLs from the database (same as sitemap).
 * @returns {string[]} Array of full URLs
 */
async function collectAllUrls() {
  const [products, categories, posts, pages, vendors] = await Promise.all([
    Product.find({ published: true }).select('slug').lean(),
    Category.find({ isActive: true }).select('slug').lean(),
    Post.find({ published: true }).select('slug').lean(),
    Page.find({ status: 'published' }).select('slug').lean(),
    Vendor.find({ status: 'active' }).select('slug').lean(),
  ]);

  const urls = [];

  // Home
  urls.push(BASE_URL);

  // Static pages
  const staticPaths = [
    '/products', '/blog', '/page/about', '/page/contact',
    '/track-order', '/warranty-check',
    '/page/privacy', '/page/terms', '/page/returns', '/page/shipping', '/page/faq',
  ];
  staticPaths.forEach(p => urls.push(`${BASE_URL}${p}`));

  // Dynamic pages
  categories.forEach(c => c.slug && urls.push(`${BASE_URL}/category/${c.slug}`));
  products.forEach(p => p.slug && urls.push(`${BASE_URL}/product/${p.slug}`));
  posts.forEach(p => p.slug && urls.push(`${BASE_URL}/blog/${p.slug}`));
  pages.forEach(p => p.slug && urls.push(`${BASE_URL}/page/${p.slug}`));
  vendors.forEach(v => v.slug && urls.push(`${BASE_URL}/vendor/${v.slug}`));

  return urls;
}

/**
 * Submit ALL site URLs to IndexNow (bulk).
 * Used from admin panel or CLI.
 */
async function submitAllUrls() {
  const urls = await collectAllUrls();
  const result = await submitUrls(urls);
  return { ...result, totalUrls: urls.length, urls };
}

/**
 * Submit URL for a specific content type change.
 * Call this after creating/updating products, categories, posts, etc.
 * @param {'product'|'category'|'blog'|'page'|'vendor'} type
 * @param {string} slug
 */
async function notifyContentChange(type, slug) {
  if (!slug) return;

  const pathMap = {
    product: `/product/${slug}`,
    category: `/category/${slug}`,
    blog: `/blog/${slug}`,
    page: `/page/${slug}`,
    vendor: `/vendor/${slug}`,
  };

  const path = pathMap[type];
  if (!path) return;

  const url = `${BASE_URL}${path}`;

  // Also submit the parent listing page
  const parentMap = {
    product: '/products',
    category: '/products',
    blog: '/blog',
    vendor: '/products',
  };

  const urls = [url];
  if (parentMap[type]) {
    urls.push(`${BASE_URL}${parentMap[type]}`);
  }

  // Fire and forget - don't block the main request
  submitUrls(urls).catch(err => {
    console.error('IndexNow background submit failed:', err.message);
  });
}

module.exports = {
  submitUrls,
  submitSingleUrl,
  collectAllUrls,
  submitAllUrls,
  notifyContentChange,
  INDEXNOW_KEY,
  BASE_URL,
};
