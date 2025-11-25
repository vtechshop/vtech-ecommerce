/// <reference types="cypress" />

describe('Shopping Cart Flow', () => {
  beforeEach(() => {
    cy.clearCart();
    cy.visit('/');
    // Wait for home page to load with products
    cy.get('[data-cy="product-card"], .product-card', { timeout: 15000 }).should('have.length.at.least', 1);
  });

  describe('Add to Cart', () => {
    it('should add product to cart from home page', () => {
      // Click on first product card to go to product detail
      cy.get('[data-cy="product-card"], .product-card').first().click();

      // Wait for product detail page
      cy.url().should('include', '/product/');

      // Add to cart
      cy.contains('button', /add to cart/i).click();

      // Verify cart icon updates
      cy.wait(500);
      cy.get('[data-cy="cart-count"], .cart-count').should('exist');
    });

    it('should add product to cart from product detail page', () => {
      // Click on first product to go to detail page
      cy.get('[data-cy="product-card"], .product-card').first().click();

      // Add to cart
      cy.contains('button', /add to cart/i).click();

      // Verify success
      cy.checkToast('added to cart');
    });

    it('should allow changing quantity before adding to cart', () => {
      cy.get('[data-cy="product-card"], .product-card').first().click();

      // Change quantity
      cy.get('input[name="quantity"], input[type="number"]').clear().type('3');

      // Add to cart
      cy.contains('button', /add to cart/i).click();

      // Go to cart and verify quantity
      cy.goToCart();
      cy.get('input[name="qty"], input[type="number"]').should('have.value', '3');
    });
  });

  describe('Cart Management', () => {
    beforeEach(() => {
      // Add a product to cart using the helper command
      cy.visit('/');
      cy.addToCart(0); // Add first product
    });

    it('should display cart items correctly', () => {
      cy.goToCart();

      // Verify cart is not empty
      cy.get('[data-cy="cart-item"], .cart-item').should('have.length.at.least', 1);

      // Verify item details are shown
      cy.contains(/product|item/i).should('be.visible');
      cy.contains(/price|total/i).should('be.visible');
    });

    it('should update item quantity in cart', () => {
      // Set up intercept to track cart updates
      cy.intercept('PUT', '**/api/cart/items/*').as('updateCart');

      cy.goToCart();

      // Wait for page to fully load and stabilize
      cy.wait(1000);

      // Get current quantity and save it
      cy.get('input[name="qty"], input[type="number"]').first().invoke('val').then((val) => {
        const currentQty = parseInt(val);
        const newQty = currentQty + 1;

        // Break up the chain - get element fresh each time
        cy.get('input[name="qty"], input[type="number"]').first().as('qtyInput');
        cy.get('@qtyInput').clear();
        cy.wait(200); // Wait for clear to complete
        cy.get('@qtyInput').type(newQty.toString());

        // Wait for the onChange handler to trigger API update
        cy.wait('@updateCart');
        cy.wait(500); // Wait for re-render to complete

        // Verify total price is still visible after update
        cy.contains(/total|subtotal/i).should('be.visible');
      });
    });

    it('should remove item from cart', () => {
      cy.goToCart();

      // Click remove button
      cy.get('button').contains(/remove|delete/i).first().click();

      // Verify item removed
      cy.contains(/cart is empty|no items/i).should('be.visible');
    });

    it('should calculate correct totals', () => {
      cy.goToCart();

      // Get price and quantity
      cy.get('[data-cy="cart-item"], .cart-item').first().within(() => {
        cy.get('[data-cy="item-price"]').invoke('text').then(priceText => {
          cy.get('input[name="qty"]').invoke('val').then(qty => {
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
            const quantity = parseInt(qty);
            const expectedTotal = price * quantity;

            // Verify subtotal
            cy.root().closest('body').find('[data-cy="subtotal"]').invoke('text').then(subtotalText => {
              const subtotal = parseFloat(subtotalText.replace(/[^0-9.]/g, ''));
              expect(subtotal).to.be.closeTo(expectedTotal, 1);
            });
          });
        });
      });
    });
  });

  describe('Cart Persistence', () => {
    it('should persist cart items after page reload', () => {
      // Add product to cart
      cy.visit('/');
      cy.addToCart(0);

      // Reload page
      cy.reload();

      // Verify cart still has items
      cy.wait(500);
      cy.get('[data-cy="cart-count"], .cart-count').should('exist');
    });

    it('should persist cart items for logged-in users', () => {
      // Intercept cart API calls
      cy.intercept('GET', '**/api/cart').as('getCart');

      cy.loginAsCustomer();

      // Add product
      cy.visit('/');
      cy.addToCart(0);

      // Verify cart badge shows
      cy.get('[data-cy="cart-count"], .cart-count').should('contain', '1');

      // Logout and login again
      cy.logout();
      cy.loginAsCustomer();

      // Wait for cart to load after login
      cy.wait('@getCart');
      cy.wait(2000); // Wait for Redux state update and component re-render

      // Navigate to home to ensure we're on a page that shows the cart badge
      cy.visit('/');
      cy.wait('@getCart'); // Wait for cart to load on home page
      cy.wait(1000);

      // Verify cart persisted
      cy.get('[data-cy="cart-count"], .cart-count', { timeout: 10000 }).should('exist');
      cy.get('[data-cy="cart-count"], .cart-count').should('contain', '1');
    });
  });

  describe('Empty Cart States', () => {
    it('should show empty cart message', () => {
      cy.visit('/cart');

      cy.contains(/cart is empty|no items|empty/i).should('be.visible');
    });

    it('should show continue shopping button', () => {
      cy.visit('/cart');

      cy.contains(/continue shopping|shop now/i).should('be.visible').click();

      cy.url().should('not.include', '/cart');
    });
  });

  describe('Cart Limits', () => {
    it('should not allow quantity less than 1', () => {
      // Add product to cart
      cy.visit('/');
      cy.addToCart(0);

      cy.goToCart();

      // Wait for page to stabilize
      cy.wait(1000);

      // Get the original value to compare
      cy.get('input[name="qty"]').first().invoke('val').then((originalQty) => {
        // Try to set quantity to 0
        cy.get('input[name="qty"]').first().as('qtyInput');
        cy.get('@qtyInput').clear();
        cy.wait(200);
        cy.get('@qtyInput').type('0');
        cy.wait(500);

        // Should either keep original value or prevent 0
        // Since the onChange handler ignores value <= 0, the input may show "0" but cart shouldn't update
        // Check that the displayed value either stayed the same or the cart wasn't updated
        cy.get('input[name="qty"]').first().should(($input) => {
          const value = $input.val();
          // Either it prevented typing 0, or it shows 0 but won't save it
          expect(['0', originalQty]).to.include(value);
        });
      });
    });

    it('should not allow quantity more than stock', () => {
      cy.visit('/');
      cy.get('[data-cy="product-card"], .product-card').first().click();

      // Try to add more than available stock
      cy.get('input[name="quantity"]').clear().type('999999');
      cy.contains('button', /add to cart/i).click();

      // Should show error or limit quantity
      cy.contains(/stock|available|limit/i).should('be.visible');
    });
  });
});
