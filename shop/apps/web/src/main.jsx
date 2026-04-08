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
      staleTime: 5 * 60 * 1000,        // 5 min — data stays fresh, no re-fetch
      gcTime: 24 * 60 * 60 * 1000,     // 24 hours in-memory (persister handles disk)
      refetchOnMount: false,
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
              maxAge: 24 * 60 * 60 * 1000, // 24 hours cache on disk
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
