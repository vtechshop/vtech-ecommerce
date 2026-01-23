// FILE: apps/api/src/seed/seedSettings.js
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const logger = require('../config/logger');
const Setting = require('../models/Setting');

const defaultSettings = [
  // GENERAL SETTINGS
  {
    key: 'site.name',
    value: 'Shop - Multi-Vendor Marketplace',
    type: 'string',
    category: 'general',
    description: 'The name of your e-commerce platform',
    isPublic: true,
  },
  {
    key: 'site.tagline',
    value: 'Buy and Sell with Confidence',
    type: 'string',
    category: 'general',
    description: 'Site tagline displayed in header',
    isPublic: true,
  },
  {
    key: 'site.timezone',
    value: 'Asia/Kolkata',
    type: 'string',
    category: 'general',
    description: 'Default timezone for the platform',
    isPublic: false,
  },
  {
    key: 'site.language',
    value: 'en',
    type: 'string',
    category: 'general',
    description: 'Default language code',
    isPublic: true,
  },
  {
    key: 'site.currency',
    value: 'INR',
    type: 'string',
    category: 'general',
    description: 'Default currency code',
    isPublic: true,
  },

  // PAYMENT SETTINGS
  {
    key: 'payment.stripe.enabled',
    value: true,
    type: 'boolean',
    category: 'payment',
    description: 'Enable Stripe payment gateway',
    isPublic: false,
  },
  {
    key: 'payment.razorpay.enabled',
    value: true,
    type: 'boolean',
    category: 'payment',
    description: 'Enable Razorpay payment gateway',
    isPublic: false,
  },
  // COD has been removed - all payments through Razorpay

  // SHIPPING SETTINGS
  {
    key: 'shipping.freeShipping.enabled',
    value: true,
    type: 'boolean',
    category: 'shipping',
    description: 'Enable free shipping option',
    isPublic: true,
  },
  {
    key: 'shipping.freeShipping.threshold',
    value: 8000,
    type: 'number',
    category: 'shipping',
    description: 'Minimum order amount for free shipping (in INR)',
    isPublic: true,
  },
  {
    key: 'shipping.standardRate',
    value: 499,
    type: 'number',
    category: 'shipping',
    description: 'Standard shipping rate (in INR)',
    isPublic: true,
  },
  {
    key: 'shipping.expressRate',
    value: 1299,
    type: 'number',
    category: 'shipping',
    description: 'Express shipping rate (in INR)',
    isPublic: true,
  },

  // EMAIL SETTINGS
  {
    key: 'email.orderConfirmation.enabled',
    value: true,
    type: 'boolean',
    category: 'email',
    description: 'Send order confirmation emails',
    isPublic: false,
  },
  {
    key: 'email.shipmentTracking.enabled',
    value: true,
    type: 'boolean',
    category: 'email',
    description: 'Send shipment tracking emails',
    isPublic: false,
  },
  {
    key: 'email.newsletter.enabled',
    value: true,
    type: 'boolean',
    category: 'email',
    description: 'Enable newsletter subscriptions',
    isPublic: true,
  },

  // SEO SETTINGS
  {
    key: 'seo.metaTitle',
    value: 'Shop - Your Trusted Multi-Vendor Marketplace',
    type: 'string',
    category: 'seo',
    description: 'Default meta title for pages',
    isPublic: true,
  },
  {
    key: 'seo.metaDescription',
    value: 'Discover thousands of products from trusted vendors. Buy and sell with confidence on Shop marketplace.',
    type: 'string',
    category: 'seo',
    description: 'Default meta description',
    isPublic: true,
  },
  {
    key: 'seo.ga4.enabled',
    value: false,
    type: 'boolean',
    category: 'seo',
    description: 'Enable Google Analytics 4 tracking',
    isPublic: false,
  },
  {
    key: 'seo.metaPixel.enabled',
    value: false,
    type: 'boolean',
    category: 'seo',
    description: 'Enable Meta (Facebook) Pixel tracking',
    isPublic: false,
  },

  // SECURITY SETTINGS
  {
    key: 'security.twoFactor.enabled',
    value: false,
    type: 'boolean',
    category: 'security',
    description: 'Enable two-factor authentication',
    isPublic: false,
  },
  {
    key: 'security.sessionTimeout',
    value: 3600,
    type: 'number',
    category: 'security',
    description: 'Session timeout in seconds',
    isPublic: false,
  },
  {
    key: 'security.maxLoginAttempts',
    value: 5,
    type: 'number',
    category: 'security',
    description: 'Maximum login attempts before lockout',
    isPublic: false,
  },
  {
    key: 'security.passwordMinLength',
    value: 8,
    type: 'number',
    category: 'security',
    description: 'Minimum password length',
    isPublic: true,
  },
  {
    key: 'security.requireStrongPassword',
    value: true,
    type: 'boolean',
    category: 'security',
    description: 'Require strong passwords (uppercase, lowercase, number, special char)',
    isPublic: true,
  },

  // NOTIFICATION SETTINGS
  {
    key: 'notifications.push.enabled',
    value: false,
    type: 'boolean',
    category: 'notifications',
    description: 'Enable push notifications',
    isPublic: false,
  },
  {
    key: 'notifications.sms.enabled',
    value: false,
    type: 'boolean',
    category: 'notifications',
    description: 'Enable SMS notifications',
    isPublic: false,
  },
  {
    key: 'notifications.orderUpdates',
    value: true,
    type: 'boolean',
    category: 'notifications',
    description: 'Send order status update notifications',
    isPublic: false,
  },
  {
    key: 'notifications.promotions',
    value: true,
    type: 'boolean',
    category: 'notifications',
    description: 'Send promotional notifications',
    isPublic: false,
  },

  // FEATURE FLAGS
  {
    key: 'features.multiVendor.enabled',
    value: true,
    type: 'boolean',
    category: 'features',
    description: 'Enable multi-vendor functionality',
    isPublic: false,
  },
  {
    key: 'features.affiliate.enabled',
    value: true,
    type: 'boolean',
    category: 'features',
    description: 'Enable affiliate program',
    isPublic: true,
  },
  {
    key: 'features.wishlist.enabled',
    value: true,
    type: 'boolean',
    category: 'features',
    description: 'Enable product wishlist',
    isPublic: true,
  },
  {
    key: 'features.reviews.enabled',
    value: true,
    type: 'boolean',
    category: 'features',
    description: 'Enable product reviews',
    isPublic: true,
  },
  {
    key: 'features.ads.enabled',
    value: true,
    type: 'boolean',
    category: 'features',
    description: 'Enable advertising platform for vendors',
    isPublic: false,
  },
  {
    key: 'features.guestCheckout.enabled',
    value: true,
    type: 'boolean',
    category: 'features',
    description: 'Allow checkout without creating account',
    isPublic: true,
  },

  // MAINTENANCE SETTINGS
  {
    key: 'maintenance.mode.enabled',
    value: false,
    type: 'boolean',
    category: 'maintenance',
    description: 'Put site in maintenance mode',
    isPublic: true,
  },
  {
    key: 'maintenance.message',
    value: 'We are currently performing scheduled maintenance. Please check back soon!',
    type: 'string',
    category: 'maintenance',
    description: 'Message to display during maintenance',
    isPublic: true,
  },
  {
    key: 'maintenance.allowedIPs',
    value: [],
    type: 'array',
    category: 'maintenance',
    description: 'IP addresses allowed during maintenance mode',
    isPublic: false,
  },

  // INTEGRATION SETTINGS
  {
    key: 'integrations.cloudinary.enabled',
    value: false,
    type: 'boolean',
    category: 'integrations',
    description: 'Use Cloudinary for image storage',
    isPublic: false,
  },
  {
    key: 'integrations.aws.s3.enabled',
    value: false,
    type: 'boolean',
    category: 'integrations',
    description: 'Use AWS S3 for file storage',
    isPublic: false,
  },
  {
    key: 'integrations.sendgrid.enabled',
    value: false,
    type: 'boolean',
    category: 'integrations',
    description: 'Use SendGrid for email delivery',
    isPublic: false,
  },
];

const seedSettings = async () => {
  try {
    await connectDB();
    logger.info('Starting settings seed...');

    // Clear existing settings (optional - comment out if you want to preserve custom settings)
    // await Setting.deleteMany({});
    // logger.info('Cleared existing settings');

    // Insert or update settings
    for (const setting of defaultSettings) {
      await Setting.findOneAndUpdate(
        { key: setting.key },
        setting,
        { upsert: true, new: true }
      );
    }

    logger.info(`✅ Seeded ${defaultSettings.length} settings successfully!`);
    logger.info('\nSettings categories:');
    logger.info('- General: Site configuration');
    logger.info('- Payment: Payment gateway settings');
    logger.info('- Shipping: Shipping options');
    logger.info('- Email: Email notifications');
    logger.info('- SEO: SEO and analytics');
    logger.info('- Security: Security configurations');
    logger.info('- Notifications: Push/SMS notifications');
    logger.info('- Features: Feature flags');
    logger.info('- Maintenance: Maintenance mode');
    logger.info('- Integrations: Third-party integrations');

    process.exit(0);
  } catch (error) {
    logger.error('Settings seed failed:', error);
    process.exit(1);
  }
};

seedSettings();
