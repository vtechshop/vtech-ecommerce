// cypress/support/e2e.js

// ✅ Import all custom Cypress commands
import './commands';

// ✅ Prevent Cypress from failing tests on app errors (optional but useful)
Cypress.on('uncaught:exception', () => {
  // Returning false prevents Cypress from failing the test
  return false;
});

// ❌ REMOVE THIS (Deprecated in Cypress 12+)
// Cypress.Cookies.defaults({
//   preserve: ['connect.sid', 'token', 'refreshToken', 'auth_token']
// });

// ✅ If you still want to preserve session, use cy.session() inside commands.js (already done)

// ✅ Optional: Helper to wait after route/page changes
Cypress.Commands.add('waitForIdle', () => cy.wait(300));

// ✅ Suite-level logging (optional)
before(() => cy.log('🚀 Starting E2E Test Suite'));
after(() => cy.log('✅ E2E Test Suite Completed'));
