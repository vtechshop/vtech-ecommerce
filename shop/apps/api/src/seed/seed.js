// FILE: apps/api/src/seed/seed.js
// WARNING: This script is for LOCAL DEVELOPMENT/TESTING ONLY
// DO NOT run in production - it will DELETE ALL DATA!
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const logger = require('../config/logger');
const { hashPassword } = require('../utils/hash');
const { generateAffiliateCode, generateOrderId, generateSKU } = require('../utils/helpers');

// Generate random secure password
function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const special = '!@#$%^&*';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += special.charAt(Math.floor(Math.random() * special.length));
  password += Math.floor(Math.random() * 10);
  return password;
}

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Affiliate = require('../models/Affiliate');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const AdCampaign = require('../models/AdCampaign');
const AdCreative = require('../models/AdCreative');
const AdWallet = require('../models/AdWallet');
const Post = require('../models/Post');
const Page = require('../models/Page');

const seed = async () => {
  try {
    // Safety check - don't run in production
    if (process.env.NODE_ENV === 'production') {
      logger.error('❌ This script should NOT be run in production!');
      process.exit(1);
    }

    await connectDB();

    logger.info('Starting seed process...');
    logger.info('⚠️  WARNING: This will DELETE ALL existing data!');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Vendor.deleteMany({}),
      Affiliate.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      AdCampaign.deleteMany({}),
      AdCreative.deleteMany({}),
      AdWallet.deleteMany({}),
      Post.deleteMany({}),
      Page.deleteMany({}),
    ]);

    logger.info('Cleared existing data');

    // Generate random passwords at runtime (not hardcoded)
    const adminPass = generateSecurePassword();
    const vendorPass = generateSecurePassword();
    const affiliatePass = generateSecurePassword();
    const customerPass = generateSecurePassword();

    // Create admin user
    const adminPassword = await hashPassword(adminPass);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@shop.test',
      password: adminPassword,
      role: 'admin',
      emailVerified: true,
    });

    logger.info('Admin user created');

    // Create vendor user
    const vendorPassword = await hashPassword(vendorPass);
    const vendorUser = await User.create({
      name: 'Demo Vendor',
      email: 'vendor@shop.test',
      password: vendorPassword,
      role: 'vendor',
      emailVerified: true,
    });

    // Create vendor profile
    const vendor = await Vendor.create({
      userId: vendorUser._id,
      storeName: 'Demo Electronics Store',
      slug: 'demo-electronics',
      description: 'Your trusted source for quality electronics',
      kyc: {
        businessName: 'Demo Electronics LLC',
        businessType: 'LLC',
        taxId: '123456789',
        status: 'approved',
        verifiedAt: new Date(),
      },
      status: 'active',
      rating: 4.5,
      reviewCount: 120,
    });

    logger.info('Vendor created');

    // Create affiliate user
    const affiliatePassword = await hashPassword(affiliatePass);
    const affiliateUser = await User.create({
      name: 'Demo Affiliate',
      email: 'affiliate@shop.test',
      password: affiliatePassword,
      role: 'affiliate',
      emailVerified: true,
    });

    // Create affiliate profile
    const affiliate = await Affiliate.create({
      userId: affiliateUser._id,
      code: generateAffiliateCode(affiliateUser.name),
      status: 'active',
      approvedAt: new Date(),
      commissionPercentage: 5,
    });

    logger.info('Affiliate created');

    // Create customer user
    const customerPassword = await hashPassword(customerPass);
    const customer = await User.create({
      name: 'Demo Customer',
      email: 'customer@shop.test',
      password: customerPassword,
      role: 'customer',
      emailVerified: true,
      addresses: [{
        fullName: 'Demo Customer',
        phone: '+1234567890',
        addressLine1: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'US',
        isDefault: true,
      }],
    });

    logger.info('Customer created');

    // Create categories
    const categories = await Category.insertMany([
      { name: 'Electronics', slug: 'electronics', isActive: true, sortOrder: 1 },
      { name: 'Fashion', slug: 'fashion', isActive: true, sortOrder: 2 },
      { name: 'Home & Garden', slug: 'home-garden', isActive: true, sortOrder: 3 },
      { name: 'Sports', slug: 'sports', isActive: true, sortOrder: 4 },
      { name: 'Books', slug: 'books', isActive: true, sortOrder: 5 },
    ]);

    logger.info('Categories created');

    // Create products
    const products = [];
    const productData = [
      {
        title: 'Wireless Bluetooth Headphones',
        description: 'Premium wireless headphones with active noise cancellation and 30-hour battery life.',
        price: 149.99,
        compareAt: 199.99,
        stock: 50,
        categoryIds: [categories[0]._id],
        brand: 'AudioTech',
        featured: true,
      },
      {
        title: 'Smart Watch Pro',
        description: 'Advanced smartwatch with fitness tracking, heart rate monitor, and GPS.',
        price: 299.99,
        stock: 30,
        categoryIds: [categories[0]._id],
        brand: 'TechWear',
        featured: true,
      },
      {
        title: 'Laptop Backpack',
        description: 'Durable laptop backpack with multiple compartments and USB charging port.',
        price: 49.99,
        compareAt: 69.99,
        stock: 100,
        categoryIds: [categories[1]._id],
        brand: 'TravelGear',
      },
      {
        title: 'Yoga Mat Premium',
        description: 'Extra thick yoga mat with non-slip surface and carrying strap.',
        price: 39.99,
        stock: 75,
        categoryIds: [categories[3]._id],
        brand: 'FitLife',
      },
      {
        title: 'LED Desk Lamp',
        description: 'Adjustable LED desk lamp with touch control and USB charging port.',
        price: 34.99,
        stock: 60,
        categoryIds: [categories[2]._id],
        brand: 'BrightHome',
      },
    ];

    for (const data of productData) {
      const product = await Product.create({
        ...data,
        vendorId: vendor._id,
        slug: data.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'),
        sku: generateSKU(),
        published: true,
        rating: 4 + Math.random(),
        reviewCount: Math.floor(Math.random() * 100),
      });
      products.push(product);
    }

    logger.info('Products created');

    // Create sample order with tracking
    const order = await Order.create({
      orderId: generateOrderId(),
      userId: customer._id,
      items: [{
        productId: products[0]._id,
        vendorId: vendor._id,
        qty: 2,
        priceSnapshot: products[0].price,
        name: products[0].title,
        image: products[0].images?.[0],
        productSlug: products[0].slug,
        sku: products[0].sku,
      }],
      totals: {
        subtotal: products[0].price * 2,
        tax: products[0].price * 2 * 0.1,
        shipping: 5.99,
        discount: 0,
        total: products[0].price * 2 * 1.1 + 5.99,
      },
      shipTo: customer.addresses[0],
      status: 'shipped',
      events: [
        { status: 'placed', description: 'Order placed', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { status: 'paid', description: 'Payment received', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { status: 'packed', description: 'Order packed', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
        { status: 'shipped', description: 'Order shipped', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      ],
      payment: {
        provider: 'stripe',
        method: 'card',
        status: 'paid',
        paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        amount: products[0].price * 2 * 1.1 + 5.99,
      },
      shipment: {
        carrier: 'DHL',
        awb: 'DHL-' + Date.now(),
        shippedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        events: [
          {
            code: 'PACKED',
            description: 'Package packed',
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          },
          {
            code: 'SHIPPED',
            description: 'Package picked up',
            location: 'New York Hub',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
          {
            code: 'IN_TRANSIT',
            description: 'Package in transit',
            location: 'Chicago Hub',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            code: 'OUT_FOR_DELIVERY',
            description: 'Out for delivery',
            location: 'Local Delivery Center',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    });

    logger.info('Sample order created');

    // Create Ad Wallet for vendor
    const wallet = await AdWallet.create({
      vendorId: vendor._id,
      balance: 500,
      totalRecharged: 500,
      transactions: [{
        type: 'recharge',
        amount: 500,
        balance: 500,
        description: 'Initial balance',
        timestamp: new Date(),
      }],
    });

    // Create sample ad campaign
    const campaign = await AdCampaign.create({
      vendorId: vendor._id,
      name: 'Headphones Promotion',
      type: 'SponsoredProduct',
      targeting: {
        keywords: [
          { keyword: 'headphones', matchType: 'broad' },
          { keyword: 'wireless', matchType: 'broad' },
        ],
        categories: [categories[0]._id],
      },
      pricing: 'CPC',
      bid: 0.50,
      dailyBudget: 50,
      startAt: new Date(),
      status: 'active',
    });

    // Create creative
    await AdCreative.create({
      campaignId: campaign._id,
      productId: products[0]._id,
      placement: 'search_top',
      headline: 'Premium Wireless Headphones',
      description: 'Save 25% on premium sound quality!',
      status: 'active',
      qualityScore: 7,
    });

    logger.info('Ad campaign created');

    // Create blog post
    await Post.create({
      title: 'Top 10 Tech Gadgets for 2025',
      slug: 'top-10-tech-gadgets-2025',
      content: '<p>Discover the most innovative tech gadgets that are changing the way we live and work...</p>',
      excerpt: 'Discover the most innovative tech gadgets that are changing the way we live and work.',
      author: admin._id,
      category: 'Technology',
      tags: ['tech', 'gadgets', '2025'],
      published: true,
      publishedAt: new Date(),
      readTime: 5,
    });

    // Create pages
    await Page.insertMany([
      {
        title: 'About Us',
        slug: 'about',
        content: '<h1>About Shop</h1><p>We are a multi-vendor marketplace connecting buyers with quality sellers...</p>',
        published: true,
      },
      {
        title: 'Terms of Service',
        slug: 'terms',
        content: '<h1>Terms of Service</h1><p>By using our service, you agree to these terms...</p>',
        published: true,
      },
      {
        title: 'Privacy Policy',
        slug: 'privacy',
        content: '<h1>Privacy Policy</h1><p>We value your privacy and are committed to protecting your data...</p>',
        published: true,
      },
    ]);

    logger.info('CMS content created');

    logger.info('✅ Seed completed successfully!');
    logger.info('\n📧 Login Credentials (SAVE THESE - randomly generated):');
    logger.info(`Admin: admin@shop.test / ${adminPass}`);
    logger.info(`Vendor: vendor@shop.test / ${vendorPass}`);
    logger.info(`Affiliate: affiliate@shop.test / ${affiliatePass}`);
    logger.info(`Customer: customer@shop.test / ${customerPass}`);

    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();