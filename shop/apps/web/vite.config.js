// FILE: apps/web/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Alias for your src/assets folder
      '@': path.resolve(__dirname, './src/assets'),
    },
    // Ensure single instance of React everywhere
    dedupe: ['react', 'react-dom'],
  },

  optimizeDeps: {
    include: ['react', 'react-dom'],
  },

  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 500,

    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },

    cssCodeSplit: true,
    cssMinify: true,

    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // Split vendor chunks for better caching
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // React core - keep together
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'react-vendor';
            }
            // Router
            if (id.includes('react-router')) {
              return 'router';
            }
            // State management
            if (id.includes('redux') || id.includes('@reduxjs')) {
              return 'redux';
            }
            // React Query
            if (id.includes('@tanstack')) {
              return 'query';
            }
            // Icons (used in Header/SearchAutocomplete - initial bundle)
            if (id.includes('lucide')) {
              return 'icons';
            }
            // Animation library (lazy-loaded - not needed for initial render)
            if (id.includes('framer-motion')) {
              return 'motion';
            }
            // Socket.io — lazy via NotificationBell (only for logged-in users)
            if (id.includes('socket.io') || id.includes('engine.io') || id.includes('@socket.io')) {
              return 'socket';
            }
          }
        },
      },
    },
  },

  define: {
    __CDN_URL__: JSON.stringify(process.env.VITE_CDN_URL || ''),
  },
});
