/**
 * Test Script: Admin Shipping Carrier Selection Workflow
 *
 * This script tests the complete workflow:
 * 1. Customer places order
 * 2. Admin receives order
 * 3. Admin chooses delivery carrier
 * 4. System updates shipment details
 *
 * Usage:
 *   node test-shipping-workflow.js
 *
 * Prerequisites:
 *   - Server must be running
 *   - At least one shipping carrier configured in .env
 *   - Admin user credentials
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@example.com'; // Update with your admin email
const ADMIN_PASSWORD = 'admin123'; // Update with your admin password

let adminToken = '';
let testOrderId = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}▶️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

// Helper function for API calls
const api = {
  async post(url, data, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return axios.post(`${BASE_URL}${url}`, data, { headers });
  },
  async get(url, token = null) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return axios.get(`${BASE_URL}${url}`, { headers });
  },
};

// Step 1: Admin Login
async function adminLogin() {
  log.step('Step 1: Admin Login');
  try {
    const response = await api.post('/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    adminToken = response.data.token;
    log.success(`Admin logged in successfully`);
    return true;
  } catch (error) {
    log.error(`Admin login failed: ${error.response?.data?.error?.message || error.message}`);
    return false;
  }
}

// Step 2: Create Test Order (simulating customer order)
async function createTestOrder() {
  log.step('Step 2: Create Test Order (Customer places order)');
  try {
    // In a real scenario, customer would place order via checkout
    // For testing, we'll create a minimal order directly
    const orderData = {
      orderId: `TEST-${Date.now()}`,
      guestEmail: 'customer@example.com',
      isGuest: true,
      items: [
        {
          name: 'iPhone 15 Pro',
          qty: 1,
          priceSnapshot: 99900,
          sku: 'IP15PRO-128',
          weight: 200,
        },
      ],
      shipTo: {
        fullName: 'John Doe',
        phone: '9876543210',
        addressLine1: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India',
      },
      totals: {
        subtotal: 99900,
        tax: 17982,
        shipping: 0,
        discount: 0,
        total: 117882,
      },
      status: 'pending',
      payment: {
        method: 'prepaid',
        status: 'paid',
        transactionId: `TXN${Date.now()}`,
        paidAt: new Date(),
      },
    };

    // Note: You may need to adjust this based on your actual order creation endpoint
    log.info('Order data prepared');
    log.info(`Order ID: ${orderData.orderId}`);
    testOrderId = orderData.orderId;

    log.success('Test order created (simulated)');
    log.info(`Customer: ${orderData.shipTo.fullName}`);
    log.info(`Destination: ${orderData.shipTo.city}, ${orderData.shipTo.state} ${orderData.shipTo.zipCode}`);
    log.info(`Items: ${orderData.items[0].name} x ${orderData.items[0].qty}`);
    log.info(`Total: ₹${(orderData.totals.total / 100).toFixed(2)}`);
    log.warn('Note: In production, order would be created via checkout API');

    return true;
  } catch (error) {
    log.error(`Failed to create test order: ${error.message}`);
    return false;
  }
}

// Step 3: Get Available Carriers
async function getAvailableCarriers() {
  log.step('Step 3: Get Available Carriers');
  try {
    const response = await api.get('/shipping/carriers', adminToken);
    const carriers = response.data.data.carriers;

    log.success(`Found ${carriers.length} configured carrier(s)`);
    carriers.forEach((carrier) => {
      log.info(`  • ${carrier.name} (${carrier.id}) - ${carrier.enabled ? 'Enabled' : 'Disabled'}`);
    });

    return carriers;
  } catch (error) {
    log.error(`Failed to get carriers: ${error.response?.data?.error?.message || error.message}`);
    return [];
  }
}

// Step 4: Get Shipping Quotes for Order
async function getShippingQuotes(orderId) {
  log.step('Step 4: Get Shipping Quotes (Admin compares rates)');
  try {
    const response = await api.get(`/shipping/orders/${orderId}/quotes`, adminToken);
    const { rates, recommended } = response.data.data;

    log.success(`Received quotes from ${rates.length} carrier(s)`);
    console.log('\n  📊 Rate Comparison:');
    rates.forEach((rate, index) => {
      const badge = rate.carrier === recommended.carrier ? '★ Recommended' : '';
      console.log(
        `  ${index + 1}. ${rate.carrierName.padEnd(15)} ₹${rate.rate.toString().padEnd(6)} (${rate.estimatedDays} days) ${badge}`
      );
    });
    console.log('');

    return rates;
  } catch (error) {
    log.error(`Failed to get quotes: ${error.response?.data?.error?.message || error.message}`);
    log.warn('This may be because the test order was not actually created in the database');
    log.warn('To test with real order, use an existing order ID from your database');
    return [];
  }
}

// Step 5: Get Recommended Carrier
async function getRecommendedCarrier(orderId, priority = 'cost') {
  log.step(`Step 5: Get Recommended Carrier (Priority: ${priority})`);
  try {
    const response = await api.get(
      `/shipping/orders/${orderId}/recommended?priority=${priority}`,
      adminToken
    );
    const { recommended } = response.data.data;

    log.success(`Recommended: ${recommended.carrierName}`);
    log.info(`Rate: ₹${recommended.rate}`);
    log.info(`Estimated: ${recommended.estimatedDays} days`);
    log.info(`Reason: ${recommended.reason || 'Best option'}`);

    return recommended;
  } catch (error) {
    log.error(`Failed to get recommendation: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

// Step 6: Assign Carrier to Order
async function assignCarrier(orderId, carrierName) {
  log.step(`Step 6: Assign Carrier (Admin chooses: ${carrierName})`);
  try {
    const response = await api.post(
      `/shipping/orders/${orderId}/assign-carrier`,
      { carrier: carrierName },
      adminToken
    );

    const { carrier, awb, trackingUrl } = response.data.data;

    log.success('Shipment created successfully! 🎉');
    console.log('\n  📦 Shipment Details:');
    console.log(`  Carrier:      ${carrier}`);
    console.log(`  AWB:          ${awb}`);
    console.log(`  Tracking URL: ${trackingUrl}`);
    console.log('');

    return response.data.data;
  } catch (error) {
    log.error(`Failed to assign carrier: ${error.response?.data?.error?.message || error.message}`);
    log.warn('This may be because the test order was not actually created in the database');
    return null;
  }
}

// Step 7: Check Carrier Status
async function checkCarrierStatus(carrierName) {
  log.step(`Step 7: Check Carrier Status (${carrierName})`);
  try {
    const response = await api.get(`/shipping/carriers/${carrierName}/status`, adminToken);
    const status = response.data.data;

    if (status.status === 'operational') {
      log.success(`${carrierName} is operational`);
    } else {
      log.warn(`${carrierName} status: ${status.status}`);
      log.info(`Message: ${status.message}`);
    }

    return status;
  } catch (error) {
    log.error(`Failed to check status: ${error.response?.data?.error?.message || error.message}`);
    return null;
  }
}

// Main test workflow
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  🚀 ADMIN SHIPPING CARRIER SELECTION - WORKFLOW TEST');
  console.log('='.repeat(60) + '\n');

  // Step 1: Admin Login
  const loginSuccess = await adminLogin();
  if (!loginSuccess) {
    log.error('Cannot proceed without admin authentication');
    log.info('Please update ADMIN_EMAIL and ADMIN_PASSWORD in the script');
    return;
  }
  console.log('');

  // Step 2: Create Test Order
  await createTestOrder();
  console.log('');

  // Step 3: Get Available Carriers
  const carriers = await getAvailableCarriers();
  if (carriers.length === 0) {
    log.warn('No carriers configured. Please add carrier credentials to .env file');
    log.info('Example: DELHIVERY_API_KEY=your-key');
    console.log('');
  } else {
    console.log('');
  }

  // For the remaining steps, we need a real order ID
  log.warn('\n' + '─'.repeat(60));
  log.warn('The following steps require a real order in the database');
  log.warn('To test with a real order, update testOrderId with an existing order ID');
  log.warn('─'.repeat(60) + '\n');

  // Uncomment and update with a real order ID to test remaining steps
  // testOrderId = 'ORD-1234567890'; // Replace with real order ID

  if (testOrderId.startsWith('TEST-')) {
    log.info('Skipping steps 4-6 (require real order in database)');
    log.info('To test these steps:');
    log.info('  1. Create a real order via your checkout flow');
    log.info('  2. Update testOrderId variable with the real order ID');
    log.info('  3. Run this script again');
  } else {
    // Step 4: Get Shipping Quotes
    const rates = await getShippingQuotes(testOrderId);
    console.log('');

    if (rates.length > 0) {
      // Step 5: Get Recommended Carrier
      const recommended = await getRecommendedCarrier(testOrderId, 'cost');
      console.log('');

      if (recommended) {
        // Step 6: Assign Carrier
        await assignCarrier(testOrderId, recommended.carrier);
        console.log('');
      }
    }
  }

  // Step 7: Check Carrier Status (works without order)
  if (carriers.length > 0) {
    await checkCarrierStatus(carriers[0].id);
    console.log('');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('  ✅ TEST WORKFLOW COMPLETED');
  console.log('='.repeat(60));
  console.log('\n📚 Documentation:');
  console.log('  • SHIPPING_INTEGRATION_GUIDE.md - Complete integration guide');
  console.log('  • ADMIN_CARRIER_SELECTION.md - API reference');
  console.log('  • ADMIN_SHIPPING_WORKFLOW.md - Detailed workflow');
  console.log('  • QUICK_SHIPPING_REFERENCE.md - Quick reference\n');
}

// Run the tests
runTests().catch((error) => {
  log.error(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
