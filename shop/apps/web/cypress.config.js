// cypress.config.js  (ESM)
import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: '2tsu6d',
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,

    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',

    env: {
      apiUrl: 'http://localhost:3000/api',
    },

    retries: { runMode: 2, openMode: 0 },
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,

    // Add delay between tests to avoid rate limiting
    testIsolation: true,

    setupNodeEvents(on, config) {
      // Add delay between spec files to avoid rate limiting
      on('after:spec', (spec, results) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, 3000); // 3 second delay between spec files
        });
      });

      return config;
    },
  },

  component: {
    devServer: { framework: 'react', bundler: 'vite' },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
  },
});
