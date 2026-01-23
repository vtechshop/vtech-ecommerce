/**
 * Initialize comprehensive Amazon-style system settings
 * Run this script once to populate all admin settings
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Setting = require('./src/models/Setting');

// Comprehensive settings matching Amazon's admin panel
const defaultSettings = [
  // ========== GENERAL SETTINGS ==========
  {
    key: 'site_name',
    value: 'Vtech',
    type: 'string',
    category: 'general',
    description: 'Storefront name displayed across the site',
    isPublic: true
  },
  {
    key: 'site_tagline',
    value: 'Your Trusted E-Commerce Platform',
    type: 'string',
    category: 'general',
    description: 'Brief tagline or slogan for your store',
    isPublic: true
  },
  {
    key: 'site_logo_url',
    value: '/logo.png',
    type: 'string',
    category: 'general',
    description: 'URL or path to the site logo',
    isPublic: true
  },
  {
    key: 'site_favicon_url',
    value: '/favicon.ico',
    type: 'string',
    category: 'general',
    description: 'URL or path to the site favicon',
    isPublic: true
  },
  {
    key: 'site_language',
    value: 'en',
    type: 'string',
    category: 'general',
    description: 'Default site language (en, ta, hi)',
    isPublic: true
  },
  {
    key: 'site_timezone',
    value: 'Asia/Kolkata',
    type: 'string',
    category: 'general',
    description: 'Server timezone for date/time operations',
    isPublic: false
  },
  {
    key: 'site_currency',
    value: 'INR',
    type: 'string',
    category: 'general',
    description: 'Default currency (INR, USD, EUR)',
    isPublic: true
  },
  {
    key: 'site_currency_symbol',
    value: '₹',
    type: 'string',
    category: 'general',
    description: 'Currency symbol to display',
    isPublic: true
  },
  {
    key: 'contact_email',
    value: 'vtechshop.customercare@gmail.com',
    type: 'string',
    category: 'general',
    description: 'Primary contact email for customer support',
    isPublic: true
  },
  {
    key: 'contact_phone',
    value: '+91 99445 56683',
    type: 'string',
    category: 'general',
    description: 'Primary contact phone number',
    isPublic: true
  },
  {
    key: 'contact_address',
    value: '464 Sathy Main Road, Ballannagar, Ganapathy Pudur, Ganapathy, Coimbatore, Tamil Nadu, India - 641006',
    type: 'string',
    category: 'general',
    description: 'Business address',
    isPublic: true
  },
  {
    key: 'business_hours',
    value: 'Monday - Saturday: 9:00 AM - 6:00 PM IST',
    type: 'string',
    category: 'general',
    description: 'Business operating hours',
    isPublic: true
  },
  {
    key: 'date_format',
    value: 'DD/MM/YYYY',
    type: 'string',
    category: 'general',
    description: 'Date display format',
    isPublic: true
  },
  {
    key: 'time_format',
    value: '12-hour',
    type: 'string',
    category: 'general',
    description: '12-hour or 24-hour time format',
    isPublic: true
  },

  // ========== WEBSITE SETTINGS ==========
  {
    key: 'homepage_hero_enabled',
    value: 'true',
    type: 'boolean',
    category: 'website',
    description: 'Show hero banner on homepage',
    isPublic: true
  },
  {
    key: 'homepage_hero_title',
    value: 'Welcome to Vtech',
    type: 'string',
    category: 'website',
    description: 'Hero section main title',
    isPublic: true
  },
  {
    key: 'homepage_hero_subtitle',
    value: 'Discover amazing products at great prices',
    type: 'string',
    category: 'website',
    description: 'Hero section subtitle',
    isPublic: true
  },
  {
    key: 'homepage_hero_image',
    value: '/hero-banner.jpg',
    type: 'string',
    category: 'website',
    description: 'Hero section background image URL',
    isPublic: true
  },
  {
    key: 'homepage_featured_products',
    value: 'true',
    type: 'boolean',
    category: 'website',
    description: 'Show featured products section on homepage',
    isPublic: true
  },
  {
    key: 'homepage_categories_enabled',
    value: 'true',
    type: 'boolean',
    category: 'website',
    description: 'Show categories section on homepage',
    isPublic: true
  },
  {
    key: 'products_per_page',
    value: '24',
    type: 'number',
    category: 'website',
    description: 'Number of products to display per page',
    isPublic: true
  },
  {
    key: 'enable_reviews',
    value: 'true',
    type: 'boolean',
    category: 'website',
    description: 'Allow customer reviews on products',
    isPublic: true
  },
  {
    key: 'enable_ratings',
    value: 'true',
    type: 'boolean',
    category: 'website',
    description: 'Allow customer ratings on products',
    isPublic: true
  },
  {
    key: 'enable_wishlist',
    value: 'true',
    type: 'boolean',
    category: 'website',
    description: 'Enable wishlist feature',
    isPublic: true
  },
  {
    key: 'enable_compare',
    value: 'true',
    type: 'boolean',
    category: 'website',
    description: 'Enable product comparison feature',
    isPublic: true
  },
  {
    key: 'footer_about_text',
    value: 'Vtech is your trusted e-commerce platform offering quality products at competitive prices.',
    type: 'string',
    category: 'website',
    description: 'About text displayed in footer',
    isPublic: true
  },
  {
    key: 'footer_social_facebook',
    value: '',
    type: 'string',
    category: 'website',
    description: 'Facebook page URL (to be updated)',
    isPublic: true
  },
  {
    key: 'footer_social_twitter',
    value: '',
    type: 'string',
    category: 'website',
    description: 'Twitter/X profile URL (to be updated)',
    isPublic: true
  },
  {
    key: 'footer_social_instagram',
    value: '',
    type: 'string',
    category: 'website',
    description: 'Instagram profile URL (to be updated)',
    isPublic: true
  },
  {
    key: 'footer_copyright_text',
    value: '© 2025 Vtech. All rights reserved.',
    type: 'string',
    category: 'website',
    description: 'Copyright text in footer',
    isPublic: true
  },

  // ========== ADS SETTINGS ==========
  {
    key: 'ads_enabled',
    value: 'true',
    type: 'boolean',
    category: 'ads',
    description: 'Enable sponsored ads system',
    isPublic: false
  },
  {
    key: 'ads_auto_approval',
    value: 'false',
    type: 'boolean',
    category: 'ads',
    description: 'Automatically approve vendor ad campaigns (not recommended)',
    isPublic: false
  },
  {
    key: 'ads_min_wallet_balance',
    value: '100',
    type: 'number',
    category: 'ads',
    description: 'Minimum wallet balance required to run ads (in INR)',
    isPublic: false
  },
  {
    key: 'ads_min_daily_budget',
    value: '100',
    type: 'number',
    category: 'ads',
    description: 'Minimum daily budget for campaigns (in INR)',
    isPublic: false
  },
  {
    key: 'ads_max_daily_budget',
    value: '50000',
    type: 'number',
    category: 'ads',
    description: 'Maximum daily budget for campaigns (in INR)',
    isPublic: false
  },
  {
    key: 'ads_min_bid_cpc',
    value: '5',
    type: 'number',
    category: 'ads',
    description: 'Minimum CPC (Cost Per Click) bid amount (in INR)',
    isPublic: false
  },
  {
    key: 'ads_min_bid_cpm',
    value: '100',
    type: 'number',
    category: 'ads',
    description: 'Minimum CPM (Cost Per 1000 impressions) bid amount (in INR)',
    isPublic: false
  },
  {
    key: 'ads_placement_home_top_enabled',
    value: 'true',
    type: 'boolean',
    category: 'ads',
    description: 'Enable ads at top of homepage',
    isPublic: false
  },
  {
    key: 'ads_placement_product_top_enabled',
    value: 'true',
    type: 'boolean',
    category: 'ads',
    description: 'Enable ads at top of product listing pages',
    isPublic: false
  },
  {
    key: 'ads_placement_product_sidebar_enabled',
    value: 'true',
    type: 'boolean',
    category: 'ads',
    description: 'Enable ads in product page sidebar',
    isPublic: false
  },
  {
    key: 'ads_quality_score_enabled',
    value: 'true',
    type: 'boolean',
    category: 'ads',
    description: 'Use quality score in ad auction (Amazon-style)',
    isPublic: false
  },
  {
    key: 'ads_commission_rate',
    value: '10',
    type: 'number',
    category: 'ads',
    description: 'Platform commission on ad spend (%)',
    isPublic: false
  },

  // ========== EMAIL SETTINGS ==========
  {
    key: 'email_from_name',
    value: 'Vtech',
    type: 'string',
    category: 'email',
    description: 'Sender name for outgoing emails',
    isPublic: false
  },
  {
    key: 'email_from_address',
    value: 'vtechshop.customercare@gmail.com',
    type: 'string',
    category: 'email',
    description: 'Sender email address',
    isPublic: false
  },
  {
    key: 'email_smtp_enabled',
    value: 'false',
    type: 'boolean',
    category: 'email',
    description: 'Use SMTP for sending emails (vs API)',
    isPublic: false
  },
  {
    key: 'email_smtp_host',
    value: 'smtp.gmail.com',
    type: 'string',
    category: 'email',
    description: 'SMTP server hostname',
    isPublic: false
  },
  {
    key: 'email_smtp_port',
    value: '587',
    type: 'number',
    category: 'email',
    description: 'SMTP server port',
    isPublic: false
  },
  {
    key: 'email_smtp_secure',
    value: 'true',
    type: 'boolean',
    category: 'email',
    description: 'Use TLS/SSL for SMTP',
    isPublic: false
  },
  {
    key: 'email_order_confirmation',
    value: 'true',
    type: 'boolean',
    category: 'email',
    description: 'Send order confirmation emails',
    isPublic: false
  },
  {
    key: 'email_shipping_notification',
    value: 'true',
    type: 'boolean',
    category: 'email',
    description: 'Send shipping notification emails',
    isPublic: false
  },
  {
    key: 'email_delivery_notification',
    value: 'true',
    type: 'boolean',
    category: 'email',
    description: 'Send delivery confirmation emails',
    isPublic: false
  },
  {
    key: 'email_password_reset',
    value: 'true',
    type: 'boolean',
    category: 'email',
    description: 'Send password reset emails',
    isPublic: false
  },
  {
    key: 'email_welcome_message',
    value: 'true',
    type: 'boolean',
    category: 'email',
    description: 'Send welcome email to new users',
    isPublic: false
  },
  {
    key: 'email_marketing_enabled',
    value: 'true',
    type: 'boolean',
    category: 'email',
    description: 'Enable marketing/promotional emails',
    isPublic: false
  },

  // ========== PAYMENT SETTINGS ==========
  {
    key: 'razorpay_enabled',
    value: 'true',
    type: 'boolean',
    category: 'payment',
    description: 'Enable Razorpay payment gateway',
    isPublic: false
  },
  {
    key: 'stripe_enabled',
    value: 'false',
    type: 'boolean',
    category: 'payment',
    description: 'Enable Stripe payment gateway',
    isPublic: false
  },
  // COD has been removed - all payments through Razorpay
  {
    key: 'wallet_enabled',
    value: 'true',
    type: 'boolean',
    category: 'payment',
    description: 'Enable customer wallet feature',
    isPublic: true
  },
  {
    key: 'wallet_cashback_enabled',
    value: 'true',
    type: 'boolean',
    category: 'payment',
    description: 'Enable cashback to wallet',
    isPublic: true
  },
  {
    key: 'wallet_min_recharge',
    value: '100',
    type: 'number',
    category: 'payment',
    description: 'Minimum wallet recharge amount (in INR)',
    isPublic: true
  },
  {
    key: 'wallet_max_recharge',
    value: '100000',
    type: 'number',
    category: 'payment',
    description: 'Maximum wallet recharge amount (in INR)',
    isPublic: true
  },
  {
    key: 'payment_tax_enabled',
    value: 'true',
    type: 'boolean',
    category: 'payment',
    description: 'Enable tax/GST on orders',
    isPublic: true
  },
  {
    key: 'payment_default_tax_rate',
    value: '18',
    type: 'number',
    category: 'payment',
    description: 'Default GST rate (%)',
    isPublic: true
  },
  {
    key: 'payment_processing_fee',
    value: '2',
    type: 'number',
    category: 'payment',
    description: 'Payment gateway processing fee (%)',
    isPublic: false
  },
  {
    key: 'free_shipping_threshold',
    value: '500',
    type: 'number',
    category: 'payment',
    description: 'Minimum order amount for free shipping (in INR)',
    isPublic: true
  },
  {
    key: 'free_shipping_banner',
    value: 'Shipping charges based on location (Delhivery, BlueDart)',
    type: 'string',
    category: 'payment',
    description: 'Shipping information banner',
    isPublic: true
  },

  // ========== SECURITY SETTINGS ==========
  {
    key: 'security_2fa_enabled',
    value: 'false',
    type: 'boolean',
    category: 'security',
    description: 'Enable two-factor authentication',
    isPublic: false
  },
  {
    key: 'security_session_timeout',
    value: '3600',
    type: 'number',
    category: 'security',
    description: 'Session timeout in seconds (1 hour)',
    isPublic: false
  },
  {
    key: 'security_max_login_attempts',
    value: '5',
    type: 'number',
    category: 'security',
    description: 'Maximum failed login attempts before lockout',
    isPublic: false
  },
  {
    key: 'security_lockout_duration',
    value: '1800',
    type: 'number',
    category: 'security',
    description: 'Account lockout duration in seconds (30 min)',
    isPublic: false
  },
  {
    key: 'security_password_min_length',
    value: '8',
    type: 'number',
    category: 'security',
    description: 'Minimum password length',
    isPublic: false
  },
  {
    key: 'security_password_require_uppercase',
    value: 'true',
    type: 'boolean',
    category: 'security',
    description: 'Require uppercase letter in password',
    isPublic: false
  },
  {
    key: 'security_password_require_number',
    value: 'true',
    type: 'boolean',
    category: 'security',
    description: 'Require number in password',
    isPublic: false
  },
  {
    key: 'security_password_require_special',
    value: 'false',
    type: 'boolean',
    category: 'security',
    description: 'Require special character in password',
    isPublic: false
  },
  {
    key: 'security_rate_limit_enabled',
    value: 'true',
    type: 'boolean',
    category: 'security',
    description: 'Enable API rate limiting',
    isPublic: false
  },
  {
    key: 'security_rate_limit_requests',
    value: '100',
    type: 'number',
    category: 'security',
    description: 'Max requests per window',
    isPublic: false
  },
  {
    key: 'security_rate_limit_window',
    value: '900',
    type: 'number',
    category: 'security',
    description: 'Rate limit window in seconds (15 min)',
    isPublic: false
  },
  {
    key: 'security_ssl_enabled',
    value: 'true',
    type: 'boolean',
    category: 'security',
    description: 'Enforce HTTPS/SSL connections',
    isPublic: false
  },
  {
    key: 'security_cors_enabled',
    value: 'true',
    type: 'boolean',
    category: 'security',
    description: 'Enable CORS',
    isPublic: false
  },

  // ========== NOTIFICATIONS SETTINGS ==========
  {
    key: 'notifications_push_enabled',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Enable push notifications',
    isPublic: false
  },
  {
    key: 'notifications_sms_enabled',
    value: 'false',
    type: 'boolean',
    category: 'notifications',
    description: 'Enable SMS notifications',
    isPublic: false
  },
  {
    key: 'notifications_order_status',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify on order status changes',
    isPublic: true
  },
  {
    key: 'notifications_low_stock',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify vendors on low stock',
    isPublic: false
  },
  {
    key: 'notifications_new_review',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify vendors on new reviews',
    isPublic: false
  },
  {
    key: 'notifications_new_order',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify vendors on new orders',
    isPublic: false
  },
  {
    key: 'notifications_promotional',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Send promotional notifications to customers',
    isPublic: true
  },
  {
    key: 'notifications_wishlist_price_drop',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify on wishlist item price drops',
    isPublic: true
  },
  {
    key: 'notifications_back_in_stock',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Notify when out-of-stock items return',
    isPublic: true
  },
  {
    key: 'notifications_newsletter_enabled',
    value: 'true',
    type: 'boolean',
    category: 'notifications',
    description: 'Enable newsletter subscriptions',
    isPublic: true
  },
];

async function initializeSettings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🚀 Initializing comprehensive settings...');
    console.log(`📊 Total settings to create: ${defaultSettings.length}\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const setting of defaultSettings) {
      const existing = await Setting.findOne({ key: setting.key });

      if (existing) {
        // Update existing setting if value changed
        if (existing.value !== setting.value || existing.description !== setting.description) {
          await Setting.updateOne(
            { key: setting.key },
            { $set: setting }
          );
          console.log(`🔄 Updated: ${setting.key} (${setting.category})`);
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new setting
        await Setting.create(setting);
        console.log(`✨ Created: ${setting.key} (${setting.category})`);
        created++;
      }
    }

    console.log('\n✅ Settings initialization complete!');
    console.log(`   - Created: ${created}`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Total: ${defaultSettings.length}`);

    // Display summary by category
    console.log('\n📋 Settings by category:');
    const categories = {};
    defaultSettings.forEach(s => {
      categories[s.category] = (categories[s.category] || 0) + 1;
    });
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   - ${cat}: ${count} settings`);
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error initializing settings:', error);
    process.exit(1);
  }
}

// Run initialization
initializeSettings();
