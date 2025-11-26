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

// Only allow fallbacks in development/test, enforce in production
const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 8080,
  APP_URL: process.env.APP_URL || 'http://localhost:8080',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/shop',

  // CRITICAL: No fallbacks for JWT secrets - must be set in .env
  JWT_ACCESS_SECRET: validateSecret('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET || (isDevelopment ? process.env.ACCESS_TOKEN_SECRET : null)),
  JWT_REFRESH_SECRET: validateSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET || (isDevelopment ? process.env.REFRESH_TOKEN_SECRET : null)),
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL || process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM || 'VTech Shop <noreply@vtechshop.com>',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@vtechshop.com',
  SUPPORT_PHONE: process.env.SUPPORT_PHONE || '+1-800-VTECH-00',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@vtechshop.com',
  
  UPLOAD_DRIVER: process.env.UPLOAD_DRIVER || 'local',
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_KEY: process.env.S3_KEY,
  S3_SECRET: process.env.S3_SECRET,
  
  STRIPE_KEY: process.env.STRIPE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  
  GA4_MEASUREMENT_ID: process.env.GA4_MEASUREMENT_ID,
  META_PIXEL_ID: process.env.META_PIXEL_ID,
  
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  AD_CLICK_SESSION_TTL_MIN: parseInt(process.env.AD_CLICK_SESSION_TTL_MIN) || 30,
  AD_BUDGET_MIN: parseFloat(process.env.AD_BUDGET_MIN) || 100,

  AFFILIATE_WINDOW_DAYS: parseInt(process.env.AFFILIATE_WINDOW_DAYS) || 30,

  // Order settings (configurable)
  DEFAULT_TAX_RATE: parseFloat(process.env.DEFAULT_TAX_RATE) || 0.10, // 10% default
  DEFAULT_SHIPPING_COST: parseFloat(process.env.DEFAULT_SHIPPING_COST) || 5.99,
  MAX_QTY_PER_ITEM: parseInt(process.env.MAX_QTY_PER_ITEM) || 100,
  MAX_ITEMS_PER_ORDER: parseInt(process.env.MAX_ITEMS_PER_ORDER) || 50,
};