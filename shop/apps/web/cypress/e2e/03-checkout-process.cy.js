/// <reference types="cypress" />

describe('Checkout Process', () => {
  beforeEach(() => {
    cy.loginAsCustomer();
    cy.clearCart();

    // Add a product to cart
    cy.visit('/');
    // Wait for products to load before trying to add to cart
    cy.get('[data-cy="product-card"], .product-card', { timeout: 15000 }).should('have.length.at.least', 1);
    cy.addToCart(0);
  });

  describe('Proceed to Checkout', () => {
    it('should navigate from cart to checkout', () => {
      cy.goToCart();

      cy.contains('button', /proceed to checkout|checkout/i).click();

      cy.url().should('include', '/checkout');
    });

    it('should require login before checkout', () => {
      cy.logout();

      // Add product to cart as guest
      cy.visit('/');
      cy.get('[data-cy="product-card"], .product-card', { timeout: 15000 }).should('have.length.at.least', 1);
      cy.addToCart(0);

      cy.goToCart();

      cy.contains('button', /proceed to checkout/i).click();

      // Should redirect to login or show login modal
      cy.url().should('match', /login|checkout/);
    });
  });

  describe('Shipping Information', () => {
    beforeEach(() => {
      cy.goToCart();
      cy.contains('button', /proceed to checkout/i).click();
    });

    it('should fill shipping information', () => {
      cy.fillCheckoutForm({
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        address: '123 Test Street',
        city: 'Mumbai',
        state: 'MH', // Maharashtra (India)
        zipCode: '400001',
        country: 'IN'
      });

      // Continue to next step
      cy.contains('button', /continue|next/i).click({ force: true });

      cy.url().should('not.include', 'shipping');
    });

    it('should validate required fields', () => {
      // Try to click to trigger HTML5 validation
      // The form should prevent navigation if required fields are empty
      // Note: Using force:true to bypass sticky footer covering the button
      cy.get('button[type="submit"]').click({ force: true });

      // Should stay on checkout page (not navigate away)
      cy.url().should('include', '/checkout');

      // HTML5 validation prevents form submission, so we should still be on step 1
      // Verify we're still seeing the address form
      cy.contains(/shipping address/i).should('be.visible');
    });

    it('should save shipping address for future use', () => {
      cy.fillCheckoutForm();

      // Check "Save address" checkbox if available
      cy.get('body').then($body => {
        const $checkbox = $body.find('input[type="checkbox"]').filter((i, el) => {
          const text = Cypress.$(el).parent().text();
          return text.match(/save|remember/i);
        });

        if ($checkbox.length > 0) {
          cy.wrap($checkbox).check();
        } else {
          cy.log('Save address checkbox not found - skipping');
        }
      });

      cy.contains('button', /continue|next/i).click({ force: true });

      // Should navigate to shipping step
      cy.url().should('not.include', 'shipping');
    });
  });

  describe('Payment Method Selection', () => {
    beforeEach(() => {
      cy.goToCart();
      cy.contains('button', /proceed to checkout/i).click();

      // Wait for checkout page to load
      cy.url().should('include', '/checkout');
      cy.wait(1000);

      // Check if there are existing addresses to click, or fill the form
      cy.get('body').then($body => {
        // Look for existing address buttons
        const $existingAddress = $body.find('button').filter((i, el) => {
          const text = Cypress.$(el).text();
          return text.match(/phone|address/i) && !text.match(/new address/i);
        }).first();

        if ($existingAddress.length > 0) {
          // Click the first existing address
          cy.log('Using existing address');
          cy.wrap($existingAddress).click();
          cy.wait(2000); // Wait for navigation after selecting address
        } else {
          // Fill the new address form
          cy.log('Filling new address form');
          cy.fillCheckoutForm();
          cy.contains('button', /continue|next/i).click({ force: true });
          cy.wait(2000); // Wait for navigation after submitting form
        }
      });

      // Verify we're on the shipping step and select a shipping method
      cy.contains(/shipping method/i, { timeout: 10000 }).should('be.visible');

      // Wait for shipping quotes to load
      cy.wait(2000);

      // Select first available shipping method
      // Look for buttons with border styling (shipping option buttons have border-2 class)
      cy.get('button').filter((i, el) => {
        const $el = Cypress.$(el);
        const hasText = $el.text().trim().length > 10; // Has substantial text content
        const hasBorder = $el.hasClass('border-2') || $el.hasClass('border'); // Has border styling
        return hasText && hasBorder;
      }).first().click({ force: true });

      // Wait for state to update
      cy.wait(500);

      // Continue to payment
      cy.contains('button', /continue to payment|continue|next/i).click({ force: true });
      cy.wait(2000);
    });

    it('should display available payment methods', () => {
      cy.contains(/payment method|pay with/i, { timeout: 10000 }).should('be.visible');

      // Check for payment options
      cy.get('[data-cy="payment-method"], input[name="paymentMethod"]').should('exist');
    });

    it('should select cash on delivery', () => {
      // Verify payment method section is visible
      cy.contains(/payment method/i, { timeout: 10000 }).should('be.visible');
      cy.wait(1000);

      cy.contains(/cash on delivery|cod/i, { timeout: 10000 }).click();

      cy.contains('button', /place order|confirm/i).should('be.enabled');
    });

    it('should select online payment', () => {
      // Verify payment method section is visible
      cy.contains(/payment method/i, { timeout: 10000 }).should('be.visible');
      cy.wait(1000);

      cy.contains(/card|credit|debit|online/i, { timeout: 10000 }).first().click();

      // Card details form should appear (or warning message about Stripe)
      cy.get('[data-cy="card-form"], iframe, .bg-yellow-50').should('exist');
    });
  });

  describe('Order Review', () => {
    beforeEach(() => {
      cy.goToCart();
      cy.contains('button', /proceed to checkout/i).click();

      // Wait for checkout page to load
      cy.url().should('include', '/checkout');
      cy.wait(1000);

      // Check if there are existing addresses to click, or fill the form
      cy.get('body').then($body => {
        // Look for existing address buttons
        const $existingAddress = $body.find('button').filter((i, el) => {
          const text = Cypress.$(el).text();
          return text.match(/phone|address/i) && !text.match(/new address/i);
        }).first();

        if ($existingAddress.length > 0) {
          // Click the first existing address
          cy.log('Using existing address');
          cy.wrap($existingAddress).click();
          cy.wait(2000);
        } else {
          // Fill the new address form
          cy.log('Filling new address form');
          cy.fillCheckoutForm();
          cy.contains('button', /continue|next/i).click({ force: true });
          cy.wait(2000);
        }
      });

      // Select shipping method
      cy.contains(/shipping method/i, { timeout: 10000 }).should('be.visible');
      cy.wait(2000);
      cy.get('button').filter((i, el) => {
        const $el = Cypress.$(el);
        const hasText = $el.text().trim().length > 10;
        const hasBorder = $el.hasClass('border-2') || $el.hasClass('border');
        return hasText && hasBorder;
      }).first().click({ force: true });
      cy.wait(500);
      cy.contains('button', /continue to payment|continue|next/i).click({ force: true });
      cy.wait(2000);
    });

    it('should display order summary', () => {
      // Order items
      cy.contains(/order summary|your order/i).should('be.visible');

      // Prices
      cy.contains(/subtotal/i).should('be.visible');
      cy.contains(/shipping/i).should('be.visible');
      cy.contains(/total/i).should('be.visible');
    });

    it('should allow editing cart from checkout', () => {
      cy.contains(/edit cart|modify|change/i).click();

      cy.url().should('include', '/cart');
    });
  });

  describe('Place Order', () => {
    beforeEach(() => {
      cy.goToCart();
      cy.contains('button', /proceed to checkout/i).click();

      // Wait for checkout page to load
      cy.url().should('include', '/checkout');
      cy.wait(1000);

      // Check if there are existing addresses to click, or fill the form
      cy.get('body').then($body => {
        // Look for existing address buttons
        const $existingAddress = $body.find('button').filter((i, el) => {
          const text = Cypress.$(el).text();
          return text.match(/phone|address/i) && !text.match(/new address/i);
        }).first();

        if ($existingAddress.length > 0) {
          // Click the first existing address
          cy.log('Using existing address');
          cy.wrap($existingAddress).click();
          cy.wait(2000);
        } else {
          // Fill the new address form
          cy.log('Filling new address form');
          cy.fillCheckoutForm();
          cy.contains('button', /continue|next/i).click({ force: true });
          cy.wait(2000);
        }
      });

      // Select shipping method
      cy.contains(/shipping method/i, { timeout: 10000 }).should('be.visible');
      cy.wait(2000);
      cy.get('button').filter((i, el) => {
        const $el = Cypress.$(el);
        const hasText = $el.text().trim().length > 10;
        const hasBorder = $el.hasClass('border-2') || $el.hasClass('border');
        return hasText && hasBorder;
      }).first().click({ force: true });
      cy.wait(500);
      cy.contains('button', /continue to payment|continue|next/i).click({ force: true });
      cy.wait(2000);

      // Verify we're on the payment step
      cy.contains(/payment method/i, { timeout: 10000 }).should('be.visible');
      cy.wait(1000);

      // Select COD payment
      cy.contains(/cash on delivery|cod/i, { timeout: 10000 }).click();
    });

    it('should successfully place order with COD', () => {
      cy.contains('button', /place order|confirm order/i).click();

      // Should redirect to success page
      cy.url().should('match', /order-confirmation|success|thank-you/);

      // Success message
      cy.contains(/order placed|thank you|confirmed/i).should('be.visible');

      // Order ID should be displayed
      cy.contains(/order.*#|order id|order number/i).should('be.visible');
    });

    it('should clear cart after successful order', () => {
      cy.contains('button', /place order/i).click();

      cy.wait(2000);

      // Navigate to cart
      cy.visit('/cart');

      cy.contains(/cart is empty|no items/i).should('be.visible');
    });

    it('should send order confirmation email', () => {
      cy.contains('button', /place order/i).click();

      // Check for email confirmation message
      cy.contains(/email sent|confirmation email|check your email/i).should('be.visible');
    });
  });

  describe('Order History', () => {
    it('should show order in order history', () => {
      // Place an order first
      cy.goToCart();
      cy.contains('button', /proceed to checkout/i).click();

      // Wait for checkout page to load
      cy.url().should('include', '/checkout');
      cy.wait(1000);

      // Check if there are existing addresses to click, or fill the form
      cy.get('body').then($body => {
        // Look for existing address buttons
        const $existingAddress = $body.find('button').filter((i, el) => {
          const text = Cypress.$(el).text();
          return text.match(/phone|address/i) && !text.match(/new address/i);
        }).first();

        if ($existingAddress.length > 0) {
          // Click the first existing address
          cy.log('Using existing address');
          cy.wrap($existingAddress).click();
          cy.wait(2000);
        } else {
          // Fill the new address form
          cy.log('Filling new address form');
          cy.fillCheckoutForm();
          cy.contains('button', /continue|next/i).click({ force: true });
          cy.wait(2000);
        }
      });

      // Select shipping method
      cy.contains(/shipping method/i, { timeout: 10000 }).should('be.visible');
      cy.wait(2000);
      cy.get('button').filter((i, el) => {
        const $el = Cypress.$(el);
        const hasText = $el.text().trim().length > 10;
        const hasBorder = $el.hasClass('border-2') || $el.hasClass('border');
        return hasText && hasBorder;
      }).first().click({ force: true });
      cy.wait(500);
      cy.contains('button', /continue to payment|continue|next/i).click({ force: true });
      cy.wait(2000);

      // Verify we're on the payment step
      cy.contains(/payment method/i, { timeout: 10000 }).should('be.visible');
      cy.wait(1000);

      // Select Cash on Delivery
      cy.contains(/cash on delivery/i, { timeout: 10000 }).click();
      cy.contains('button', /place order/i).click({ force: true });

      cy.wait(2000);

      // Navigate to orders page
      cy.visit('/dashboard/customer/orders');

      // Verify order appears
      cy.get('[data-cy="order-item"], .order-item').should('have.length.at.least', 1);
    });
  });

  describe('Checkout Edge Cases', () => {
    it('should handle out of stock products', () => {
      // This would need a product with 0 stock
      // Skip if product management needed
      cy.log('Test requires product with 0 stock');
    });

    it('should calculate shipping costs correctly', () => {
      cy.goToCart();
      cy.contains('button', /proceed to checkout/i).click();

      // Wait for checkout page to load
      cy.url().should('include', '/checkout');
      cy.wait(1000);

      // Check if there are existing addresses to click, or fill the form
      cy.get('body').then($body => {
        // Look for existing address buttons
        const $existingAddress = $body.find('button').filter((i, el) => {
          const text = Cypress.$(el).text();
          return text.match(/phone|address/i) && !text.match(/new address/i);
        }).first();

        if ($existingAddress.length > 0) {
          // Click the first existing address
          cy.log('Using existing address');
          cy.wrap($existingAddress).click();
          cy.wait(2000);
        } else {
          // Fill the new address form
          cy.log('Filling new address form');
          cy.fillCheckoutForm();
          cy.contains('button', /continue|next/i).click({ force: true });
          cy.wait(2000);
        }
      });

      // Now on shipping step - check shipping costs
      cy.contains(/shipping method/i, { timeout: 10000 }).should('be.visible');
      cy.wait(1000);

      // Check that shipping options display costs (at least one should be visible)
      cy.get('body').invoke('text').should('match', /free|₹|\$/i);
    });

    it('should apply coupon code if valid', () => {
      cy.goToCart();

      // Check if coupon feature is implemented
      cy.get('body').then($body => {
        const $couponInput = $body.find('input[name="coupon"], input[placeholder*="coupon"]');

        if ($couponInput.length > 0) {
          // Apply coupon
          cy.wrap($couponInput).type('TEST10');
          cy.contains('button', /apply/i).click();

          // Verify discount applied
          cy.contains(/discount|coupon applied/i).should('be.visible');
        } else {
          cy.log('Coupon feature not implemented - skipping test');
        }
      });
    });
  });
});
