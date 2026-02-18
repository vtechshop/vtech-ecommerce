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
};