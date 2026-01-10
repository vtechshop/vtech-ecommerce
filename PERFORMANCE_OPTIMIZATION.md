# Performance Optimization Guide

## ✅ Completed Optimizations

### 1. Login Button Auto-Hover Fixed
- Changed shine animation from continuous to hover-only
- Reduced CPU usage and eliminated confusing UX

### 2. SEO Implementation Complete
- **Product Pages**: Full SEO with Google Rich Snippets (Product schema)
- **Category Pages**: SEO with CollectionPage schema
- Meta tags, Open Graph, Twitter Cards all implemented
- Structured data for Google Search Console

### 3. Already Optimized (No Action Needed)
- ✅ Code splitting with React lazy loading
- ✅ React Query caching (5min staleTime, 10min gcTime)
- ✅ Image memoization with useMemo
- ✅ Lazy loading for product images
- ✅ Suspense boundaries for better loading states

---

## 🚀 Recommended Performance Improvements

### Priority 1: Quick Wins (Implement This Week)

#### A. Image Optimization
**Current**: Images loaded at full resolution
**Goal**: Serve optimized WebP images with lazy loading

**Implementation**:
```javascript
// apps/web/src/utils/imageOptimizer.js
export const getOptimizedImageUrl = (url, width = 800) => {
  // If using Cloudflare, add image transformation
  if (process.env.VITE_CDN_URL) {
    return `${process.env.VITE_CDN_URL}/cdn-cgi/image/width=${width},format=auto/${url}`;
  }
  return url;
};

// Usage in ProductCard.jsx
<img
  src={getOptimizedImageUrl(product.images[0], 400)}
  srcSet={`
    ${getOptimizedImageUrl(product.images[0], 400)} 400w,
    ${getOptimizedImageUrl(product.images[0], 800)} 800w
  `}
  sizes="(max-width: 640px) 400px, 800px"
  loading="lazy"
  alt={product.title}
/>
```

**Impact**: 40-60% reduction in image payload

---

#### B. Setup CDN for Static Assets
**Current**: All assets served from origin server
**Goal**: Use Cloudflare CDN for images, CSS, JS

**Steps**:
1. Sign up for Cloudflare (free tier)
2. Add domain: www.vtechkitchen.com
3. Enable Auto Minify (HTML, CSS, JS)
4. Enable Brotli compression
5. Set Cache Rules:
   - Images: Cache for 30 days
   - JS/CSS: Cache for 7 days
6. Update `.env`:
   ```bash
   CDN_URL=https://cdn.vtechkitchen.com
   ```

**Impact**: 50-70% reduction in load time for returning visitors

---

#### C. Enable Gzip/Brotli Compression
**Backend** (apps/api/src/index.js):
```javascript
const compression = require('compression');
app.use(compression());
```

**Nginx** (if using):
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

**Impact**: 60-80% reduction in transferred file size

---

#### D. Database Query Optimization
**Check Current Indexes**:
```javascript
// MongoDB shell
db.products.getIndexes()
db.categories.getIndexes()
```

**Add Missing Indexes** (if needed):
```javascript
// Already have these, but verify:
db.products.createIndex({ published: 1, createdAt: -1 })
db.products.createIndex({ slug: 1 })
db.categories.createIndex({ slug: 1 })
db.reviews.createIndex({ productId: 1, createdAt: -1 })
```

**Impact**: 50-90% faster database queries

---

### Priority 2: Advanced Optimizations (Next Month)

#### E. Implement Service Worker for Offline Support
```javascript
// apps/web/public/sw.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

**Impact**: Instant loading for cached resources

---

#### F. Prefetch Critical Product Data
```javascript
// In Category.jsx, prefetch product details on hover
const prefetchProduct = (slug) => {
  queryClient.prefetchQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/catalog/products/${slug}`)
  });
};

<ProductCard
  onMouseEnter={() => prefetchProduct(product.slug)}
/>
```

**Impact**: Instant product page loads (appears 2-3x faster)

---

#### G. Implement Virtual Scrolling for Long Lists
**For categories with 100+ products**:
```javascript
import { FixedSizeGrid } from 'react-window';

<FixedSizeGrid
  columnCount={3}
  columnWidth={300}
  height={800}
  rowCount={Math.ceil(products.length / 3)}
  rowHeight={400}
  width={1000}
>
  {ProductCard}
</FixedSizeGrid>
```

**Impact**: Handle 1000+ products without performance degradation

---

#### H. Bundle Size Optimization
```bash
# Check current bundle size
cd apps/web
npm run build
npx vite-bundle-visualizer

# Remove unused dependencies
npx depcheck

# Split vendor chunks
# In vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion'],
          'query-vendor': ['@tanstack/react-query'],
        }
      }
    }
  }
}
```

**Target**: < 500KB initial bundle (gzipped)

---

### Priority 3: Monitoring & Analytics

#### I. Setup Performance Monitoring
```javascript
// apps/web/src/utils/webVitals.js (already exists, verify it's working)
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export const initWebVitals = () => {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
};

// Send to analytics
const sendToAnalytics = ({ name, value, id }) => {
  api.post('/analytics/web-vitals', { name, value, id });
};
```

**Setup**:
1. Create analytics endpoint in backend
2. Track Core Web Vitals
3. Alert if metrics degrade

---

#### J. Google PageSpeed Insights
**Test Current Performance**:
```bash
# Desktop
https://pagespeed.web.dev/analysis?url=https://www.vtechkitchen.com

# Mobile
https://pagespeed.web.dev/analysis?url=https://www.vtechkitchen.com
```

**Target Scores**:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 95

---

## 📊 Performance Metrics Targets

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| **First Contentful Paint (FCP)** | ? | < 1.8s | High |
| **Largest Contentful Paint (LCP)** | ? | < 2.5s | High |
| **Time to Interactive (TTI)** | ? | < 3.8s | Medium |
| **Cumulative Layout Shift (CLS)** | ? | < 0.1 | Medium |
| **First Input Delay (FID)** | ? | < 100ms | Low |
| **Total Bundle Size** | ? | < 500KB | High |
| **Image Load Time** | ? | < 2s | High |
| **API Response Time** | ? | < 200ms | Medium |

---

## 🧪 Testing Checklist

### After Implementing Optimizations:

#### Performance Tests:
- [ ] Run Lighthouse audit (Chrome DevTools)
- [ ] Check Google PageSpeed Insights (mobile & desktop)
- [ ] Test on 3G connection (Chrome DevTools Network throttling)
- [ ] Verify images load with lazy loading
- [ ] Check bundle size with `npm run build`
- [ ] Test service worker offline functionality

#### Functional Tests:
- [ ] Product pages load correctly
- [ ] Category pages load correctly
- [ ] Images display properly
- [ ] Navigation works smoothly
- [ ] Search functionality works
- [ ] Add to cart works
- [ ] Checkout process works

#### Browser Compatibility:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## 🎯 Quick Action Plan

### This Week:
1. ✅ **DONE**: Fix login auto-hover
2. ✅ **DONE**: Implement SEO with Rich Snippets
3. **TODO**: Setup Cloudflare CDN
4. **TODO**: Enable compression (gzip/brotli)
5. **TODO**: Optimize images (WebP, lazy loading)

### Next Week:
6. **TODO**: Verify database indexes
7. **TODO**: Implement prefetching on hover
8. **TODO**: Run Lighthouse audit and fix issues
9. **TODO**: Setup performance monitoring

### Next Month:
10. **TODO**: Implement service worker
11. **TODO**: Add virtual scrolling for long lists
12. **TODO**: Optimize bundle size
13. **TODO**: Submit sitemap to Google Search Console

---

## 📈 Expected Results

### After Quick Wins (Priority 1):
- **Load Time**: 40-60% faster
- **Lighthouse Score**: 75-85
- **User Experience**: Noticeably faster
- **SEO**: Products appear in Google Rich Results
- **Bandwidth**: 50-70% reduction

### After Advanced Optimizations (Priority 2):
- **Load Time**: 70-85% faster than original
- **Lighthouse Score**: 90-95
- **User Experience**: Instant, app-like
- **SEO**: Top rankings for product keywords
- **Bandwidth**: 80% reduction

---

## 🔍 Debugging Slow Performance

### If pages are still slow:

1. **Check Network Tab** (Chrome DevTools):
   - Are images too large? (should be < 200KB each)
   - Are too many requests? (should be < 50)
   - Is API slow? (should be < 200ms)

2. **Check Performance Tab**:
   - Is JavaScript blocking? (remove unused code)
   - Is rendering slow? (check React DevTools)
   - Are there memory leaks? (check Heap Snapshot)

3. **Check Backend**:
   ```bash
   # Check API response time
   curl -w "@curl-format.txt" -o /dev/null -s https://api.vtechkitchen.com/catalog/products
   ```

4. **Check Database**:
   ```javascript
   // Enable MongoDB profiling
   db.setProfilingLevel(2)
   db.system.profile.find().sort({ ts: -1 }).limit(5)
   ```

---

## 📚 Resources

- [Web Vitals](https://web.dev/vitals/)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Cloudflare Performance Guide](https://www.cloudflare.com/learning/performance/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Vite Performance](https://vitejs.dev/guide/performance.html)

---

**Last Updated**: 2026-01-10
**Status**: SEO Complete ✅ | Performance Optimizations Documented ✅ | Ready for Implementation 🚀
