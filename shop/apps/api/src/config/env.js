require('dotenv').config();

// SECURITY: Validate critical secrets on startup
function validateSecret(name, value, minLength = 64) {
  if (!value || value.length < minLength) {
    throw new Error(
      `CRITICAL SECURITY ERROR: ${name} must be set in .env and be at least ${minLength} characters long.\n` +
      `Generate a secure secret using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }
  return value;
}

// Enforce strict security in production
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 8080,
  // API URL (backend) - used for sitemap index locations pointing to API
  APP_URL: process.env.APP_URL || 'http://localhost:8080',
  // Client URL (frontend) - used for sitemap page URLs that users visit
  CLIENT_URL: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173',

  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/shop',

  // CRITICAL: No fallbacks for JWT secrets in production - must be set in .env
  JWT_ACCESS_SECRET: isProduction
    ? validateSecret('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET)
    : (process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET || 'dev-access-secret-change-in-production'),
  JWT_REFRESH_SECRET: isProduction
    ? validateSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET)
    : (process.env.JWT_REFRESH_SECRET || process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-change-in-production'),
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL || process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  
  MAILERSEND_API_KEY: process.env.MAILERSEND_API_KEY,
  MAIL_FROM: process.env.MAIL_FROM || 'V-Tech <noreply@vtechkitchen.com>',
  REPLY_TO_EMAIL: process.env.REPLY_TO_EMAIL,
  REPLY_TO_NAME: process.env.REPLY_TO_NAME || 'VTech Support',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'vtechshop.customercare@gmail.com',
  SUPPORT_PHONE: process.env.SUPPORT_PHONE || '+91 9944556683',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'vtechshop.customercare@gmail.com',
  
  UPLOAD_DRIVER: process.env.UPLOAD_DRIVER || 'local',

  // Cloudinary config
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // S3 config
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_KEY: process.env.S3_KEY,
  S3_SECRET: process.env.S3_SECRET,

  GA4_MEASUREMENT_ID: process.env.GA4_MEASUREMENT_ID,
  META_PIXEL_ID: process.env.META_PIXEL_ID,
  
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  AD_CLICK_SESSION_TTL_MIN: parseInt(process.env.AD_CLICK_SESSION_TTL_MIN) || 30,
  AD_BUDGET_MIN: parseFloat(process.env.AD_BUDGET_MIN) || 100,

  AFFILIATE_WINDOW_DAYS: parseInt(process.env.AFFILIATE_WINDOW_DAYS) || 30,

  // AppyFlow GST Verification
  APPYFLOW_KEY_SECRET: process.env.APPYFLOW_KEY_SECRET || '',

  // Order settings (configurable)
  DEFAULT_TAX_RATE: parseFloat(process.env.DEFAULT_TAX_RATE) || 0.10, // 10% default
  DEFAULT_SHIPPING_COST: parseFloat(process.env.DEFAULT_SHIPPING_COST) || 5.99,
  MAX_QTY_PER_ITEM: parseInt(process.env.MAX_QTY_PER_ITEM) || 100,
  MAX_ITEMS_PER_ORDER: parseInt(process.env.MAX_ITEMS_PER_ORDER) || 50,

  // Shipping settings
  FREE_SHIPPING_THRESHOLD: parseFloat(process.env.FREE_SHIPPING_THRESHOLD) || 2000,
  FREE_SHIPPING_SUBTOTAL: parseFloat(process.env.FREE_SHIPPING_SUBTOTAL) || 8000,
  DEFAULT_ORIGIN_ZIP: process.env.DEFAULT_ORIGIN_ZIP || '110001',
  DEFAULT_PACKAGE_LENGTH: parseInt(process.env.DEFAULT_PACKAGE_LENGTH) || 20,
  DEFAULT_PACKAGE_BREADTH: parseInt(process.env.DEFAULT_PACKAGE_BREADTH) || 15,
  DEFAULT_PACKAGE_HEIGHT: parseInt(process.env.DEFAULT_PACKAGE_HEIGHT) || 10,

  // Payout settings
  MIN_PAYOUT_AMOUNT: parseFloat(process.env.MIN_PAYOUT_AMOUNT) || 500,

  // Delhivery Shipping Integration
  DELHIVERY_TEST_TOKEN: process.env.DELHIVERY_TEST_TOKEN,
  DELHIVERY_LIVE_TOKEN: process.env.DELHIVERY_LIVE_TOKEN,
};