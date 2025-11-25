// ***********************************************
// Custom commands for E-commerce testing
// ***********************************************

/**
 * Login command
 * @example cy.login('admin@example.com', 'password123')
 */
Cypress.Commands.add('login', (email, password) => {
  // Use a session that validates and re-uses existing sessions
  cy.session(
    [email, password],
    () => {
      // Add delay before visiting login to avoid rate limiting
      cy.wait(2000);
      cy.visit('/login');

      // Intercept login API call
      cy.intercept('POST', '**/api/auth/login').as('loginRequest');

      cy.get('input[name="email"], input[type="email"]').clear().type(email);
      cy.get('input[name="password"], input[type="password"]').clear().type(password);
      cy.get('button[type="submit"]').click();

      // Wait for login API response
      cy.wait('@loginRequest', { timeout: 15000 }).then((interception) => {
        // Check if response exists
        if (!interception || !interception.response) {
          throw new Error('Login request failed - no response received');
        }

        const statusCode = interception.response.statusCode;

        // Check if login was successful
        if (statusCode === 200) {
          cy.log('Login successful');
          // Add delay after successful login to avoid rate limiting
          cy.wait(1000);
        } else if (statusCode === 401) {
          throw new Error(`Login failed with 401: ${interception.response.body?.error?.message || 'Invalid credentials'}`);
        } else if (statusCode === 423) {
          throw new Error(`Account locked: ${interception.response.body?.error?.message || 'Account is temporarily locked'}. Run seed script to unlock: node apps/api/scripts/seedUser.js`);
        } else if (statusCode === 429) {
          throw new Error('Rate limited - too many login attempts. Please try again later.');
        } else {
          throw new Error(`Login failed with status ${statusCode}: ${interception.response.body?.error?.message || 'Unknown error'}`);
        }
      });

      // Wait for redirect to complete
      cy.url({ timeout: 10000 }).should('not.include', '/login');
    },
    {
      validate: () => {
        // Validate session is still active by checking for accessToken cookie
        cy.getCookie('accessToken').should('exist');
      },
    }
  );
});

/**
 * Login as admin
 */
Cypress.Commands.add('loginAsAdmin', () => {
  cy.login('admin@example.com', 'Admin@123');
});

/**
 * Login as customer
 */
Cypress.Commands.add('loginAsCustomer', () => {
  cy.login('customer@example.com', 'Customer@123');
});

/**
 * Login as vendor
 */
Cypress.Commands.add('loginAsVendor', () => {
  cy.login('vendor@example.com', 'Vendor@123');
});

/**
 * Logout command
 */
Cypress.Commands.add('logout', () => {
  // Scroll to top to ensure user menu is visible
  cy.scrollTo('top');
  cy.wait(300);

  // Click user menu to open dropdown
  cy.get('[data-cy="user-menu"]', { timeout: 10000 })
    .scrollIntoView()
    .should('be.visible')
    .click({ force: true });

  // Wait for dropdown
  cy.wait(500);

  // Click logout button
  cy.contains('button', /logout|sign out/i).click();

  // Clear all sessions after logout to prevent conflicts
  Cypress.session.clearAllSavedSessions();
});

/**
 * Add product to cart
 * Clicks on a product card from the home/search page and adds it to cart from the product detail page
 * @param {number} productIndex - Index of product card (default: 0 for first product)
 */
Cypress.Commands.add('addToCart', (productIndex = 0) => {
  // Wait for products to load on the page
  cy.get('[data-cy="product-card"], .product-card', { timeout: 15000 })
    .should('have.length.at.least', 1);

  // Click on the product card to go to product detail page
  cy.get('[data-cy="product-card"], .product-card')
    .eq(productIndex)
    .click();

  // Wait for product detail page to load
  cy.url({ timeout: 10000 }).should('include', '/product/');

  // Wait for page to fully load
  cy.wait(2000);

  // Check if the product page loaded successfully
  cy.get('body').then($body => {
    const hasAddToCartButton = $body.find('button').filter((_, el) => {
      return Cypress.$(el).text().match(/add to cart/i);
    }).length > 0;

    const hasErrorMessage = $body.text().match(/not found|error|404/i);

    if (hasErrorMessage || !hasAddToCartButton) {
      cy.log('Product not found or page error - trying next product');
      // Go back and try another product
      cy.visit('/');
      cy.wait(1000);
      cy.get('[data-cy="product-card"], .product-card', { timeout: 15000 })
        .should('have.length.at.least', 1);
      cy.get('[data-cy="product-card"], .product-card')
        .eq(productIndex + 1)
        .click();
      cy.wait(2000);

      // Verify the second product loaded correctly
      cy.url({ timeout: 10000 }).should('include', '/product/');
    }
  });

  // Add to cart from product detail page (now outside the then() callback)
  cy.contains('button', /add to cart/i, { timeout: 10000 }).click();

  // Wait for cart update
  cy.wait(1000);
});

/**
 * Navigate to cart
 */
Cypress.Commands.add('goToCart', () => {
  cy.get('[data-cy="cart-button"], a[href="/cart"], a:contains("Cart")').first().click();
  cy.url().should('include', '/cart');
});

/**
 * Clear cart
 */
Cypress.Commands.add('clearCart', () => {
  cy.visit('/cart');

  // Wait for the page to load (either empty state or cart items)
  cy.get('body', { timeout: 10000 }).should('be.visible');

  // Wait a moment for any loading states to resolve
  cy.wait(1000);

  // Check if cart is already empty by looking for the empty cart message
  cy.get('body').then($body => {
    const bodyText = $body.text().toLowerCase();
    const isEmpty = bodyText.includes('your cart is empty') ||
                    bodyText.includes('no items') ||
                    (bodyText.includes('cart') && bodyText.includes('empty'));

    if (isEmpty) {
      cy.log('Cart is already empty');
    } else {
      // Cart has items, find and click all remove buttons
      cy.log('Cart has items, removing them...');

      // Use a function that keeps clicking remove until no more buttons exist
      const removeAllItems = () => {
        cy.get('body').then($body => {
          const $removeBtn = $body.find('button').filter((i, el) => {
            return Cypress.$(el).text().match(/remove/i);
          }).first();

          if ($removeBtn.length > 0) {
            cy.log(`Found 1 item to remove`);
            cy.wrap($removeBtn).click({ force: true });
            cy.wait(500); // Wait for removal to process
            removeAllItems(); // Recursively remove next item
          } else {
            cy.log('Cart cleared successfully');
          }
        });
      };

      removeAllItems();
    }
  });
});

/**
 * Search for products
 * @param {string} query - Search query
 */
Cypress.Commands.add('searchProducts', (query) => {
  cy.get('input[placeholder*="Search"], input[name="search"], input[type="search"]')
    .first()
    .clear()
    .type(`${query}{enter}`);
  cy.url().should('include', 'search');
});

/**
 * Navigate to admin dashboard
 */
Cypress.Commands.add('goToAdminDashboard', () => {
  cy.visit('/admin-dashboard');
});

/**
 * Navigate to vendor dashboard
 */
Cypress.Commands.add('goToVendorDashboard', () => {
  cy.visit('/vendor-dashboard');
});

/**
 * Wait for API request
 * @param {string} url - URL pattern to wait for
 * @param {string} alias - Alias name for the intercept
 */
Cypress.Commands.add('waitForAPI', (url, alias = 'apiRequest') => {
  cy.intercept(url).as(alias);
  cy.wait(`@${alias}`);
});

/**
 * Check if element is visible in viewport
 */
Cypress.Commands.add('isInViewport', { prevSubject: true }, (subject) => {
  const rect = subject[0].getBoundingClientRect();
  expect(rect.top).to.be.at.least(0);
  expect(rect.left).to.be.at.least(0);
  expect(rect.bottom).to.be.at.most(Cypress.config('viewportHeight'));
  expect(rect.right).to.be.at.most(Cypress.config('viewportWidth'));
  return subject;
});

/**
 * Fill checkout form
 * @param {Object} data - Checkout data
 */
Cypress.Commands.add('fillCheckoutForm', (data = {}) => {
  const defaultData = {
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '9876543210',
    address: '123 MG Road',
    city: 'Bangalore',
    state: 'KA', // Karnataka (India)
    zipCode: '560001',
    country: 'IN', // India
    ...data
  };

  // Fill fields in order, checking if they exist first
  Object.entries(defaultData).forEach(([key, value]) => {
    // Use conditional querying - only interact with field if it exists
    cy.get('body').then($body => {
      const selector = `input[name="${key}"], select[name="${key}"]`;
      const $field = $body.find(selector);

      if ($field.length > 0) {
        // Field exists, fill it
        if ($field.is('select')) {
          cy.get(selector).select(value);
        } else {
          cy.get(selector).clear().type(value);
        }
      } else {
        // Field doesn't exist, skip it (e.g., email field for logged-in users)
        cy.log(`Skipping field "${key}" - not found on page`);
      }
    });
  });
});

/**
 * Upload file
 * @param {string} selector - Input selector
 * @param {string} fileName - File name in fixtures
 */
Cypress.Commands.add('uploadFile', (selector, fileName) => {
  cy.get(selector).selectFile(`cypress/fixtures/${fileName}`, { force: true });
});

/**
 * Check toast notification
 * @param {string} message - Expected message (case-insensitive)
 * @param {string} type - Type: success, error, warning, info
 */
Cypress.Commands.add('checkToast', (message, type = 'success') => {
  // Wait a moment for toast to appear
  cy.wait(500);

  // Find the toast and verify it contains the message (case-insensitive)
  cy.get('[role="alert"]', { timeout: 10000 })
    .should('be.visible')
    .should(($toast) => {
      const text = $toast.text().toLowerCase();
      const searchText = message.toLowerCase();
      expect(text).to.include(searchText);
    });
});

/**
 * Set vendor commission (admin only)
 * @param {string} vendorId - Vendor ID
 * @param {number} commission - Commission percentage
 */
Cypress.Commands.add('setVendorCommission', (vendorId, commission) => {
  cy.request({
    method: 'PUT',
    url: `${Cypress.env('apiUrl')}/admin/vendors/${vendorId}/commission`,
    body: { defaultCommissionPercentage: commission },
  }).then((response) => {
    expect(response.status).to.eq(200);
  });
});

/**
 * Create test product via API (vendor only)
 * @param {Object} productData - Product data
 */
Cypress.Commands.add('createProduct', (productData) => {
  const defaultProduct = {
    title: `Test Product ${Date.now()}`,
    description: 'Test product description',
    price: 99.99,
    stock: 100,
    published: true,
    ...productData
  };

  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/vendors/products`,
    body: defaultProduct,
  }).then((response) => {
    expect(response.status).to.be.oneOf([200, 201]);
    return response.body.data;
  });
});
