const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const Setting = require('../src/models/Setting');

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';
    await mongoose.connect(uri);
    console.log('[seed] Connected:', uri);

    const defaults = [
      // ==================== GENERAL SETTINGS ====================
      { key: 'site_name', value: 'V-Tech Shop', type: 'string', category: 'general', description: 'Website/Store name displayed across the site', isPublic: true },
      { key: 'site_tagline', value: 'Your one-stop multi-vendor marketplace', type: 'string', category: 'general', description: 'Site tagline/slogan', isPublic: true },
      { key: 'site_logo', value: '/images/logo.png', type: 'string', category: 'general', description: 'Path to site logo image', isPublic: true },
      { key: 'site_favicon', value: '/favicon.ico', type: 'string', category: 'general', description: 'Path to favicon', isPublic: true },
      { key: 'site_timezone', value: 'Asia/Kolkata', type: 'string', category: 'general', description: 'Default timezone for the site' },
      { key: 'site_language', value: 'en', type: 'string', category: 'general', description: 'Default language code', isPublic: true },
      { key: 'site_currency', value: 'INR', type: 'string', category: 'general', description: 'Default currency code', isPublic: true },
      { key: 'site_currency_symbol', value: '₹', type: 'string', category: 'general', description: 'Currency symbol', isPublic: true },
      { key: 'free_shipping_banner', value: 'Free shipping on orders over ₹500', type: 'string', category: 'general', description: 'Free shipping banner text', isPublic: true },
      { key: 'contact_email', value: 'support@vtech.shop', type: 'string', category: 'general', description: 'Primary contact email' },
      { key: 'contact_phone', value: '+91 99445 56683', type: 'string', category: 'general', description: 'Primary contact phone', isPublic: true },
      { key: 'business_address', value: 'Chennai, Tamil Nadu, India', type: 'string', category: 'general', description: 'Business address', isPublic: true },

      // ==================== WEBSITE SETTINGS ====================
      { key: 'website_homepage_banner_enabled', value: true, type: 'boolean', category: 'website', description: 'Show homepage hero banner' },
      { key: 'website_homepage_banner_text', value: 'Welcome to V-Tech Shop!', type: 'string', category: 'website', description: 'Homepage banner text', isPublic: true },
      { key: 'website_featured_categories_count', value: 8, type: 'number', category: 'website', description: 'Number of featured categories on homepage' },
      { key: 'website_products_per_page', value: 12, type: 'number', category: 'website', description: 'Products to show per page', isPublic: true },
      { key: 'website_show_vendor_info', value: true, type: 'boolean', category: 'website', description: 'Show vendor info on product pages', isPublic: true },
      { key: 'website_show_stock_count', value: true, type: 'boolean', category: 'website', description: 'Show stock availability count', isPublic: true },
      { key: 'website_enable_reviews', value: true, type: 'boolean', category: 'website', description: 'Enable product reviews', isPublic: true },
      { key: 'website_enable_wishlist', value: true, type: 'boolean', category: 'website', description: 'Enable wishlist feature', isPublic: true },
      { key: 'website_enable_compare', value: false, type: 'boolean', category: 'website', description: 'Enable product compare feature', isPublic: true },
      { key: 'website_footer_text', value: '© 2024 V-Tech Shop. All rights reserved.', type: 'string', category: 'website', description: 'Footer copyright text', isPublic: true },
      { key: 'website_social_facebook', value: 'https://facebook.com/vtechshop', type: 'string', category: 'website', description: 'Facebook page URL', isPublic: true },
      { key: 'website_social_instagram', value: 'https://instagram.com/vtechshop', type: 'string', category: 'website', description: 'Instagram profile URL', isPublic: true },
      { key: 'website_social_twitter', value: 'https://twitter.com/vtechshop', type: 'string', category: 'website', description: 'Twitter profile URL', isPublic: true },

      // ==================== PAYMENT SETTINGS ====================
      { key: 'payment_razorpay_enabled', value: true, type: 'boolean', category: 'payment', description: 'Enable Razorpay payment gateway' },
      { key: 'payment_razorpay_key_id', value: '', type: 'string', category: 'payment', description: 'Razorpay Key ID (set in .env)' },
      { key: 'payment_razorpay_test_mode', value: true, type: 'boolean', category: 'payment', description: 'Use Razorpay test mode' },
      { key: 'payment_stripe_enabled', value: false, type: 'boolean', category: 'payment', description: 'Enable Stripe payment gateway' },
      { key: 'payment_stripe_test_mode', value: true, type: 'boolean', category: 'payment', description: 'Use Stripe test mode' },
      { key: 'payment_cod_enabled', value: true, type: 'boolean', category: 'payment', description: 'Enable Cash on Delivery', isPublic: true },
      { key: 'payment_cod_min_order', value: 100, type: 'number', category: 'payment', description: 'Minimum order amount for COD' },
      { key: 'payment_cod_max_order', value: 50000, type: 'number', category: 'payment', description: 'Maximum order amount for COD' },
      { key: 'payment_wallet_enabled', value: false, type: 'boolean', category: 'payment', description: 'Enable wallet payments' },
      { key: 'payment_auto_capture', value: true, type: 'boolean', category: 'payment', description: 'Auto-capture payments on success' },

      // ==================== SHIPPING SETTINGS ====================
      { key: 'shipping_flat_rate_enabled', value: true, type: 'boolean', category: 'shipping', description: 'Enable flat rate shipping' },
      { key: 'shipping_flat_rate_amount', value: 49, type: 'number', category: 'shipping', description: 'Flat rate shipping cost', isPublic: true },
      { key: 'shipping_free_shipping_enabled', value: true, type: 'boolean', category: 'shipping', description: 'Enable free shipping threshold', isPublic: true },
      { key: 'shipping_free_shipping_min', value: 500, type: 'number', category: 'shipping', description: 'Minimum order for free shipping', isPublic: true },
      { key: 'shipping_shiprocket_enabled', value: true, type: 'boolean', category: 'shipping', description: 'Enable Shiprocket integration' },
      { key: 'shipping_shiprocket_channel_id', value: '', type: 'string', category: 'shipping', description: 'Shiprocket channel ID' },
      { key: 'shipping_default_weight', value: 500, type: 'number', category: 'shipping', description: 'Default product weight in grams' },
      { key: 'shipping_default_dimensions', value: { length: 10, breadth: 10, height: 10 }, type: 'json', category: 'shipping', description: 'Default package dimensions (cm)' },
      { key: 'shipping_countries', value: ['IN'], type: 'array', category: 'shipping', description: 'Countries available for shipping' },
      { key: 'shipping_estimate_days_min', value: 3, type: 'number', category: 'shipping', description: 'Minimum delivery days', isPublic: true },
      { key: 'shipping_estimate_days_max', value: 7, type: 'number', category: 'shipping', description: 'Maximum delivery days', isPublic: true },

      // ==================== EMAIL SETTINGS ====================
      { key: 'email_from_name', value: 'V-Tech Shop', type: 'string', category: 'email', description: 'Email sender name' },
      { key: 'email_from_address', value: 'no-reply@vtech.shop', type: 'string', category: 'email', description: 'Email sender address' },
      { key: 'email_reply_to', value: 'support@vtech.shop', type: 'string', category: 'email', description: 'Reply-to email address' },
      { key: 'email_smtp_host', value: 'smtp.gmail.com', type: 'string', category: 'email', description: 'SMTP server host' },
      { key: 'email_smtp_port', value: 587, type: 'number', category: 'email', description: 'SMTP server port' },
      { key: 'email_smtp_secure', value: false, type: 'boolean', category: 'email', description: 'Use SSL/TLS for SMTP' },
      { key: 'email_smtp_user', value: '', type: 'string', category: 'email', description: 'SMTP username (set in .env)' },
      { key: 'email_order_confirmation', value: true, type: 'boolean', category: 'email', description: 'Send order confirmation emails' },
      { key: 'email_shipping_updates', value: true, type: 'boolean', category: 'email', description: 'Send shipping update emails' },
      { key: 'email_vendor_notifications', value: true, type: 'boolean', category: 'email', description: 'Send notifications to vendors' },
      { key: 'email_admin_new_order', value: true, type: 'boolean', category: 'email', description: 'Notify admin on new orders' },
      { key: 'email_weekly_report', value: true, type: 'boolean', category: 'email', description: 'Send weekly sales report' },

      // ==================== SEO SETTINGS ====================
      { key: 'seo_meta_title', value: 'V-Tech Shop – Multi-Vendor Marketplace', type: 'string', category: 'seo', description: 'Default meta title', isPublic: true },
      { key: 'seo_meta_description', value: 'Discover amazing products from multiple vendors. Shop electronics, fashion, home & more.', type: 'string', category: 'seo', description: 'Default meta description', isPublic: true },
      { key: 'seo_meta_keywords', value: 'shopping, ecommerce, multi-vendor, marketplace, online store', type: 'string', category: 'seo', description: 'Default meta keywords', isPublic: true },
      { key: 'seo_google_analytics_id', value: '', type: 'string', category: 'seo', description: 'Google Analytics tracking ID' },
      { key: 'seo_google_tag_manager_id', value: '', type: 'string', category: 'seo', description: 'Google Tag Manager ID' },
      { key: 'seo_facebook_pixel_id', value: '', type: 'string', category: 'seo', description: 'Facebook Pixel ID' },
      { key: 'seo_enable_sitemap', value: true, type: 'boolean', category: 'seo', description: 'Auto-generate sitemap' },
      { key: 'seo_enable_robots_txt', value: true, type: 'boolean', category: 'seo', description: 'Enable robots.txt' },
      { key: 'seo_canonical_url', value: 'https://vtech.shop', type: 'string', category: 'seo', description: 'Canonical base URL' },
      { key: 'seo_og_image', value: '/images/og-image.jpg', type: 'string', category: 'seo', description: 'Default Open Graph image', isPublic: true },

      // ==================== SECURITY SETTINGS ====================
      { key: 'security_enable_2fa', value: true, type: 'boolean', category: 'security', description: 'Enable two-factor authentication' },
      { key: 'security_2fa_methods', value: ['email', 'authenticator'], type: 'array', category: 'security', description: 'Available 2FA methods' },
      { key: 'security_session_timeout', value: 24, type: 'number', category: 'security', description: 'Session timeout in hours' },
      { key: 'security_max_login_attempts', value: 5, type: 'number', category: 'security', description: 'Max failed login attempts before lockout' },
      { key: 'security_lockout_duration', value: 30, type: 'number', category: 'security', description: 'Account lockout duration in minutes' },
      { key: 'security_password_min_length', value: 8, type: 'number', category: 'security', description: 'Minimum password length' },
      { key: 'security_password_require_special', value: false, type: 'boolean', category: 'security', description: 'Require special characters in password' },
      { key: 'security_enable_captcha', value: false, type: 'boolean', category: 'security', description: 'Enable CAPTCHA on forms' },
      { key: 'security_captcha_site_key', value: '', type: 'string', category: 'security', description: 'reCAPTCHA site key' },
      { key: 'security_rate_limit_requests', value: 100, type: 'number', category: 'security', description: 'API rate limit per minute' },
      { key: 'security_rate_limit_window', value: 60, type: 'number', category: 'security', description: 'Rate limit window in seconds' },
      { key: 'security_allowed_origins', value: ['http://localhost:5173', 'https://vtech.shop'], type: 'array', category: 'security', description: 'CORS allowed origins' },

      // ==================== NOTIFICATIONS SETTINGS ====================
      { key: 'notifications_push_enabled', value: true, type: 'boolean', category: 'notifications', description: 'Enable push notifications' },
      { key: 'notifications_push_vapid_public', value: '', type: 'string', category: 'notifications', description: 'VAPID public key for web push' },
      { key: 'notifications_email_enabled', value: true, type: 'boolean', category: 'notifications', description: 'Enable email notifications' },
      { key: 'notifications_sms_enabled', value: false, type: 'boolean', category: 'notifications', description: 'Enable SMS notifications' },
      { key: 'notifications_sms_provider', value: 'twilio', type: 'string', category: 'notifications', description: 'SMS provider (twilio, msg91)' },
      { key: 'notifications_whatsapp_enabled', value: false, type: 'boolean', category: 'notifications', description: 'Enable WhatsApp notifications' },
      { key: 'notifications_order_placed', value: true, type: 'boolean', category: 'notifications', description: 'Notify on new order' },
      { key: 'notifications_order_shipped', value: true, type: 'boolean', category: 'notifications', description: 'Notify on order shipped' },
      { key: 'notifications_order_delivered', value: true, type: 'boolean', category: 'notifications', description: 'Notify on order delivered' },
      { key: 'notifications_low_stock_threshold', value: 10, type: 'number', category: 'notifications', description: 'Low stock alert threshold' },
      { key: 'notifications_admin_digest', value: 'daily', type: 'string', category: 'notifications', description: 'Admin digest frequency (daily, weekly, off)' },

      // ==================== FEATURES SETTINGS ====================
      { key: 'features_multi_vendor', value: true, type: 'boolean', category: 'features', description: 'Enable multi-vendor marketplace', isPublic: true },
      { key: 'features_vendor_registration', value: true, type: 'boolean', category: 'features', description: 'Allow new vendor registrations', isPublic: true },
      { key: 'features_affiliate_program', value: true, type: 'boolean', category: 'features', description: 'Enable affiliate program', isPublic: true },
      { key: 'features_affiliate_commission', value: 5, type: 'number', category: 'features', description: 'Default affiliate commission %' },
      { key: 'features_product_reviews', value: true, type: 'boolean', category: 'features', description: 'Enable product reviews', isPublic: true },
      { key: 'features_review_approval', value: false, type: 'boolean', category: 'features', description: 'Require review approval' },
      { key: 'features_coupons', value: true, type: 'boolean', category: 'features', description: 'Enable coupon codes', isPublic: true },
      { key: 'features_gift_cards', value: false, type: 'boolean', category: 'features', description: 'Enable gift cards' },
      { key: 'features_subscriptions', value: false, type: 'boolean', category: 'features', description: 'Enable subscription products' },
      { key: 'features_live_chat', value: false, type: 'boolean', category: 'features', description: 'Enable live chat support' },
      { key: 'features_blog', value: true, type: 'boolean', category: 'features', description: 'Enable blog section', isPublic: true },
      { key: 'features_support_tickets', value: true, type: 'boolean', category: 'features', description: 'Enable support ticket system', isPublic: true },
      { key: 'features_sponsored_ads', value: true, type: 'boolean', category: 'features', description: 'Enable sponsored product ads' },

      // ==================== MAINTENANCE SETTINGS ====================
      { key: 'maintenance_mode', value: false, type: 'boolean', category: 'maintenance', description: 'Enable maintenance mode', isPublic: true },
      { key: 'maintenance_message', value: 'We are currently performing scheduled maintenance. Please check back soon!', type: 'string', category: 'maintenance', description: 'Maintenance mode message', isPublic: true },
      { key: 'maintenance_allowed_ips', value: [], type: 'array', category: 'maintenance', description: 'IPs allowed during maintenance' },
      { key: 'maintenance_expected_end', value: null, type: 'string', category: 'maintenance', description: 'Expected maintenance end time' },
      { key: 'maintenance_auto_backup', value: true, type: 'boolean', category: 'maintenance', description: 'Auto backup before maintenance' },
      { key: 'maintenance_backup_frequency', value: 'daily', type: 'string', category: 'maintenance', description: 'Backup frequency (hourly, daily, weekly)' },
      { key: 'maintenance_backup_retention', value: 7, type: 'number', category: 'maintenance', description: 'Backup retention days' },
      { key: 'maintenance_debug_mode', value: false, type: 'boolean', category: 'maintenance', description: 'Enable debug mode (dev only)' },
      { key: 'maintenance_log_level', value: 'info', type: 'string', category: 'maintenance', description: 'Logging level (debug, info, warn, error)' },

      // ==================== INTEGRATIONS SETTINGS ====================
      { key: 'integrations_google_oauth', value: false, type: 'boolean', category: 'integrations', description: 'Enable Google OAuth login' },
      { key: 'integrations_google_client_id', value: '', type: 'string', category: 'integrations', description: 'Google OAuth client ID' },
      { key: 'integrations_facebook_oauth', value: false, type: 'boolean', category: 'integrations', description: 'Enable Facebook OAuth login' },
      { key: 'integrations_facebook_app_id', value: '', type: 'string', category: 'integrations', description: 'Facebook App ID' },
      { key: 'integrations_shiprocket_api', value: true, type: 'boolean', category: 'integrations', description: 'Enable Shiprocket API' },
      { key: 'integrations_appyflow_gst', value: true, type: 'boolean', category: 'integrations', description: 'Enable AppyFlow GST verification' },
      { key: 'integrations_cloudinary', value: true, type: 'boolean', category: 'integrations', description: 'Enable Cloudinary for images' },
      { key: 'integrations_cloudinary_cloud_name', value: '', type: 'string', category: 'integrations', description: 'Cloudinary cloud name' },
      { key: 'integrations_aws_s3', value: false, type: 'boolean', category: 'integrations', description: 'Enable AWS S3 for storage' },
      { key: 'integrations_aws_bucket', value: '', type: 'string', category: 'integrations', description: 'AWS S3 bucket name' },
      { key: 'integrations_mailchimp', value: false, type: 'boolean', category: 'integrations', description: 'Enable Mailchimp integration' },
      { key: 'integrations_slack_webhook', value: '', type: 'string', category: 'integrations', description: 'Slack webhook URL for alerts' },

      // ==================== ADS SETTINGS ====================
      { key: 'ads_enabled', value: true, type: 'boolean', category: 'ads', description: 'Enable sponsored ads system', isPublic: true },
      { key: 'ads_approval_required', value: true, type: 'boolean', category: 'ads', description: 'Require admin approval for ads' },
      { key: 'ads_min_budget', value: 500, type: 'number', category: 'ads', description: 'Minimum ad campaign budget (INR)' },
      { key: 'ads_max_daily_spend', value: 10000, type: 'number', category: 'ads', description: 'Maximum daily spend per vendor' },
      { key: 'ads_default_cpc', value: 2, type: 'number', category: 'ads', description: 'Default cost per click (INR)' },
      { key: 'ads_default_cpm', value: 50, type: 'number', category: 'ads', description: 'Default cost per 1000 impressions (INR)' },
      { key: 'ads_homepage_slots', value: 4, type: 'number', category: 'ads', description: 'Number of homepage ad slots' },
      { key: 'ads_search_slots', value: 3, type: 'number', category: 'ads', description: 'Sponsored products in search results' },
      { key: 'ads_category_slots', value: 4, type: 'number', category: 'ads', description: 'Sponsored products per category' },
      { key: 'ads_click_fraud_threshold', value: 10, type: 'number', category: 'ads', description: 'Max clicks from same IP per hour' },
    ];

    let created = 0;
    let updated = 0;

    for (const s of defaults) {
      const result = await Setting.updateOne(
        { key: s.key },
        { $setOnInsert: s },
        { upsert: true }
      );
      if (result.upsertedCount > 0) created++;
      else updated++;
    }

    console.log(`✅ Settings seeded: ${created} created, ${updated} already existed`);
    console.log(`   Total settings: ${defaults.length}`);
    console.log(`   Categories: general, website, payment, shipping, email, seo, security, notifications, features, maintenance, integrations, ads`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
