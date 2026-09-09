// FILE: apps/api/jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/seed/**',
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/utils/**/*.test.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/integration/setup.js'],
  testTimeout: 30000, // Increased for CI environments
  // expo-server-sdk ships as native ESM (uses `import` internally) which Jest's
  // default CJS transform cannot parse.  Map it to a minimal CJS stub so that
  // any test that transitively imports expoPushService can still load the app.
  moduleNameMapper: {
    '^expo-server-sdk$': '<rootDir>/src/tests/__mocks__/expo-server-sdk.js',
  },
};