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

export const trackEvent = (eventName, params = {}) => {
  // GA4 event
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }

  // Meta Pixel event
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
};

export const trackPurchase = (orderData) => {
  const eventData = {
    transaction_id: orderData.orderId,
    value: orderData.total,
    currency: 'USD',
    items: orderData.items.map(item => ({
      // Handle both populated (object) and non-populated (string) productId
      item_id: typeof item.productId === 'object' ? item.productId._id : item.productId,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  };

  trackEvent('purchase', eventData);
};

export const trackAddToCart = (product, quantity = 1) => {
  trackEvent('add_to_cart', {
    currency: 'USD',
    value: product.price * quantity,
    items: [{
      item_id: product._id,
      item_name: product.title,
      price: product.price,
      quantity,
    }],
  });
};

export const trackBeginCheckout = (cartData) => {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: cartData.totals.total,
    items: cartData.items.map(item => ({
      // Handle both populated (object) and non-populated (string) productId
      item_id: typeof item.productId === 'object' ? item.productId._id : item.productId,
      item_name: item.name,
      price: item.priceSnapshot,
      quantity: item.qty,
    })),
  });
};

export const trackViewItem = (product) => {
  trackEvent('view_item', {
    currency: 'USD',
    value: product.price,
    items: [{
      item_id: product._id,
      item_name: product.title,
      price: product.price,
      item_category: product.categoryIds?.[0] || '',
    }],
  });
};