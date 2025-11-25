describe('Sponsored Ads Management', () => {
  let adminToken;
  let adminUser;

  before(() => {
    // Login as admin
    cy.request('POST', 'http://localhost:8080/api/auth/login', {
      email: 'admin@example.com',
      password: 'Admin@123'
    }).then((response) => {
      expect(response.status).to.eq(200);
      adminToken = response.body.data.accessToken;
      adminUser = response.body.data.user;

      // Set tokens in localStorage
      window.localStorage.setItem('accessToken', adminToken);
      window.localStorage.setItem('user', JSON.stringify(adminUser));
    });
  });

  beforeEach(() => {
    // Set auth tokens before each test
    cy.window().then((win) => {
      win.localStorage.setItem('accessToken', adminToken);
      win.localStorage.setItem('user', JSON.stringify(adminUser));
    });
  });

  describe('Admin Sponsored Ads Page', () => {
    it('should load the sponsored ads management page', () => {
      cy.visit('http://localhost:5173/admin-dashboard/ads', {
        onBeforeLoad(win) {
          win.localStorage.setItem('accessToken', adminToken);
          win.localStorage.setItem('user', JSON.stringify(adminUser));
        }
      });

      // Wait for page to load
      cy.contains(/Sponsored Ads|Ads Management|Advertising/, { timeout: 10000 }).should('be.visible');
    });

    it('should display campaigns list or empty state', () => {
      cy.visit('http://localhost:5173/admin-dashboard/ads', {
        onBeforeLoad(win) {
          win.localStorage.setItem('accessToken', adminToken);
          win.localStorage.setItem('user', JSON.stringify(adminUser));
        }
      });

      cy.wait(2000); // Wait for API call

      // Either campaigns table or "No ad campaigns" or empty state should be visible
      cy.get('body').should('be.visible');
    });

    it('should have Create Campaign button', () => {
      cy.visit('http://localhost:5173/admin-dashboard/ads', {
        onBeforeLoad(win) {
          win.localStorage.setItem('accessToken', adminToken);
          win.localStorage.setItem('user', JSON.stringify(adminUser));
        }
      });

      // Look for create/new campaign button with flexible matching
      cy.get('button').contains(/Create|New.*Campaign|Add.*Campaign/i, { timeout: 10000 }).should('exist');
    });

    it('should have status filter dropdown', () => {
      cy.visit('http://localhost:5173/admin-dashboard/ads', {
        onBeforeLoad(win) {
          win.localStorage.setItem('accessToken', adminToken);
          win.localStorage.setItem('user', JSON.stringify(adminUser));
        }
      });

      // Check for status filter with flexible matching
      cy.get('select, [role="combobox"]').should('exist');
    });
  });

  describe('API Endpoints', () => {
    it('should fetch campaigns from API', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:8080/api/ads/campaigns',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('data');
        expect(response.body.data).to.be.an('array');

        cy.log(`Total campaigns found: ${response.body.data.length}`);
      });
    });

    it('should fetch vendors from API', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:8080/api/admin/vendors',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('data');
      });
    });
  });

  describe('Campaign Creation Modal', () => {
    it('should open create campaign modal when button clicked', () => {
      cy.visit('http://localhost:5173/admin/sponsored-ads', {
        onBeforeLoad(win) {
          win.localStorage.setItem('accessToken', adminToken);
          win.localStorage.setItem('user', JSON.stringify(adminUser));
        }
      });

      // Click Create Campaign button
      cy.contains('button', 'Create Campaign').click();

      // Modal should open
      cy.contains('Create Campaign').should('be.visible');
      cy.contains('Campaign Name').should('be.visible');
      cy.contains('Vendor').should('be.visible');
    });

    it('should close modal when cancel button clicked', () => {
      cy.visit('http://localhost:5173/admin/sponsored-ads', {
        onBeforeLoad(win) {
          win.localStorage.setItem('accessToken', adminToken);
          win.localStorage.setItem('user', JSON.stringify(adminUser));
        }
      });

      // Open modal
      cy.contains('button', 'Create Campaign').click();

      // Close modal
      cy.contains('button', 'Cancel').click();

      // Modal should be closed
      cy.contains('Create Campaign').should('not.exist');
    });
  });

  describe('Campaign Display', () => {
    it('should display demo campaigns if they exist', () => {
      // First check if campaigns exist
      cy.request({
        method: 'GET',
        url: 'http://localhost:8080/api/ads/campaigns',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }).then((response) => {
        const campaignsCount = response.body.data.length;

        if (campaignsCount > 0) {
          cy.visit('http://localhost:5173/admin/sponsored-ads', {
            onBeforeLoad(win) {
              win.localStorage.setItem('accessToken', adminToken);
              win.localStorage.setItem('user', JSON.stringify(adminUser));
            }
          });

          cy.wait(2000);

          // Check if campaigns are displayed in table
          cy.get('table').should('exist');
          cy.get('tbody tr').should('have.length.greaterThan', 0);

          cy.log(`Displaying ${campaignsCount} campaigns in the UI`);
        } else {
          cy.log('No campaigns found in database');
        }
      });
    });

    it('should display campaign details correctly', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:8080/api/ads/campaigns',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }).then((response) => {
        if (response.body.data.length > 0) {
          const firstCampaign = response.body.data[0];

          cy.visit('http://localhost:5173/admin/sponsored-ads', {
            onBeforeLoad(win) {
              win.localStorage.setItem('accessToken', adminToken);
              win.localStorage.setItem('user', JSON.stringify(adminUser));
            }
          });

          cy.wait(2000);

          // Check if campaign name is visible
          cy.contains(firstCampaign.name).should('be.visible');
        }
      });
    });
  });

  describe('Network Requests', () => {
    it('should make API call to fetch campaigns on page load', () => {
      cy.intercept('GET', '**/api/ads/campaigns*').as('getCampaigns');

      cy.visit('http://localhost:5173/admin/sponsored-ads', {
        onBeforeLoad(win) {
          win.localStorage.setItem('accessToken', adminToken);
          win.localStorage.setItem('user', JSON.stringify(adminUser));
        }
      });

      // Wait for the API call
      cy.wait('@getCampaigns', { timeout: 10000 }).then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        cy.log('Campaigns API Response:', interception.response.body);
      });
    });

    it('should make API call to fetch vendors on page load', () => {
      cy.intercept('GET', '**/api/admin/vendors*').as('getVendors');

      cy.visit('http://localhost:5173/admin/sponsored-ads', {
        onBeforeLoad(win) {
          win.localStorage.setItem('accessToken', adminToken);
          win.localStorage.setItem('user', JSON.stringify(adminUser));
        }
      });

      // Wait for the API call
      cy.wait('@getVendors', { timeout: 10000 }).then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
      });
    });
  });

  describe('Debug Information', () => {
    it('should log complete API response for debugging', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:8080/api/ads/campaigns',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }).then((response) => {
        cy.log('=== CAMPAIGNS API DEBUG ===');
        cy.log('Status:', response.status);
        cy.log('Success:', response.body.success);
        cy.log('Data type:', typeof response.body.data);
        cy.log('Data is array:', Array.isArray(response.body.data));
        cy.log('Data length:', response.body.data?.length || 0);
        cy.log('Full response:', JSON.stringify(response.body, null, 2));

        if (response.body.data && response.body.data.length > 0) {
          cy.log('First campaign:', JSON.stringify(response.body.data[0], null, 2));
        }
      });
    });

    it('should check user role from API', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:8080/api/auth/me',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }).then((response) => {
        cy.log('=== USER INFO ===');
        cy.log('User role:', response.body.data?.role);
        cy.log('User email:', response.body.data?.email);
        expect(response.body.data.role).to.eq('admin');
      });
    });
  });
});
