// Vercel Edge Middleware for Dynamic Rendering (SEO)
// Routes search engine crawlers to pre-rendered HTML from API

// Common crawler user agents
const CRAWLER_USER_AGENTS = [
  'googlebot',
  'google-inspectiontool',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'facebot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'pinterest',
  'applebot',
  'semrushbot',
  'ahrefsbot',
];

// Routes to intercept for crawlers
const SEO_ROUTES = ['/product/', '/category/', '/vendor/', '/page/', '/blog/', '/products'];

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only intercept SEO-relevant routes
  const isSeoRoute = SEO_ROUTES.some(route => pathname.startsWith(route) || pathname === '/products');
  if (!isSeoRoute) {
    return;
  }

  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  // Check if request is from a crawler
  const isCrawler = CRAWLER_USER_AGENTS.some(bot => userAgent.includes(bot));

  if (isCrawler) {
    // Fetch pre-rendered HTML from API
    const apiUrl = `https://api.vtechkitchen.com/api/seo/render?path=${encodeURIComponent(pathname)}`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': userAgent,
        },
      });

      if (response.ok) {
        const html = await response.text();
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          },
        });
      }
    } catch (error) {
      // On error, fall through to React app
      console.error('SEO render error:', error);
    }
  }

  // For regular users or on error, continue to React app
  return;
}

export const config = {
  matcher: [
    '/product/:path*',
    '/category/:path*',
    '/vendor/:path*',
    '/page/:path*',
    '/blog/:path*',
    '/products',
  ],
};
