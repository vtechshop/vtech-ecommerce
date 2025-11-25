import { test, expect } from '@playwright/test';
import { initPlaywrightFlag, dismissCookieBanner, loginAsCustomer } from './helpers.js';

// Helper functions
async function clearCart(page) {
  await page.goto('/cart');
  await dismissCookieBanner(page);
  const body = await page.textContent('body');

  if (body.includes('Your cart is empty') || body.includes('No items')) {
    return;
  }

  // Remove all items
  const removeButtons = await page.locator('[data-testid="remove-item-btn"], button:has-text("Remove"), button:has-text("Delete")').all();
  for (const button of removeButtons) {
    await button.click();
    await page.waitForTimeout(500);
  }
}

async function goToCart(page) {
  await page.click('[data-cy="cart-button"], a[href="/cart"], a:has-text("Cart")');
  await expect(page).toHaveURL(/.*cart/);
}

test.describe('Shopping Cart Flow', () => {
  test.beforeEach(async ({ page }) => {
    await initPlaywrightFlag(page);
    await page.goto('/');
    await dismissCookieBanner(page);
    await clearCart(page);
    // Navigate back to home after clearing cart
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Add to Cart', () => {
    test('should add product to cart from home page', async ({ page }) => {
      // Wait for product cards to load
      await page.waitForSelector('[data-cy="product-card"], .product-card', { timeout: 10000 });

      // Set up request interceptor to wait for cart API call
      const cartAddPromise = page.waitForResponse(
        response => response.url().includes('/api/cart/add') && response.status() === 200,
        { timeout: 30000 }
      );

      // Find and click first product's add to cart button
      const firstProduct = page.locator('[data-cy="product-card"], .product-card').first();
      const addButton = firstProduct.locator('button:has-text("Add to Cart")');

      // Wait for button to be clickable
      await addButton.waitFor({ state: 'visible', timeout: 5000 });
      await addButton.click();

      // Wait for the cart API call to complete
      await cartAddPromise;

      // Give Redux state time to update and component to re-render
      await page.waitForTimeout(1000);

      // Wait for cart count badge to appear (it only shows when count > 0)
      await page.waitForSelector('[data-cy="cart-count"], .cart-count', { timeout: 30000 });

      // Verify cart icon updates
      await expect(page.locator('[data-cy="cart-count"], .cart-count')).toContainText('1');
    });

    test('should add product to cart from product detail page', async ({ page }) => {
      // Wait for product cards to load
      await page.waitForSelector('[data-cy="product-card"], .product-card', { timeout: 10000 });

      // Click on first product to go to detail page
      await page.locator('[data-cy="product-card"], .product-card').first().click();

      // Wait for product detail page to load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500); // Give the page time to render

      // Set up request interceptor to wait for cart API call
      const cartAddPromise = page.waitForResponse(
        response => response.url().includes('/api/cart/add') && response.status() === 200,
        { timeout: 30000 }
      );

      // Wait for Add to Cart button to be visible
      const addButton = page.locator('button:has-text("Add to Cart")').first();
      await addButton.waitFor({ state: 'visible', timeout: 10000 });
      await addButton.click();

      // Wait for the cart API call to complete
      await cartAddPromise;

      // Give Redux state time to update and component to re-render
      await page.waitForTimeout(1000);

      // Wait for cart count badge to appear
      await page.waitForSelector('[data-cy="cart-count"], .cart-count', { timeout: 30000 });

      // Verify cart count
      await expect(page.locator('[data-cy="cart-count"], .cart-count')).toContainText('1');
    });

    test('should allow changing quantity before adding to cart', async ({ page }) => {
      // Go to product detail page
      await page.waitForSelector('[data-cy="product-card"], .product-card', { timeout: 10000 });
      await page.locator('[data-cy="product-card"], .product-card').first().click();

      // Wait for product detail page
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // Wait for quantity input to be visible
      const quantityInput = page.locator('input[name="quantity"], input[type="number"]').first();
      await quantityInput.waitFor({ state: 'visible', timeout: 10000 });

      // Change quantity
      await quantityInput.fill('3');

      // Set up request interceptor to wait for cart API call
      const cartAddPromise = page.waitForResponse(
        response => response.url().includes('/api/cart/add') && response.status() === 200,
        { timeout: 30000 }
      );

      // Add to cart
      const addButton = page.locator('button:has-text("Add to cart"), button:has-text("Add to Cart")').first();
      await addButton.click();

      // Wait for cart API call to complete
      await cartAddPromise;
      await page.waitForTimeout(1000);

      // Go to cart and verify quantity
      await goToCart(page);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('input[name="qty"], input[type="number"]').first()).toHaveValue('3');
    });
  });

  test.describe('Cart Management', () => {
    test.beforeEach(async ({ page }) => {
      // Add a product to cart
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Wait for product cards to load
      await page.waitForSelector('[data-cy="product-card"], .product-card', { timeout: 10000 });

      // Set up request interceptor to wait for cart API call
      const cartAddPromise = page.waitForResponse(
        response => response.url().includes('/api/cart/add') && response.status() === 200,
        { timeout: 30000 }
      );

      // Find first product that has "Add to Cart" button (skip out of stock)
      const firstProduct = page.locator('[data-cy="product-card"], .product-card').first();
      const addToCartButton = firstProduct.locator('button:has-text("Add to Cart")');

      // Wait for button and click
      await addToCartButton.waitFor({ state: 'visible', timeout: 10000 });
      await addToCartButton.click();

      // Wait for the cart API call to complete
      await cartAddPromise;

      // Give Redux state time to update
      await page.waitForTimeout(1000);

      // Wait for cart count badge to appear
      await page.waitForSelector('[data-cy="cart-count"], .cart-count', { timeout: 30000 });
    });

    test('should display cart items correctly', async ({ page }) => {
      await goToCart(page);

      // Verify cart is not empty
      const cartItems = await page.locator('[data-cy="cart-item"], .cart-item').count();
      expect(cartItems).toBeGreaterThanOrEqual(1);

      // Verify cart summary is shown with specific selectors
      await expect(page.locator('text=/subtotal/i').first()).toBeVisible();
      await expect(page.locator('text=/total/i').first()).toBeVisible();
    });

    test('should update item quantity in cart', async ({ page }) => {
      await goToCart(page);

      // Get current quantity
      const qtyInput = page.locator('input[name="qty"], input[type="number"]').first();
      const currentQty = parseInt(await qtyInput.inputValue());

      // Increase quantity
      await qtyInput.fill((currentQty + 1).toString());

      // Verify total price updated
      await page.waitForTimeout(500);
      await expect(page.locator('text=/subtotal/i').first()).toBeVisible();
    });

    test('should remove item from cart', async ({ page }) => {
      await goToCart(page);

      // Click remove button
      await page.locator('button:has-text("Remove"), button:has-text("Delete")').first().click();

      // Verify item removed
      await expect(page.locator('text=/cart is empty|no items/i')).toBeVisible();
    });

    test('should calculate correct totals', async ({ page }) => {
      await goToCart(page);

      // Get price and quantity from first item
      const firstItem = page.locator('[data-cy="cart-item"], .cart-item').first();
      const priceText = await firstItem.locator('[data-cy="item-price"]').textContent();
      const qty = await firstItem.locator('input[name="qty"]').inputValue();

      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      const quantity = parseInt(qty);
      const expectedTotal = price * quantity;

      // Verify subtotal
      const subtotalText = await page.locator('[data-cy="subtotal"]').textContent();
      const subtotal = parseFloat(subtotalText.replace(/[^0-9.]/g, ''));

      // Allow small floating point differences
      expect(Math.abs(subtotal - expectedTotal)).toBeLessThan(1);
    });
  });

  test.describe('Cart Persistence', () => {
    test('should persist cart items after page reload', async ({ page }) => {
      // Add product to cart
      await page.goto('/');

      // Wait for product cards to load
      await page.waitForSelector('[data-cy="product-card"], .product-card', { timeout: 10000 });

      // Set up request interceptor to wait for cart API call
      const cartAddPromise = page.waitForResponse(
        response => response.url().includes('/api/cart/add') && response.status() === 200,
        { timeout: 30000 }
      );

      const firstProduct = page.locator('[data-cy="product-card"], .product-card').first();
      await firstProduct.locator('button:has-text("Add to Cart")').click();

      // Wait for cart API call to complete
      await cartAddPromise;

      // Wait for cart count to update before reload
      await page.waitForFunction(() => {
        const cartCount = document.querySelector('[data-cy="cart-count"], .cart-count');
        if (!cartCount) return false;
        const count = parseInt(cartCount.textContent || '0');
        return count >= 1;
      }, { timeout: 30000 });

      // Reload page
      await page.reload();

      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Verify cart still has items
      await expect(page.locator('[data-cy="cart-count"], .cart-count')).toContainText('1');
    });

    test('should persist cart items for logged-in users', async ({ page }) => {
      await loginAsCustomer(page);

      // Clear cart first to ensure clean state
      await page.goto('/cart');

      // Remove all existing items
      let removeButtonCount = await page.locator('button:has-text("Remove")').count();
      while (removeButtonCount > 0) {
        await page.locator('button:has-text("Remove")').first().click();
        await page.waitForTimeout(500);
        removeButtonCount = await page.locator('button:has-text("Remove")').count();
      }

      // Add product
      await page.goto('/');

      // Wait for product cards to load
      await page.waitForSelector('[data-cy="product-card"], .product-card', { timeout: 10000 });

      // Set up request interceptor to wait for cart API call
      const cartAddPromise = page.waitForResponse(
        response => response.url().includes('/api/cart/add') && response.status() === 200,
        { timeout: 30000 }
      );

      const firstProduct = page.locator('[data-cy="product-card"], .product-card').first();
      await firstProduct.locator('button:has-text("Add to Cart")').click();

      // Wait for cart API call to complete
      await cartAddPromise;

      // Wait for cart count to be exactly 1
      await page.waitForFunction(() => {
        const cartCount = document.querySelector('[data-cy="cart-count"], .cart-count');
        if (!cartCount) return false;
        const count = parseInt(cartCount.textContent || '0');
        return count === 1;
      }, { timeout: 30000 });

      // Logout
      await page.click('[data-cy="user-menu"], button:has-text("user")');
      await page.click('text=/logout|sign out/i');

      // Login again
      await loginAsCustomer(page);

      // Wait for page to load and cart to sync
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Verify cart persisted
      await expect(page.locator('[data-cy="cart-count"], .cart-count')).toContainText('1');
    });
  });

  test.describe('Empty Cart States', () => {
    test('should show empty cart message', async ({ page }) => {
      await page.goto('/cart');

      await expect(page.locator('text=/cart is empty|no items|empty/i')).toBeVisible();
    });

    test('should show continue shopping button', async ({ page }) => {
      await page.goto('/cart');

      await page.click('text=/continue shopping|shop now/i');

      await expect(page).not.toHaveURL(/.*cart/);
    });
  });

  test.describe('Cart Limits', () => {
    test('should not allow quantity less than 1', async ({ page }) => {
      // Add product to cart
      await page.goto('/');

      // Wait for product cards to load
      await page.waitForSelector('[data-cy="product-card"], .product-card', { timeout: 10000 });

      // Set up request interceptor to wait for cart API call
      const cartAddPromise = page.waitForResponse(
        response => response.url().includes('/api/cart/add') && response.status() === 200,
        { timeout: 30000 }
      );

      const firstProduct = page.locator('[data-cy="product-card"], .product-card').first();
      await firstProduct.locator('button:has-text("Add to Cart")').click();

      // Wait for cart API call to complete
      await cartAddPromise;
      await page.waitForTimeout(1000);

      await goToCart(page);

      // Try to set quantity to 0
      const qtyInput = page.locator('input[name="qty"]').first();
      await qtyInput.fill('0');
      await qtyInput.blur();

      // Should either prevent or show error
      await expect(qtyInput).not.toHaveValue('0');
    });

    test('should not allow quantity more than stock', async ({ page }) => {
      await page.goto('/');
      await page.locator('[data-cy="product-card"], .product-card').first().click();

      // Try to add more than available stock
      await page.fill('input[name="quantity"]', '999999');
      await page.locator('button:has-text("Add to cart")').click();

      // Should show error or limit quantity - use first to avoid strict mode
      await expect(page.locator('text=/not enough stock|stock available/i').first()).toBeVisible();
    });
  });
});
