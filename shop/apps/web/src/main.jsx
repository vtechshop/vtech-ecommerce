// FILE: apps/web/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
      staleTime: 5 * 60 * 1000, // 5 minutes for better caching
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      refetchOnMount: false, // Don't refetch on mount if data is fresh
    },
  },
});

const rootElement = document.getElementById('root');

const AppWrapper = (
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <HelmetProvider>
              <App />
            </HelmetProvider>
          </QueryClientProvider>
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Use React 18+ createRoot API
const root = ReactDOM.createRoot(rootElement);
root.render(AppWrapper);
