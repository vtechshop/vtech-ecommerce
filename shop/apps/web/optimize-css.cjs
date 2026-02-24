/**
 * Post-build script: Makes CSS non-blocking for faster FCP
 *
 * Strategy:
 * 1. Inline minimal critical CSS for immediate first paint
 * 2. Convert main CSS <link> to non-blocking (media="print" + onload)
 * 3. Add noscript fallback
 *
 * The #seo-content div (visible before React mounts) uses inline styles,
 * so it paints immediately. This gives ultra-fast FCP.
 * Full CSS loads async (in parallel with JS) for styled React render.
 */
const fs = require('fs');
const path = require('path');

const distHtml = path.join(__dirname, 'dist', 'index.html');

if (!fs.existsSync(distHtml)) {
  console.log('dist/index.html not found, skipping CSS optimization');
  process.exit(0);
}

let html = fs.readFileSync(distHtml, 'utf-8');

// Critical CSS - minimal styles to prevent FOUC when React mounts
const criticalCSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%;line-height:1.5}
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;background:#f9fafb;color:#111827;-webkit-font-smoothing:antialiased}
.min-h-screen{min-height:100vh}
.bg-gray-50{background:#f9fafb}
.bg-white{background:#fff}
.text-white{color:#fff}
.container{width:100%;margin:0 auto;padding:0 1rem}
.font-bold{font-weight:700}
.text-4xl{font-size:2.25rem;line-height:2.5rem}
.text-lg{font-size:1.125rem}
.mb-4{margin-bottom:1rem}
.py-16{padding-top:4rem;padding-bottom:4rem}
.rounded-lg{border-radius:.5rem}
.bg-gradient-to-r{background-image:linear-gradient(to right,var(--tw-gradient-stops))}
.from-primary-600{--tw-gradient-from:#2563eb;--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to,transparent)}
.to-primary-200{--tw-gradient-to:#bfdbfe}
`.trim().replace(/\n/g, '');

// Find CSS link tag (Vite generates: <link rel="stylesheet" crossorigin href="/assets/css/...">)
const cssLinkRegex = /<link\s+rel="stylesheet"\s+crossorigin\s+href="(\/assets\/css\/[^"]+)">/;
const match = html.match(cssLinkRegex);

if (!match) {
  console.log('CSS link tag not found in expected format, skipping');
  process.exit(0);
}

const cssHref = match[1];
const originalLink = match[0];

// Replace with: critical inline CSS + non-blocking full CSS + noscript fallback
const replacement = `<style>${criticalCSS}</style>
    <link rel="stylesheet" href="${cssHref}" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="${cssHref}"></noscript>`;

html = html.replace(originalLink, replacement);

fs.writeFileSync(distHtml, html);
console.log(`✅ CSS optimized: inlined critical CSS + deferred ${cssHref}`);
