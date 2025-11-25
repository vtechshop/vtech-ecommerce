// FILE: apps/web/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // ✅ Alias @ -> src/assets (matches your codebase)
      '@': path.resolve(__dirname, './src/assets'),
    },
    // Fix for useSyncExternalStore error - ensure single React instance
    dedupe: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Improved code splitting strategy
        manualChunks: (id) => {
          // Core React libraries + Redux (must be together to share React instance)
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') ||
              id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
            return 'vendor-react';
          }
          // Data fetching
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          // Charts (heavy library)
          if (id.includes('recharts')) {
            return 'vendor-charts';
          }
          // Stripe
          if (id.includes('@stripe')) {
            return 'vendor-stripe';
          }
          // UI libraries
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        },
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          let extType = info[info.length - 1];
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            extType = 'images';
          } else if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            extType = 'fonts';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },
  define: {
    __CDN_URL__: JSON.stringify(process.env.VITE_CDN_URL || ''),
  },
});
