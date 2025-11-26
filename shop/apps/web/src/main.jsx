// FILE: apps/web/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Disabled in production
import axios from 'axios';

import App from './App';
import store from './assets/store';
import ErrorBoundary from './assets/components/common/ErrorBoundary';
import './index.css';

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
      staleTime: 5 * 60 * 1000, // 5 minutes for better caching
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      refetchOnMount: false, // Don't refetch on mount if data is fresh
    },
  },
});

// Register service worker (silently in production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <App />
            {/* DevTools removed - uncomment line below for debugging */}
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
          </QueryClientProvider>
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
