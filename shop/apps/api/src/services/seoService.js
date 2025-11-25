// FILE: apps/api/src/services/seoService.js
const env = require('../config/env');

class SEOService {
  generateProductJsonLD(product, vendor) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description,
      image: product.images || [],
      brand: {
        '@type': 'Brand',
        name: product.brand || vendor?.storeName || 'Shop',
      },
      sku: product.sku,
      offers: {
        '@type': 'Offer',
        url: `${env.CLIENT_URL}/product/${product.slug}`,
        priceCurrency: 'USD',
        price: product.price,
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
      aggregateRating: product.rating > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
      } : undefined,
    };
  }

  generateBreadcrumbJsonLD(items) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  generateOrganizationJsonLD() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Shop',
      url: env.CLIENT_URL,
      logo: `${env.CLIENT_URL}/logo.png`,
      sameAs: [
        'https://facebook.com/shop',
        'https://twitter.com/shop',
        'https://instagram.com/shop',
      ],
    };
  }

  generateWebSiteJsonLD() {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Shop',
      url: env.CLIENT_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${env.CLIENT_URL}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };
  }
}

module.exports = new SEOService();