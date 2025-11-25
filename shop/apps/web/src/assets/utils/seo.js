// FILE: apps/web/src/utils/seo.js
// SEO utilities for client-side
export const updateMetaTags = (data) => {
  // Title
  if (data.title) {
    document.title = data.title;
  }

  // Description
  updateMetaTag('description', data.description);

  // Canonical
  if (data.canonical) {
    updateLinkTag('canonical', data.canonical);
  }

  // Open Graph
  if (data.ogTitle) updateMetaTag('og:title', data.ogTitle, 'property');
  if (data.ogDescription) updateMetaTag('og:description', data.ogDescription, 'property');
  if (data.ogImage) updateMetaTag('og:image', data.ogImage, 'property');
  if (data.ogUrl) updateMetaTag('og:url', data.ogUrl, 'property');

  // Twitter
  if (data.twitterTitle) updateMetaTag('twitter:title', data.twitterTitle);
  if (data.twitterDescription) updateMetaTag('twitter:description', data.twitterDescription);
  if (data.twitterImage) updateMetaTag('twitter:image', data.twitterImage);
};

const updateMetaTag = (name, content, attribute = 'name') => {
  if (!content) return;

  let element = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const updateLinkTag = (rel, href) => {
  if (!href) return;

  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

export const injectJSONLD = (data) => {
  // Remove existing JSON-LD
  const existing = document.getElementById('jsonld-script');
  if (existing) {
    existing.remove();
  }

  // Add new JSON-LD
  const script = document.createElement('script');
  script.id = 'jsonld-script';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

/**
 * Add JSON-LD structured data to the page
 * Returns cleanup function to remove the script
 */
export const addJsonLD = (data) => {
  if (!data) return () => {};

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);

  // Return cleanup function
  return () => {
    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }
  };
};

/**
 * Generate schema.org Product JSON-LD from product data
 * Uses product.structuredData if available, otherwise generates basic schema
 */
export const generateProductSchema = (product) => {
  if (!product) return null;

  // Base schema that's always included
  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': product.structuredData?.schemaType || 'Product',
    name: product.title,
    description: product.description,
    image: product.images || [],
    sku: product.sku || undefined,
    offers: {
      '@type': 'Offer',
      url: window.location.href,
      priceCurrency: 'USD',
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.vendorId?.storeName || 'Unknown Vendor',
      },
    },
  };

  // Add rating/review aggregate if available
  if (product.rating && product.reviewCount > 0) {
    baseSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    };
  }

  // Merge with custom structured data properties if available
  if (product.structuredData?.properties) {
    const props = product.structuredData.properties;

    // Common Product properties
    if (props.brand) baseSchema.brand = { '@type': 'Brand', name: props.brand };
    if (props.model) baseSchema.model = props.model;
    if (props.color) baseSchema.color = props.color;
    if (props.material) baseSchema.material = props.material;
    if (props.gtin) baseSchema.gtin = props.gtin;
    if (props.mpn) baseSchema.mpn = props.mpn;

    // Book-specific properties
    if (product.structuredData.schemaType === 'Book') {
      if (props.author) baseSchema.author = { '@type': 'Person', name: props.author };
      if (props.isbn) baseSchema.isbn = props.isbn;
      if (props.publisher) baseSchema.publisher = { '@type': 'Organization', name: props.publisher };
      if (props.numberOfPages) baseSchema.numberOfPages = parseInt(props.numberOfPages);
    }

    // Movie-specific properties
    if (product.structuredData.schemaType === 'Movie') {
      if (props.director) baseSchema.director = { '@type': 'Person', name: props.director };
      if (props.actors) {
        baseSchema.actor = props.actors.split(',').map(name => ({ '@type': 'Person', name: name.trim() }));
      }
      if (props.duration) baseSchema.duration = `PT${props.duration}M`; // ISO 8601 duration format
    }

    // MusicAlbum-specific properties
    if (product.structuredData.schemaType === 'MusicAlbum') {
      if (props.artist) baseSchema.byArtist = { '@type': 'MusicGroup', name: props.artist };
      if (props.genre) baseSchema.genre = props.genre;
    }

    // SoftwareApplication-specific properties
    if (product.structuredData.schemaType === 'SoftwareApplication') {
      if (props.operatingSystem) baseSchema.operatingSystem = props.operatingSystem;
      if (props.applicationCategory) baseSchema.applicationCategory = props.applicationCategory;
    }
  }

  // Remove undefined values
  Object.keys(baseSchema).forEach(key => {
    if (baseSchema[key] === undefined) {
      delete baseSchema[key];
    }
  });

  return baseSchema;
};