import { test, expect } from '@playwright/test';
import { initPlaywrightFlag, dismissCookieBanner, login, loginAsCustomer, loginAsAdmin, loginAsVendor } from './helpers.js';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await initPlaywrightFlag(page);
    await page.goto('/');
    await dismissCookieBanner(page);
  });

  test.describe('User Registration', () => {
    test('should allow new user to register', async ({ page }) => {
      const timestamp = Date.now();
      const testUser = {
        name: 'Test User',
        email: `testuser${timestamp}@example.com`,
        password: 'TestPass@123'
      };

      await page.goto('/register');
      await dismissCookieBanner(page);

      // Fill registration form
      await page.fill('input[name="name"]', testUser.name);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);

      // Check the terms checkbox
      await page.check('input#terms');

      // Submit form
      await page.click('button[type="submit"]:has-text("Create Account")');

      // Verify redirection (user will be redirected to home or dashboard)
      await expect(page).not.toHaveURL(/.*register/, { timeout: 10000 });
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      await page.goto('/register');
      await dismissCookieBanner(page);

      // Try to submit empty form - browser validation will prevent submission
      // So we check that required fields have the required attribute
      const nameInput = page.locator('input[name="name"]');
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');

      await expect(nameInput).toHaveAttribute('required', '');
      await expect(emailInput).toHaveAttribute('required', '');
      await expect(passwordInput).toHaveAttribute('required', '');
    });

    test('should not allow registration with existing email', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="name"]', 'Duplicate User');
      await page.fill('input[name="email"]', 'admin@example.com'); // Existing email
      await page.fill('input[name="password"]', 'TestPass@123');
      await page.fill('input[name="confirmPassword"]', 'TestPass@123');
      await page.check('input#terms');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/already exists|already registered/i')).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should allow user to login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'customer@example.com');
      await page.fill('input[name="password"]', 'Customer@123');

      // Wait for navigation after submit
      await page.click('button[type="submit"]:has-text("Sign in")');

      // Should redirect to dashboard or home
      await expect(page).not.toHaveURL(/.*login/, { timeout: 10000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'wrong@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/invalid|incorrect|failed/i')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/login');

      // Check that fields have required attribute (browser validation will prevent submission)
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');

      await expect(emailInput).toHaveAttribute('required', '');
      await expect(passwordInput).toHaveAttribute('required', '');
    });
  });

  test.describe('User Logout', () => {
    test('should allow user to logout', async ({ page }) => {
      await loginAsCustomer(page);
      await page.goto('/');

      // Click user menu
      await page.click('[data-cy="user-menu"], button:has-text("user"), button:has-text("account"), button:has-text("menu")');

      // Click logout
      await page.click('text=/logout|sign out/i');

      // Should redirect to home or login
      await expect(page).not.toHaveURL(/.*dashboard/);
    });
  });

  test.describe('Password Reset', () => {
    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto('/login');

      await page.click('a:has-text("Forgot password?")');

      await expect(page).toHaveURL(/.*forgot-password/, { timeout: 10000 });
    });

    test('should send reset email for valid email', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.fill('input[type="email"]', 'customer@example.com');
      await page.click('button[type="submit"]');

      await expect(page.locator('h3:has-text("Check your email")')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Role-Based Access', () => {
    test('should redirect admin to admin dashboard', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin-dashboard');

      await expect(page).toHaveURL(/.*\/admin-dashboard/);
    });

    test('should redirect vendor to vendor dashboard', async ({ page }) => {
      await loginAsVendor(page);
      await page.goto('/vendor-dashboard');

      await expect(page).toHaveURL(/.*\/vendor-dashboard/);
    });

    test('should redirect customer to customer dashboard', async ({ page }) => {
      await loginAsCustomer(page);

      // Access customer dashboard
      await page.goto('/dashboard');

      // Customer should be able to access /dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page).not.toHaveURL(/.*\/admin-dashboard/);
      await expect(page).not.toHaveURL(/.*\/vendor-dashboard/);
    });

    test('should prevent unauthorized access to admin pages', async ({ page }) => {
      await loginAsCustomer(page);

      // Try to access admin page
      const response = await page.goto('/dashboard/admin/vendors', { waitUntil: 'networkidle' });

      // Should redirect or show error (don't check status code, check URL)
      await expect(page).not.toHaveURL(/.*\/dashboard\/admin/);
    });
  });
});
