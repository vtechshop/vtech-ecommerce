// FILE: apps/web/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { HelmetProvider } from 'react-helmet-async';
import axios from 'axios';

import App from './App';
import store from './assets/store';
import ErrorBoundary from './assets/components/common/ErrorBoundary';
import { normalizeImageUrl } from './assets/utils/placeholders';
import './index.css';
import './assets/styles/animations.css';

// ---- Axios defaults (so every request uses the API URL + sends cookies if needed) ----
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
axios.defaults.withCredentials = true;
// -------------------------------------------------------------------------------------

// Create a single QueryClient instance for the whole app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,             // 1 min — show cached, refetch after 1 min
      gcTime: 30 * 60 * 1000,           // 30 min in-memory
      refetchOnMount: true,             // refetch stale data when component mounts
    },
  },
});

// Persist cache to localStorage — on refresh, stale data shows instantly
// while fresh data loads in background (amazon-like experience)
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'vtech-query-cache',
  throttleTime: 1000,
});

// On repeat visits: read the persisted banner cache from localStorage before React renders.
// This lets prefetchQuery skip the network (data already in QueryClient) and allows us to
// inject the hero image preload link BEFORE React even starts, shaving ~300-500ms from LCP.
const BANNER_STALE_MS = 2 * 60 * 1000;
const _injectBannerPreload = (banners) => {
  if (!banners?.length) return;
  const raw = banners[0].image || banners[0].imageUrl;
  const w = window.innerWidth < 768 ? 800 : 1200;
  const url = normalizeImageUrl(raw, { width: w, quality: 'auto', format: 'auto' });
  if (url && !document.querySelector('link[rel="preload"][as="image"]')) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.fetchPriority = 'high';
    document.head.appendChild(link);
  }
};

try {
  const raw = localStorage.getItem('vtech-query-cache');
  if (raw) {
    const persisted = JSON.parse(raw);
    const entry = persisted?.clientState?.queries?.find(
      q => Array.isArray(q.queryKey) && q.queryKey[0] === 'hero-banners'
    );
    if (entry?.state?.data) {
      const age = Date.now() - (entry.state.dataUpdatedAt || 0);
      if (age < BANNER_STALE_MS) {
        // Cache is fresh — populate QueryClient so the prefetch below is a no-op
        queryClient.setQueryData(['hero-banners'], entry.state.data);
        // Inject preload immediately — before React renders
        _injectBannerPreload(entry.state.data);
      }
    }
  }
} catch (_) {}

// Prefetch hero banners — on fresh visits this starts the API call before React renders.
// On repeat visits with warm cache the setQueryData above makes this a no-op.
// Also injects a <link rel="preload"> when the API responds, overlapping image download
// with any remaining React render time.
queryClient.prefetchQuery({
  queryKey: ['hero-banners'],
  queryFn: () =>
    axios.get('/banners?platform=website').then(r => {
      const banners = r.data.data || [];
      _injectBannerPreload(banners);
      return banners;
    }),
  staleTime: BANNER_STALE_MS,
});

const rootElement = document.getElementById('root');

const AppWrapper = (
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister,
              maxAge: 30 * 60 * 1000, // 30 min cache on disk
              dehydrateOptions: {
                shouldDehydrateQuery: (query) => {
                  // Only persist public/non-sensitive queries
                  const key = query.queryKey[0];
                  const skipKeys = ['cart', 'orders', 'user', 'notifications', 'admin', 'vendor', 'affiliate'];
                  return !skipKeys.some(k => String(key).toLowerCase().includes(k));
                },
              },
            }}
          >
            <HelmetProvider>
              <App />
            </HelmetProvider>
          </PersistQueryClientProvider>
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Use React 18+ createRoot API
const root = ReactDOM.createRoot(rootElement);
root.render(AppWrapper);
