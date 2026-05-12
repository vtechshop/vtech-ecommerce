// FILE: apps/web/src/utils/analytics.js
// Analytics utilities with consent-aware loading
export const loadGA4 = (measurementId) => {
  if (window.gtag) return; // Already loaded

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId);
};

export const loadMetaPixel = (pixelId) => {
  if (window.fbq) return; // Already loaded

  !(function(f,b,e,v,n,t,s) {
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s);
  })(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
};

// GA4 only — Meta standard events use different names, tracked separately below
export const trackEvent = (eventName, params = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
};

// Meta Pixel only — uses PascalCase standard event names
const fbqTrack = (eventName, params) => {
  if (window.fbq) {
    window.fbq('track', eventName, params);
  }
};

export const trackPageView = (path) => {
  if (window.gtag) {
    window.gtag('config', window.GA_MEASUREMENT_ID, {
      page_path: path,
    });
  }
  fbqTrack('PageView');
};

export const trackPurchase = (orderData) => {
  const productIds = orderData.items.map(item =>
    String(typeof item.productId === 'object' ? item.productId._id : item.productId)
  ).filter(Boolean);

  // GA4
  trackEvent('purchase', {
    transaction_id: orderData.orderId,
    value: orderData.total,
    currency: 'INR',
    items: orderData.items.map(item => ({
      item_id: typeof item.productId === 'object' ? item.productId._id : item.productId,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  });

  // Meta
  fbqTrack('Purchase', {
    value: orderData.total,
    currency: 'INR',
    content_ids: productIds,
    content_type: 'product',
    num_items: orderData.items.reduce((sum, item) => sum + (item.quantity || 1), 0),
  });
};

export const trackAddToCart = (product, quantity = 1) => {
  // GA4
  trackEvent('add_to_cart', {
    currency: 'INR',
    value: product.price * quantity,
    items: [{
      item_id: product._id,
      item_name: product.title,
      price: product.price,
      quantity,
    }],
  });

  // Meta
  fbqTrack('AddToCart', {
    content_ids: [String(product._id)],
    content_name: product.title,
    content_type: 'product',
    value: product.price * quantity,
    currency: 'INR',
    num_items: quantity,
  });
};

export const trackBeginCheckout = (cartData) => {
  const productIds = cartData.items.map(item =>
    String(typeof item.productId === 'object' ? item.productId._id : item.productId)
  ).filter(Boolean);

  // GA4
  trackEvent('begin_checkout', {
    currency: 'INR',
    value: cartData.totals.total,
    items: cartData.items.map(item => ({
      item_id: typeof item.productId === 'object' ? item.productId._id : item.productId,
      item_name: item.name,
      price: item.priceSnapshot,
      quantity: item.qty,
    })),
  });

  // Meta
  fbqTrack('InitiateCheckout', {
    content_ids: productIds,
    content_type: 'product',
    num_items: cartData.items.reduce((sum, item) => sum + (item.qty || 1), 0),
    value: cartData.totals.total,
    currency: 'INR',
  });
};

export const trackRemoveFromCart = (item) => {
  // GA4 only (no standard Meta event for remove-from-cart)
  trackEvent('remove_from_cart', {
    currency: 'INR',
    value: (item.priceSnapshot || item.price || 0) * (item.qty || item.quantity || 1),
    items: [{
      item_id: typeof item.productId === 'object' ? item.productId._id : item.productId,
      item_name: item.name || item.title,
      price: item.priceSnapshot || item.price || 0,
      quantity: item.qty || item.quantity || 1,
    }],
  });
};

export const trackViewItem = (product) => {
  // GA4
  trackEvent('view_item', {
    currency: 'INR',
    value: product.price,
    items: [{
      item_id: product._id,
      item_name: product.title,
      price: product.price,
      item_category: product.categoryIds?.[0] || '',
    }],
  });

  // Meta
  fbqTrack('ViewContent', {
    content_ids: [String(product._id)],
    content_name: product.title,
    content_type: 'product',
    value: product.price,
    currency: 'INR',
  });
};