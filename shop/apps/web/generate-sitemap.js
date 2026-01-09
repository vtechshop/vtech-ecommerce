// Script to generate sitemap URLs for react-snap
// This fetches products from your API and creates URLs to crawl

const fs = require('fs');
const axios = require('axios');

const API_URL = process.env.VITE_API_URL || 'http://localhost:8080/api';
const BASE_URL = 'https://vtechkitchen.com';

async function generateSitemapRoutes() {
  const routes = [
    '/',
    '/search',
    '/blog',
    '/page/about',
    '/page/contact',
    '/page/faq',
    '/page/shipping',
    '/page/returns',
    '/page/privacy',
    '/page/terms',
  ];

  try {
    // Fetch products
    console.log('Fetching products...');
    const productsRes = await axios.get(`${API_URL}/catalog/products?limit=100&published=true`);
    const products = productsRes.data?.data?.products || [];

    products.forEach(product => {
      if (product.slug) {
        routes.push(`/product/${product.slug}`);
      }
    });
    console.log(`Added ${products.length} product routes`);

    // Fetch categories
    console.log('Fetching categories...');
    const categoriesRes = await axios.get(`${API_URL}/catalog/categories`);
    const categories = categoriesRes.data?.data || [];

    categories.forEach(category => {
      if (category.slug) {
        routes.push(`/category/${category.slug}`);
      }
    });
    console.log(`Added ${categories.length} category routes`);

    // Fetch blog posts
    console.log('Fetching blog posts...');
    try {
      const postsRes = await axios.get(`${API_URL}/cms/posts?status=published`);
      const posts = postsRes.data?.data || [];

      posts.forEach(post => {
        if (post.slug) {
          routes.push(`/blog/${post.slug}`);
        }
      });
      console.log(`Added ${posts.length} blog post routes`);
    } catch (e) {
      console.log('No blog posts found or API error');
    }

  } catch (error) {
    console.error('Error fetching data:', error.message);
  }

  // Write to file for react-snap
  const config = {
    include: routes
  };

  console.log(`\nTotal routes to prerender: ${routes.length}`);
  console.log('\nSample routes:');
  routes.slice(0, 10).forEach(route => console.log(`  ${BASE_URL}${route}`));

  return routes;
}

// Run if called directly
if (require.main === module) {
  generateSitemapRoutes().then(routes => {
    console.log('\n✅ Sitemap routes generated successfully!');
    console.log(`Add these ${routes.length} routes to your react-snap config`);
  });
}

module.exports = { generateSitemapRoutes };
