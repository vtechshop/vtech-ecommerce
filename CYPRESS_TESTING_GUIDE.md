# Cypress E2E Testing Guide

## Overview

This guide explains how to use Cypress for end-to-end testing of the V-Tech Shop e-commerce platform. Cypress provides fast, reliable testing for anything that runs in a browser.

## Installation

### 1. Install Cypress

```bash
cd shop/apps/web
npm install cypress --save-dev
```

### 2. Verify Installation

```bash
npm run cypress:open
```

This will open the Cypress Test Runner.

## Project Structure

```
shop/apps/web/
├── cypress/
│   ├── e2e/                           # E2E test files
│   │   ├── 01-authentication.cy.js    # Authentication tests
│   │   ├── 02-shopping-cart.cy.js     # Cart functionality tests
│   │   ├── 03-checkout-process.cy.js  # Checkout flow tests
│   │   └── 04-admin-vendor-management.cy.js  # Admin tests
│   ├── fixtures/                      # Test data
│   │   ├── test-users.json           # User credentials
│   │   └── test-product.json         # Sample product data
│   ├── support/                       # Custom commands & utilities
│   │   ├── commands.js               # Custom Cypress commands
│   │   └── e2e.js                    # Support file
│   └── screenshots/                   # Auto-generated screenshots
├── cypress.config.js                  # Cypress configuration
└── package.json                       # Scripts and dependencies
```

## Running Tests

### Open Cypress Test Runner (Interactive Mode)

```bash
npm run cypress:open
# or
npm run test:e2e:open
```

This opens the Cypress GUI where you can:
- Select and run individual tests
- See real-time test execution
- Use time-travel debugging

### Run Tests in Headless Mode (CI/CD)

```bash
# Run all tests
npm run cypress:run

# Run specific test file
npx cypress run --spec "cypress/e2e/01-authentication.cy.js"

# Run in Chrome
npm run cypress:run:chrome

# Run with browser visible
npm run cypress:run:headed
```

### Run Tests for Specific Browser

```bash
# Chrome
npx cypress run --browser chrome

# Firefox
npx cypress run --browser firefox

# Edge
npx cypress run --browser edge
```

## Test Files Overview

### 1. Authentication Tests (`01-authentication.cy.js`)

Tests user authentication flows:
- ✅ User Registration
- ✅ Login with valid/invalid credentials
- ✅ Logout functionality
- ✅ Password reset flow
- ✅ Role-based access control

**Example:**
```javascript
it('should allow user to login', () => {
  cy.visit('/login');
  cy.get('input[name="email"]').type('customer@example.com');
  cy.get('input[name="password"]').type('Customer@123');
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login');
});
```

### 2. Shopping Cart Tests (`02-shopping-cart.cy.js`)

Tests cart functionality:
- ✅ Add products to cart
- ✅ Update quantities
- ✅ Remove items
- ✅ Cart persistence
- ✅ Price calculations

**Example:**
```javascript
it('should add product to cart', () => {
  cy.get('.product-card').first().within(() => {
    cy.contains('Add to Cart').click();
  });
  cy.checkToast('added to cart');
});
```

### 3. Checkout Process Tests (`03-checkout-process.cy.js`)

Tests complete checkout flow:
- ✅ Proceed from cart to checkout
- ✅ Fill shipping information
- ✅ Select payment method
- ✅ Place order
- ✅ Order confirmation

**Example:**
```javascript
it('should complete checkout', () => {
  cy.goToCart();
  cy.contains('Proceed to Checkout').click();
  cy.fillCheckoutForm();
  cy.contains('Place Order').click();
  cy.url().should('include', 'confirmation');
});
```

### 4. Admin Tests (`04-admin-vendor-management.cy.js`)

Tests admin functionality:
- ✅ View vendors list
- ✅ Approve/reject vendors
- ✅ Update vendor commissions
- ✅ Suspend vendors
- ✅ Filter and search

**Example:**
```javascript
it('should update vendor commission', () => {
  cy.loginAsAdmin();
  cy.visit('/dashboard/admin/vendors');
  cy.contains('View Details').first().click();
  cy.contains('Change Commission').click();
  cy.get('input[type="number"]').clear().type('10');
  cy.contains('Save').click();
  cy.checkToast('Commission updated');
});
```

## Custom Commands

We've created custom commands to simplify common operations:

### Authentication Commands

```javascript
// Login with credentials
cy.login('user@example.com', 'password');

// Quick login as specific role
cy.loginAsAdmin();
cy.loginAsCustomer();
cy.loginAsVendor();

// Logout
cy.logout();
```

### Shopping Commands

```javascript
// Add product to cart
cy.addToCart('Product Name');

// Navigate to cart
cy.goToCart();

// Clear all items from cart
cy.clearCart();

// Search for products
cy.searchProducts('laptop');
```

### Form Commands

```javascript
// Fill checkout form with default or custom data
cy.fillCheckoutForm({
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '1234567890'
});

// Upload file
cy.uploadFile('input[type="file"]', 'test-image.jpg');
```

### Verification Commands

```javascript
// Check toast notification
cy.checkToast('Success message', 'success');

// Wait for API request
cy.waitForAPI('/api/products');

// Check if element is in viewport
cy.get('.element').isInViewport();
```

### Admin Commands

```javascript
// Set vendor commission via API
cy.setVendorCommission('vendorId123', 15);

// Create test product via API
cy.createProduct({
  title: 'Test Product',
  price: 99.99
});
```

## Best Practices

### 1. Use Data Attributes

Add `data-cy` attributes to important elements:

```html
<button data-cy="add-to-cart">Add to Cart</button>
<div data-cy="product-card">...</div>
```

Then select them in tests:

```javascript
cy.get('[data-cy="add-to-cart"]').click();
```

### 2. Use Aliases for Reusability

```javascript
cy.get('.product-list').as('products');
cy.get('@products').should('have.length', 10);
```

### 3. Keep Tests Independent

Each test should be able to run independently:

```javascript
beforeEach(() => {
  cy.clearCart(); // Reset state
  cy.visit('/');
});
```

### 4. Use Fixtures for Test Data

```javascript
cy.fixture('test-product').then((product) => {
  cy.createProduct(product);
});
```

### 5. Handle Async Operations

```javascript
// Wait for API call
cy.intercept('POST', '/api/cart').as('addToCart');
cy.contains('Add to Cart').click();
cy.wait('@addToCart');
```

### 6. Test Real User Flows

Focus on complete user journeys:

```javascript
describe('Complete Purchase Flow', () => {
  it('should allow user to buy a product', () => {
    cy.login(...);
    cy.searchProducts('laptop');
    cy.addToCart('MacBook Pro');
    cy.goToCart();
    cy.contains('Checkout').click();
    cy.fillCheckoutForm();
    cy.contains('Place Order').click();
    cy.url().should('include', 'success');
  });
});
```

## Configuration

### Environment Variables

Edit `cypress.config.js` to set environment variables:

```javascript
env: {
  apiUrl: 'http://localhost:3000/api',
  adminEmail: 'admin@example.com',
  adminPassword: 'Admin@123'
}
```

Access in tests:

```javascript
cy.visit(Cypress.env('apiUrl') + '/products');
```

### Timeouts

Adjust timeouts in `cypress.config.js`:

```javascript
e2e: {
  defaultCommandTimeout: 10000, // 10 seconds
  pageLoadTimeout: 30000, // 30 seconds
  requestTimeout: 10000 // 10 seconds
}
```

### Viewport Sizes

Test different screen sizes:

```javascript
// In cypress.config.js
viewportWidth: 1280,
viewportHeight: 720

// Or in individual tests
cy.viewport(375, 667); // Mobile
cy.viewport(1920, 1080); // Desktop
```

## Debugging Tests

### 1. Use `.debug()`

```javascript
cy.get('.product').debug().click();
```

### 2. Use `.pause()`

```javascript
cy.get('.product').pause().click();
```

### 3. Screenshots

Cypress automatically takes screenshots on failure. Manually take screenshots:

```javascript
cy.screenshot('my-screenshot');
```

### 4. Console Logs

```javascript
cy.get('.price').then($price => {
  console.log('Price:', $price.text());
});
```

### 5. Time Travel

Use the Cypress Test Runner to click on commands and see the application state at that point.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: |
          cd shop/apps/web
          npm install
      - name: Start application
        run: |
          cd shop/apps/web
          npm run dev &
          npm run preview &
      - name: Run Cypress tests
        run: |
          cd shop/apps/web
          npm run cypress:run
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v2
        with:
          name: cypress-screenshots
          path: shop/apps/web/cypress/screenshots
```

## Test Data Setup

### Create Test Users

Before running tests, ensure these users exist in your database:

```json
{
  "admin": {
    "email": "admin@example.com",
    "password": "Admin@123",
    "role": "admin"
  },
  "vendor": {
    "email": "vendor@example.com",
    "password": "Vendor@123",
    "role": "vendor"
  },
  "customer": {
    "email": "customer@example.com",
    "password": "Customer@123",
    "role": "customer"
  }
}
```

### Seed Database (Optional)

Create a seed script to populate test data:

```bash
npm run seed:test
```

## Common Issues & Solutions

### Issue 1: Tests fail due to timing

**Solution:** Use proper waits

```javascript
// ❌ Bad
cy.get('.loading').should('not.exist');
cy.get('.data').should('be.visible');

// ✅ Good
cy.intercept('/api/data').as('getData');
cy.wait('@getData');
cy.get('.data').should('be.visible');
```

### Issue 2: Element not found

**Solution:** Use better selectors

```javascript
// ❌ Bad
cy.get('.btn').click();

// ✅ Good
cy.get('[data-cy="submit-button"]').click();
```

### Issue 3: Flaky tests

**Solution:** Add retries and proper assertions

```javascript
// In cypress.config.js
retries: {
  runMode: 2,
  openMode: 0
}
```

## Writing New Tests

### Template for New Test File

```javascript
/// <reference types="cypress" />

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    cy.visit('/');
  });

  describe('Sub-feature', () => {
    it('should do something', () => {
      // Arrange
      cy.login('user@example.com', 'password');

      // Act
      cy.get('[data-cy="button"]').click();

      // Assert
      cy.get('[data-cy="result"]').should('contain', 'Success');
    });
  });

  after(() => {
    // Cleanup after all tests
  });
});
```

## Test Coverage Goals

Aim to test:
- ✅ Happy paths (successful flows)
- ✅ Error handling
- ✅ Edge cases
- ✅ User permissions
- ✅ Form validations
- ✅ API integrations
- ✅ Responsive design

## Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [API Reference](https://docs.cypress.io/api/table-of-contents)
- [Cypress Examples](https://github.com/cypress-io/cypress-example-recipes)

## Support

For issues or questions:
- Check Cypress documentation
- Review existing test files for examples
- Check console and network logs
- Use Cypress debugger tools
