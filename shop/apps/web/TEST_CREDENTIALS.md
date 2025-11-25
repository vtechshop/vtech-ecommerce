# Test User Credentials

## Important: Correct Test Credentials

All Playwright tests have been updated to use the actual seeded user credentials from the database.

### Customer Account
```
Email: demo@example.com
Password: Password123
Role: customer
```

### Admin Account
```
Email: admin@example.com
Password: Password123
Role: admin
```

### Vendor Account (if seeded)
```
Email: vendor@example.com
Password: Password123
Role: vendor
```

## How to Seed Users

If you need to create these test users in your database, run:

```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\api
node scripts/seedUser.js
```

This will create:
- **Admin user**: `admin@example.com` with password `Password123`
- **Demo customer**: `demo@example.com` with password `Password123`

## Test Status

✅ **Authentication test passed!**

The login test successfully authenticated with:
- Email: `demo@example.com`
- Password: `Password123`
- Test completed in: 3.5 seconds
- Status: PASSED

## Files Updated

All test files have been updated with correct credentials:

1. [tests/01-authentication.spec.js](tests/01-authentication.spec.js)
   - `loginAsCustomer()`: Uses `demo@example.com` / `Password123`
   - `loginAsAdmin()`: Uses `admin@example.com` / `Password123`

2. [tests/02-shopping-cart.spec.js](tests/02-shopping-cart.spec.js)
   - `loginAsCustomer()`: Uses `demo@example.com` / `Password123`

3. [tests/03-checkout-process.spec.js](tests/03-checkout-process.spec.js)
   - `loginAsCustomer()`: Uses `demo@example.com` / `Password123`

4. [tests/04-admin-vendor-management.spec.js](tests/04-admin-vendor-management.spec.js)
   - `loginAsAdmin()`: Uses `admin@example.com` / `Password123`

## API Configuration

- **Backend URL**: `http://localhost:8080`
- **API Base URL**: `http://localhost:8080/api`
- **Frontend URL**: `http://localhost:5173`

## Running Tests

Now that credentials are fixed, you can run all tests:

```bash
# Run all tests
npm run test:playwright

# Run in UI mode (recommended)
npm run test:playwright:ui

# Run specific test
npx playwright test tests/01-authentication.spec.js
```

## Test Execution Log

```
✅ Authentication Flow › User Login › should allow user to login with valid credentials
   - Duration: 3.5s
   - Browser: Chromium
   - Result: PASSED
   - User: demo@example.com
   - Redirected successfully after login
```

## Next Steps

1. Run full test suite to verify all tests pass
2. Check for any failing tests and fix them
3. Add more test coverage as needed

---

**Last Updated**: Test credentials verified and all test files updated
**Status**: Ready for full test execution
