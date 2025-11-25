// FILE: apps/api/src/ssr/HtmlShell.js
const seoService = require('../services/seoService');

const HtmlShell = ({ html, meta = {}, jsonLD = null }) => {
  const title = meta.title || 'Shop - Multi-Vendor Marketplace';
  const description = meta.description || 'Discover amazing products from trusted vendors';
  const ogImage = meta.ogImage || `${process.env.APP_URL}/og-image.jpg`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${title}</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${process.env.CLIENT_URL}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImage}">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${process.env.CLIENT_URL}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="${ogImage}">
  
  ${meta.canonical ? `<link rel="canonical" href="${meta.canonical}">` : ''}
  
  ${jsonLD ? `<script type="application/ld+json">${JSON.stringify(jsonLD)}</script>` : ''}
  
  <link rel="stylesheet" href="${process.env.CLIENT_URL}/assets/index.css">
</head>
<body>
  <div id="root">${html}</div>
  <script type="module" src="${process.env.CLIENT_URL}/assets/index.js"></script>
</body>
</html>
  `.trim();
};

module.exports = HtmlShell;