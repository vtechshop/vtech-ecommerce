# Test Coverage Setup & Improvement Guide

## Current Status

**Tests Found**:
- ✅ Integration tests: `apps/api/src/tests/integration/`
- ✅ Unit tests: `apps/api/src/tests/unit/`
- ✅ Cypress E2E tests: `apps/web/cypress/`
- ✅ Playwright E2E tests: `apps/web/tests/`

**Coverage**: Unknown - needs measurement

**Goal**: Achieve 80%+ code coverage on critical paths

---

## 1. Backend Test Coverage Setup (Node.js/Jest)

### Install Coverage Tools

```bash
cd apps/api
npm install --save-dev jest @types/jest supertest mongodb-memory-server
npm install --save-dev nyc  # For Istanbul coverage reporting
```

### Update package.json

**File**: `apps/api/package.json`

Add test scripts:
```json
{
  "scripts": {
    "test": "cross-env NODE_ENV=test jest",
    "test:watch": "cross-env NODE_ENV=test jest --watch",
    "test:coverage": "cross-env NODE_ENV=test jest --coverage",
    "test:unit": "cross-env NODE_ENV=test jest --testPathPattern=tests/unit",
    "test:integration": "cross-env NODE_ENV=test jest --testPathPattern=tests/integration",
    "test:ci": "cross-env NODE_ENV=test jest --coverage --ci --maxWorkers=2"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "src/**/*.js",
      "!src/tests/**",
      "!src/scripts/**",
      "!src/seed/**",
      "!src/server.js",
      "!src/app.js"
    ],
    "coverageThresholds": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    },
    "testMatch": [
      "**/tests/**/*.test.js",
      "**/tests/**/*.spec.js"
    ],
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"],
    "testTimeout": 30000
  }
}
```

### Create Test Setup File

**File**: `apps/api/src/tests/setup.js`

```javascript
// Global test setup
const { connectDB, disconnectDB } = require('../config/db');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  // Use in-memory MongoDB for tests
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await connectDB(mongoUri);
});

afterAll(async () => {
  await disconnectDB();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean up database after each test
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }
});
```

---

## 2. Frontend Test Coverage Setup (React/Vitest)

### Install Coverage Tools

```bash
cd apps/web
npm install --save-dev @vitest/coverage-v8
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev jsdom
```

### Update vite.config.js

**File**: `apps/web/vite.config.js`

Add test configuration:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // ... existing config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.config.js',
        '**/dist/**',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

### Update package.json

**File**: `apps/web/package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:ci": "vitest run --coverage --reporter=json --reporter=text"
  }
}
```

### Create Test Setup File

**File**: `apps/web/src/tests/setup.js`

```javascript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};
```

---

## 3. E2E Test Coverage (Playwright)

### Current Playwright Tests
Located in: `apps/web/tests/`

### Run with Coverage

Update playwright.config.js to include coverage:

```javascript
export default defineConfig({
  use: {
    // ... existing config
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
});
```

**Run tests**:
```bash
cd apps/web
npm run test:playwright
npx playwright test --reporter=html
```

---

## 4. Running Tests & Coverage Reports

### Backend Coverage

```bash
cd apps/api

# Run all tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Watch mode for development
npm run test:watch
```

**Coverage Report Location**: `apps/api/coverage/index.html`

### Frontend Coverage

```bash
cd apps/web

# Run all tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

**Coverage Report Location**: `apps/web/coverage/index.html`

### E2E Tests

```bash
cd apps/web

# Run Playwright tests
npm run test:playwright

# Run Cypress tests
npm run test:e2e
```

---

## 5. Critical Test Coverage Priorities

### Backend (80%+ Coverage Target)

**High Priority** (Must have tests):
1. ✅ Authentication (`controllers/authController.js`)
   - Login, register, token refresh
   - Password reset flow
   - Email verification
2. ✅ Checkout (`controllers/checkoutController.js`)
   - Cart validation
   - Payment processing
   - Order creation
3. ✅ Payment (`controllers/paymentController.js`)
   - Stripe integration
   - Razorpay integration
   - Webhook handling
4. ⏳ Authorization middleware (`middleware/auth.js`)
   - Role verification
   - Token validation
5. ⏳ CSRF protection (`middleware/csrf.js`)
6. ⏳ Input sanitization (`middleware/sanitize.js`)

**Medium Priority**:
1. ⏳ Product catalog (`controllers/catalogController.js`)
2. ⏳ Cart operations (`controllers/cartController.js`)
3. ⏳ Order management (`controllers/orderController.js`)
4. ⏳ Vendor operations (`controllers/vendorController.js`)
5. ⏳ Affiliate operations (`controllers/affiliateController.js`)

**Low Priority**:
1. Admin operations
2. CMS/Blog
3. Analytics
4. Recommendations

### Frontend (70%+ Coverage Target)

**High Priority**:
1. ⏳ Authentication components (`hooks/useAuth.js`)
2. ⏳ Cart functionality (`store/slices/cartSlice.js`)
3. ⏳ Checkout wizard (`pages/Checkout.jsx`)
4. ⏳ Form validation utilities (`utils/validation.js`)
5. ⏳ API client (`utils/api.js`)

**Medium Priority**:
1. ⏳ Product components
2. ⏳ Search functionality
3. ⏳ Dashboard components
4. ⏳ Common UI components

**Low Priority**:
1. Layout components
2. Info pages
3. Blog components

---

## 6. Example Test Cases

### Backend Controller Test Example

**File**: `apps/api/src/tests/unit/controllers/authController.test.js`

```javascript
const request = require('supertest');
const app = require('../../../app');
const User = require('../../../models/User');

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);

      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.name).toBe(userData.name);
    });

    it('should not register with existing email', async () => {
      const userData = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'Password123!',
      };

      // Create existing user
      await User.create(userData);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });

    it('should validate password strength', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123', // Weak password
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
```

### Frontend Component Test Example

**File**: `apps/web/src/tests/components/Button.test.jsx`

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from '@/components/common/Button';

describe('Button Component', () => {
  it('renders with children', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<Button loading>Click Me</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('disabled');
  });

  it('applies variant classes', () => {
    const { container } = render(<Button variant="primary">Click Me</Button>);
    expect(container.firstChild).toHaveClass('bg-primary-600');
  });
});
```

---

## 7. CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd apps/api && npm ci
      - name: Run tests with coverage
        run: cd apps/api && npm run test:ci
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/api/coverage/lcov.info
          flags: backend

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd apps/web && npm ci
      - name: Run tests with coverage
        run: cd apps/web && npm run test:ci
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/web/coverage/lcov.info
          flags: frontend

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd apps/web && npm ci
      - name: Install Playwright browsers
        run: cd apps/web && npx playwright install --with-deps
      - name: Run Playwright tests
        run: cd apps/web && npm run test:playwright
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: apps/web/playwright-report/
```

---

## 8. Coverage Badges

Add to README.md:

```markdown
[![Backend Coverage](https://codecov.io/gh/your-org/your-repo/branch/main/graph/badge.svg?flag=backend)](https://codecov.io/gh/your-org/your-repo)
[![Frontend Coverage](https://codecov.io/gh/your-org/your-repo/branch/main/graph/badge.svg?flag=frontend)](https://codecov.io/gh/your-org/your-repo)
```

---

## 9. Next Steps

### Week 1
1. ✅ Set up coverage tools (Jest, Vitest)
2. ⏳ Run initial coverage reports
3. ⏳ Identify critical gaps (< 70% coverage)

### Week 2
1. ⏳ Write tests for authentication
2. ⏳ Write tests for checkout/payment
3. ⏳ Write tests for security middleware

### Week 3
1. ⏳ Write tests for cart operations
2. ⏳ Write tests for product catalog
3. ⏳ Write component tests for critical UI

### Week 4
1. ⏳ Achieve 80% coverage on critical paths
2. ⏳ Set up CI/CD test automation
3. ⏳ Add coverage badges

---

## Status Summary

- ✅ Test files exist (integration, unit, E2E)
- ⏳ Coverage measurement not set up
- ⏳ Coverage thresholds not enforced
- ⏳ CI/CD integration pending
- ⏳ Need to increase coverage to 80%+

**Goal**: 80%+ coverage on backend critical paths, 70%+ on frontend
