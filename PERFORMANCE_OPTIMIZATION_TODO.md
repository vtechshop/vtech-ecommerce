# Performance Optimization TODO

## 1. Lazy Loading & Code Splitting
- [ ] Convert all route components to lazy imports in App.jsx
- [ ] Add Suspense boundaries with loading fallbacks
- [ ] Create reusable Loading component

## 2. Component Memoization
- [ ] Add React.memo to ProductCard.jsx
- [ ] Add React.memo to ProductGrid.jsx
- [ ] Add React.memo to ProductSnippet.jsx
- [ ] Add useMemo for expensive computations in Home.jsx
- [ ] Add useCallback for event handlers

## 3. Query Optimizations
- [x] Increase staleTime for static data in main.jsx QueryClient
- [ ] Add prefetching for likely next pages
- [x] Optimize Home.jsx queries with better staleTime
- [ ] Add background refetching for critical data

## 4. Image Optimization
- [ ] Implement lazy loading for product images
- [ ] Add image preloading for above-the-fold content
- [ ] Create Image component with WebP support

## 5. Bundle Optimization
- [ ] Update vite.config.js for better chunk splitting
- [ ] Dynamic imports for heavy components
- [ ] Optimize vendor chunks

## 6. Caching & Service Worker
- [ ] Implement service worker for static assets
- [ ] Add runtime caching for API responses

## Admin Ad Controls
- [x] Add admin controls for managing sponsored ads on homepage
- [x] Enable/disable specific ad placements (banner, left sidebar, right sidebar)
- [x] Configure fallback content
- [x] Control ad visibility through admin settings

## Testing & Verification
- [ ] Test performance improvements with Lighthouse
- [ ] Monitor bundle size changes
- [ ] Verify no functionality regressions
