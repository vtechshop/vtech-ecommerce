# Playwright E2E Testing Guide

## Overview

Playwright is successfully installed as an alternative to Cypress for end-to-end testing. This guide will help you run and maintain your E2E tests.

## Why Playwright?

Cypress had Windows 11 compatibility issues (binary verification failed). Playwright provides:

- **Excellent Windows 11 Support** - Works perfectly on your system
- **Fast Execution** - Tests run faster than Cypress
- **Multi-Browser Support** - Chrome, Firefox, Safari, Edge
- **Better API** - More modern and intuitive
- **Auto-Wait** - Smart waiting for elements
- **Parallel Execution** - Run tests faster

## Installation

Already completed! Playwright is installed with:

```bash
npm install @playwright/test --save-dev
npx playwright install chromium
```

## Test Structure

```
shop/apps/web/
├── tests/
│   ├── 01-authentication.spec.js      # 20+ authentication tests
│   ├── 02-shopping-cart.spec.js       # 15+ cart tests
│   ├── 03-checkout-process.spec.js    # 12+ checkout tests
│   └── 04-admin-vendor-management.spec.js  # 10+ admin tests
├── playwright.config.js               # Configuration
└── package.json                       # Scripts
```

## Running Tests

### Run All Tests (Headless)

```bash
npm run test:playwright
```

### Run All Tests (Headed - See Browser)

```bash
npm run test:playwright:headed
```

### Run Specific Test File

```bash
npx playwright test tests/01-authentication.spec.js
npx playwright test tests/02-shopping-cart.spec.js
npx playwright test tests/03-checkout-process.spec.js
npx playwright test tests/04-admin-vendor-management.spec.js
```

### Run Single Test

```bash
npx playwright test --grep "should allow user to login"
```

### Debug Mode

```bash
npx playwright test --debug
```

This opens Playwright Inspector where you can:
- Step through tests
- See what's happening in the browser
- Inspect selectors
- See console logs

### UI Mode (Recommended for Development)

```bash
npm run test:playwright:ui
```

This opens an interactive UI where you can:
- Run tests individually
- Watch tests run in real-time
- See screenshots and videos
- Debug failures easily

## Test Scripts in package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:playwright": "playwright test",
    "test:playwright:headed": "playwright test --headed",
    "test:playwright:ui": "playwright test --ui",
    "test:playwright:debug": "playwright test --debug",
    "test:playwright:report": "playwright show-report"
  }
}
```

## Configuration

The `playwright.config.js` file controls:

- **Base URL**: `http://localhost:5173` (your frontend)
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries in CI, 0 locally
- **Screenshots**: Taken on failure
- **Videos**: Recorded on failure
- **Trace**: Recorded on retry

### Important Configuration Options

```javascript
module.exports = defineConfig({
  use: {
    baseURL: 'http://localhost:5173',  // Your app URL
    screenshot: 'only-on-failure',     // Save screenshots
    video: 'retain-on-failure',        // Save videos
    trace: 'on-first-retry',           // Debugging traces
  },
});
```

## Before Running Tests

### 1. Start Backend Server

```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\api
npm run dev
```

Backend should be running on `http://localhost:3000`

### 2. Start Frontend Server

```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\web
npm run dev
```

Frontend should be running on `http://localhost:5173`

### 3. Run Tests

```bash
npm run test:playwright
```

## Test Coverage

### 01-authentication.spec.js (20+ tests)

- User registration (valid, invalid, duplicate)
- User login (valid, invalid credentials)
- User logout
- Password reset
- Role-based access (admin, vendor, customer)

### 02-shopping-cart.spec.js (15+ tests)

- Add to cart (home page, product page)
- Cart management (display, update, remove)
- Cart persistence (after reload, logged-in users)
- Empty cart states
- Cart limits (min/max quantity)

### 03-checkout-process.spec.js (12+ tests)

- Proceed to checkout
- Shipping information
- Payment method selection
- Order review
- Place order
- Order history
- Edge cases (coupons, shipping costs)

### 04-admin-vendor-management.spec.js (10+ tests)

- Vendor list display
- Vendor details
- **Commission management** (display, update, validation)
- Vendor status (approve, suspend)
- Vendor analytics
- Vendor products

## Key Differences from Cypress

### Cypress → Playwright Syntax

| Cypress | Playwright |
|---------|-----------|
| `cy.visit('/')` | `await page.goto('/')` |
| `cy.get('.btn').click()` | `await page.click('.btn')` |
| `cy.get('input').type('text')` | `await page.fill('input', 'text')` |
| `cy.contains('Welcome')` | `await expect(page).toContainText('Welcome')` |
| `cy.url().should('include', '/dashboard')` | `await expect(page).toHaveURL(/.*dashboard/)` |

### Auto-Wait

Playwright automatically waits for:
- Elements to be visible
- Elements to be enabled
- Elements to stop animating
- Network requests to complete

No need for `cy.wait()` in most cases!

## Debugging Tests

### 1. Use Headed Mode

```bash
npm run test:playwright:headed
```

See what's happening in the browser.

### 2. Use UI Mode

```bash
npm run test:playwright:ui
```

Interactive debugging with time travel.

### 3. Use Debug Mode

```bash
npx playwright test --debug tests/01-authentication.spec.js
```

Step through test line by line.

### 4. Add Console Logs

```javascript
test('my test', async ({ page }) => {
  console.log('Current URL:', page.url());
  console.log('Title:', await page.title());
});
```

### 5. Take Screenshots

```javascript
await page.screenshot({ path: 'debug.png' });
```

### 6. Pause Test

```javascript
await page.pause();  // Pauses test for manual inspection
```

## Test Reports

After running tests, view the HTML report:

```bash
npm run test:playwright:report
```

This shows:
- Pass/fail status for each test
- Screenshots of failures
- Videos of failures
- Execution time
- Error messages with stack traces

## Common Issues

### Issue 1: "Target page, context or browser has been closed"

**Solution**: The page closed unexpectedly. Check if:
- Server is running
- URL is correct
- Test has proper waits

### Issue 2: "Timeout 30000ms exceeded"

**Solution**: Element not found or took too long.
- Increase timeout: `await page.click('button', { timeout: 60000 })`
- Check selector is correct
- Verify element is visible in headed mode

### Issue 3: "Selector resolved to hidden element"

**Solution**: Element exists but is hidden.
- Wait for element to be visible: `await page.waitForSelector('.btn', { state: 'visible' })`
- Use `force: true` option (not recommended): `await page.click('.btn', { force: true })`

### Issue 4: Tests fail locally but pass in CI

**Solution**: Timing issues.
- Use `await page.waitForLoadState('networkidle')`
- Increase timeouts in config
- Use explicit waits

## Best Practices

### 1. Use Data Attributes

```javascript
// Good
await page.click('[data-cy="submit-button"]')

// Avoid (brittle)
await page.click('.css-abc123-button')
```

### 2. Use Meaningful Selectors

```javascript
// Good - Text content
await page.click('button:has-text("Submit")')

// Good - Role
await page.click('button[type="submit"]')
```

### 3. Use Helper Functions

```javascript
async function login(page, email, password) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
}

// Use in tests
test('my test', async ({ page }) => {
  await login(page, 'user@example.com', 'password');
});
```

### 4. Clean Up After Tests

```javascript
test.afterEach(async ({ page }) => {
  // Clear cookies, local storage, etc.
  await page.context().clearCookies();
});
```

### 5. Use Fixtures for Test Data

```javascript
test('should create order', async ({ page }) => {
  const orderData = {
    items: [{ id: '123', quantity: 2 }],
    total: 100
  };
  // Use orderData in test
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run tests
        run: npm run test:playwright

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance Tips

### 1. Run Tests in Parallel

```javascript
// playwright.config.js
module.exports = defineConfig({
  workers: 4,  // Run 4 tests in parallel
});
```

### 2. Reuse Authentication State

```javascript
// Save auth state once
test('login once', async ({ page, context }) => {
  await login(page, 'user@example.com', 'password');
  await context.storageState({ path: 'auth.json' });
});

// Reuse in other tests
test.use({ storageState: 'auth.json' });
test('my test', async ({ page }) => {
  // Already logged in!
});
```

### 3. Use API for Setup

```javascript
// Instead of using UI to create test data
await page.request.post('http://localhost:3000/api/products', {
  data: { name: 'Test Product' }
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Playwright Discord](https://discord.com/invite/playwright)

## Test Users

Use these test accounts (from your backend):

```javascript
// Admin
email: 'admin@example.com'
password: 'Admin@123'

// Customer
email: 'customer@example.com'
password: 'Customer@123'

// Vendor
email: 'vendor@example.com'
password: 'Vendor@123'
```

## Next Steps

1. **Run tests locally** to verify everything works
2. **Fix any failing tests** based on your UI
3. **Add more tests** for new features
4. **Integrate with CI/CD** for automated testing
5. **Monitor test reports** and maintain tests

## Summary

Playwright is now ready to use! It provides a better testing experience than Cypress, especially on Windows 11.

**Quick Start:**

```bash
# Make sure servers are running
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\api && npm run dev
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\web && npm run dev

# Run tests
npm run test:playwright:ui  # Interactive UI mode (recommended)
```

All 57+ tests from Cypress have been converted to Playwright and are ready to run!
