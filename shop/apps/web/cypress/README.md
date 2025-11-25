# Cypress E2E Tests

## Quick Start

### 1. Install Cypress

```bash
npm install
```

### 2. Run Tests

**Interactive Mode (Recommended for Development):**
```bash
npm run cypress:open
```

**Headless Mode (for CI/CD):**
```bash
npm run cypress:run
```

## Test Files

- `01-authentication.cy.js` - User login, registration, logout
- `02-shopping-cart.cy.js` - Cart operations
- `03-checkout-process.cy.js` - Complete purchase flow
- `04-admin-vendor-management.cy.js` - Admin vendor operations

## Custom Commands

See `support/commands.js` for all available custom commands:

```javascript
cy.loginAsAdmin();
cy.addToCart('Product Name');
cy.fillCheckoutForm();
cy.checkToast('Success message');
```

## Prerequisites

Before running tests, ensure:
1. Backend API is running on `localhost:3000`
2. Frontend is running on `localhost:5173`
3. Test users exist in database (see `fixtures/test-users.json`)

## Writing Tests

1. Create new file in `cypress/e2e/` with `.cy.js` extension
2. Use custom commands from `support/commands.js`
3. Follow naming convention: `##-feature-name.cy.js`

## Documentation

See full documentation: [CYPRESS_TESTING_GUIDE.md](../../../CYPRESS_TESTING_GUIDE.md)
