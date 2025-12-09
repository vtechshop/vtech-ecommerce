/**
 * Shipping Setup Verification Script
 *
 * This script verifies that your shipping carriers are properly configured
 * and shows you what will be available when the server starts.
 *
 * Usage: node verify-shipping-setup.js
 */

// Load .env file manually (no dependencies required)
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'apps', 'api', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    // Skip comments and empty lines
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

console.log('\n' + '='.repeat(70));
console.log(`${colors.bold}${colors.cyan}  🚚 SHIPPING CARRIER CONFIGURATION VERIFICATION${colors.reset}`);
console.log('='.repeat(70) + '\n');

// Check Delhivery
console.log(`${colors.bold}1. Delhivery (India's Leading Logistics)${colors.reset}`);
if (process.env.DELHIVERY_API_KEY) {
  console.log(`   ${colors.green}✅ Status: CONFIGURED${colors.reset}`);
  console.log(`   📋 API Key: ${process.env.DELHIVERY_API_KEY.substring(0, 15)}...`);
  console.log(`   🌐 API URL: ${process.env.DELHIVERY_API_URL}`);
  console.log(`   🌐 Surface API: ${process.env.DELHIVERY_SURFACE_API_URL}`);
  console.log(`   ${colors.green}   → Will be available in your admin panel${colors.reset}`);
} else {
  console.log(`   ${colors.red}❌ Status: NOT CONFIGURED${colors.reset}`);
  console.log(`   ${colors.yellow}   → Add DELHIVERY_API_KEY to .env${colors.reset}`);
}

console.log('');

// Check Shiprocket
console.log(`${colors.bold}2. Shiprocket (Multi-carrier Aggregator)${colors.reset}`);
if (process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD) {
  console.log(`   ${colors.green}✅ Status: CONFIGURED${colors.reset}`);
  console.log(`   📧 Email: ${process.env.SHIPROCKET_EMAIL}`);
  console.log(`   🔒 Password: ${'*'.repeat(process.env.SHIPROCKET_PASSWORD.length)}`);
  console.log(`   ${colors.green}   → Will be available in your admin panel${colors.reset}`);
} else {
  console.log(`   ${colors.yellow}⚠️  Status: NOT CONFIGURED${colors.reset}`);
  console.log(`   ${colors.yellow}   → Optional: Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD${colors.reset}`);
  console.log(`   ${colors.blue}   → Benefits: Access to multiple carriers via single API${colors.reset}`);
}

console.log('');

// Check BlueDart
console.log(`${colors.bold}3. BlueDart Express (Premium Courier)${colors.reset}`);
if (process.env.BLUEDART_LICENSE_KEY && process.env.BLUEDART_LOGIN_ID) {
  console.log(`   ${colors.green}✅ Status: CONFIGURED${colors.reset}`);
  console.log(`   🔑 License: ${process.env.BLUEDART_LICENSE_KEY.substring(0, 10)}...`);
  console.log(`   👤 Login ID: ${process.env.BLUEDART_LOGIN_ID}`);
  console.log(`   ${colors.yellow}   ⚠️  Note: SOAP integration pending - using mock${colors.reset}`);
} else {
  console.log(`   ${colors.yellow}⚠️  Status: NOT CONFIGURED${colors.reset}`);
  console.log(`   ${colors.yellow}   → Optional: Add BLUEDART_LICENSE_KEY and BLUEDART_LOGIN_ID${colors.reset}`);
  console.log(`   ${colors.blue}   → Benefits: Premium express delivery (1-2 days)${colors.reset}`);
}

console.log('\n' + '='.repeat(70));

// Count configured carriers
const configuredCarriers = [
  process.env.DELHIVERY_API_KEY ? 'Delhivery' : null,
  (process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD) ? 'Shiprocket' : null,
  (process.env.BLUEDART_LICENSE_KEY && process.env.BLUEDART_LOGIN_ID) ? 'BlueDart' : null,
].filter(Boolean);

console.log(`${colors.bold}📊 SUMMARY${colors.reset}`);
console.log('='.repeat(70));
console.log(`${colors.bold}Configured Carriers: ${configuredCarriers.length}${colors.reset}`);
if (configuredCarriers.length > 0) {
  configuredCarriers.forEach(carrier => {
    console.log(`  ${colors.green}✅ ${carrier}${colors.reset}`);
  });
} else {
  console.log(`  ${colors.red}❌ No carriers configured!${colors.reset}`);
  console.log(`  ${colors.yellow}   → Add at least one carrier to .env file${colors.reset}`);
}

console.log('\n' + '='.repeat(70));
console.log(`${colors.bold}🚀 NEXT STEPS${colors.reset}`);
console.log('='.repeat(70));

if (configuredCarriers.length > 0) {
  console.log(`${colors.green}✅ Your shipping system is ready!${colors.reset}\n`);
  console.log('1. Start your server:');
  console.log(`   ${colors.cyan}cd apps/api && npm start${colors.reset}\n`);
  console.log('2. Look for this in server logs:');
  configuredCarriers.forEach(carrier => {
    console.log(`   ${colors.green}✅ ${carrier} adapter initialized${colors.reset}`);
  });
  console.log('\n3. Test the API:');
  console.log(`   ${colors.cyan}node test-shipping-workflow.js${colors.reset}\n`);
  console.log('4. Use the admin endpoints:');
  console.log(`   GET  /api/shipping/carriers          ${colors.blue}(List carriers)${colors.reset}`);
  console.log(`   GET  /api/shipping/orders/:id/quotes ${colors.blue}(Get rates)${colors.reset}`);
  console.log(`   POST /api/shipping/orders/:id/assign-carrier ${colors.blue}(Choose carrier)${colors.reset}`);
} else {
  console.log(`${colors.yellow}⚠️  No carriers configured yet${colors.reset}\n`);
  console.log('1. Add Delhivery configuration to apps/api/.env:');
  console.log(`   ${colors.cyan}DELHIVERY_API_KEY=your-api-key-here${colors.reset}\n`);
  console.log('2. Get your API key:');
  console.log(`   ${colors.blue}https://www.delhivery.com/app/settings/api${colors.reset}\n`);
  console.log('3. Restart this verification:');
  console.log(`   ${colors.cyan}node verify-shipping-setup.js${colors.reset}`);
}

console.log('\n' + '='.repeat(70));
console.log(`${colors.bold}📚 DOCUMENTATION${colors.reset}`);
console.log('='.repeat(70));
console.log(`  ${colors.cyan}QUICK_SHIPPING_REFERENCE.md${colors.reset}      - Quick start guide`);
console.log(`  ${colors.cyan}ADMIN_SHIPPING_WORKFLOW.md${colors.reset}       - Your workflow explained`);
console.log(`  ${colors.cyan}SHIPPING_INTEGRATION_GUIDE.md${colors.reset}    - Complete integration guide`);
console.log(`  ${colors.cyan}SHIPPING_SYSTEM_README.md${colors.reset}        - System overview`);
console.log('='.repeat(70) + '\n');

// Exit with appropriate code
process.exit(configuredCarriers.length > 0 ? 0 : 1);
