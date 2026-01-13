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
      // ✅ Alias @ -> src/assets (matches your codebase)
      '@': path.resolve(__dirname, './src/assets'),
      // Force single React instance
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    // Fix for useSyncExternalStore error - ensure single React instance
    dedupe: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit', '@tanstack/react-query'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit', '@tanstack/react-query'],
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
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
        passes: 2, // Run compression twice for better results
      },
      mangle: {
        safari10: true, // Fix Safari 10 issues
      },
      format: {
        comments: false, // Remove all comments
      },
    },
    cssCodeSplit: true, // Enable CSS code splitting
    cssMinify: true, // Minify CSS
    rollupOptions: {
      output: {
        // Smart chunking for better performance
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Separate large libraries into their own chunks
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('recharts') || id.includes('framer-motion')) {
              return 'charts-vendor';
            }
            if (id.includes('@tanstack')) {
              return 'query-vendor';
            }
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
  define: {
    __CDN_URL__: JSON.stringify(process.env.VITE_CDN_URL || ''),
  },
});
