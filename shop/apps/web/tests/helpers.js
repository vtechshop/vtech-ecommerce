// Shared test helpers

// Initialize playwright flag on the page
export async function initPlaywrightFlag(page) {
  await page.addInitScript(() => {
    window.playwright = true;
  });
}

export async function dismissCookieBanner(page) {
  try {
    const cookieAcceptButton = page.locator('[data-testid="cookie-accept"]');
    if (await cookieAcceptButton.isVisible({ timeout: 2000 })) {
      await cookieAcceptButton.click();
      await page.waitForTimeout(500); // Wait for banner to dismiss
    }
  } catch (e) {
    // Cookie banner not present, continue
  }
}

export async function login(page, email, password) {
  await page.goto('/login');
  await dismissCookieBanner(page);

  // Wait for login form to be ready
  await page.waitForSelector('input[name="email"]', { timeout: 5000 });

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // Click submit and wait for either navigation or error
  await page.click('button[type="submit"]:has-text("Sign in")');

  // Wait for navigation OR error message
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
  } catch (e) {
    // If no navigation, check if we're still on login with an error
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // Still on login page - might have errored, or might have already navigated
      // Check if we're actually logged in by looking for user elements
      const isLoggedIn = await page.locator('[data-cy="user-menu"], button:has-text("user")').count() > 0;
      if (!isLoggedIn) {
        throw new Error('Login failed - still on login page and no user menu found');
      }
    }
  }

  // Extra wait to ensure React state is settled
  await page.waitForTimeout(1000);
}

export async function loginAsCustomer(page) {
  await login(page, 'customer@example.com', 'Customer@123');
}

export async function loginAsAdmin(page) {
  await login(page, 'admin@example.com', 'Admin@123');
}

export async function loginAsVendor(page) {
  await login(page, 'vendor@example.com', 'Vendor@123');
}

// Clear cart helper
export async function clearCart(page) {
  try {
    await page.goto('/cart', { waitUntil: 'networkidle', timeout: 10000 });

    // Remove all items from cart
    let removeButtons = await page.locator('button:has-text("Remove")').count();
    while (removeButtons > 0) {
      await page.locator('button:has-text("Remove")').first().click();
      await page.waitForTimeout(500);
      removeButtons = await page.locator('button:has-text("Remove")').count();
    }

    await page.waitForTimeout(500);
  } catch (e) {
    // Cart might already be empty or not accessible
    console.log('Could not clear cart:', e.message);
  }
}
