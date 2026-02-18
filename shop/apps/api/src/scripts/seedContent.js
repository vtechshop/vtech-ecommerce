// FILE: apps/api/src/scripts/seedContent.js
// Run: node src/scripts/seedContent.js
// Seeds banners, coupons, spin config, quiz questions, and app config

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');

const Banner = require('../models/Banner');
const Coupon = require('../models/Coupon');
const SpinConfig = require('../models/SpinConfig');
const QuizQuestion = require('../models/QuizQuestion');
const AppConfig = require('../models/AppConfig');

const seedBanners = async () => {
  const count = await Banner.countDocuments();
  if (count > 0) {
    console.log(`Banners: ${count} already exist, skipping`);
    return;
  }

  await Banner.insertMany([
    {
      title: 'Welcome to V-Tech',
      subtitle: 'Discover premium products at amazing prices',
      image: 'https://placehold.co/1200x400/4F46E5/ffffff?text=Welcome+to+V-Tech',
      link: '/products',
      isActive: true,
      order: 1,
    },
    {
      title: 'Free Shipping',
      subtitle: 'On all orders above ₹999',
      image: 'https://placehold.co/1200x400/059669/ffffff?text=Free+Shipping',
      link: '/products',
      isActive: true,
      order: 2,
    },
    {
      title: 'New Arrivals',
      subtitle: 'Check out the latest products',
      image: 'https://placehold.co/1200x400/DC2626/ffffff?text=New+Arrivals',
      link: '/products?sort=-createdAt',
      isActive: true,
      order: 3,
    },
    {
      title: 'Best Sellers',
      subtitle: 'Our most popular products',
      image: 'https://placehold.co/1200x400/7C3AED/ffffff?text=Best+Sellers',
      link: '/products?sort=-rating',
      isActive: true,
      order: 4,
    },
  ]);
  console.log('Banners: 4 created');
};

const seedCoupons = async () => {
  const codes = ['SAVE10', 'FIRST50', 'BUNDLE20', 'FREESHIP', 'FESTIVE15'];
  const existing = await Coupon.find({ code: { $in: codes } });
  if (existing.length >= codes.length) {
    console.log(`Coupons: all ${codes.length} already exist, skipping`);
    return;
  }

  const existingCodes = existing.map(c => c.code);

  const coupons = [
    {
      code: 'SAVE10',
      type: 'percentage',
      value: 10,
      description: 'Get 10% off on your order',
      terms: ['Minimum order ₹499', 'Maximum discount ₹200', 'Valid on all products'],
      minOrderAmount: 499,
      maxDiscount: 200,
      category: 'general',
      isActive: true,
      usageLimit: 0,
      perUserLimit: 3,
    },
    {
      code: 'FIRST50',
      type: 'fixed',
      value: 50,
      description: '₹50 off on your first order',
      terms: ['Valid only for first order', 'Minimum order ₹299', 'One time use per user'],
      minOrderAmount: 299,
      category: 'first_order',
      isActive: true,
      usageLimit: 0,
      perUserLimit: 1,
    },
    {
      code: 'BUNDLE20',
      type: 'percentage',
      value: 20,
      description: '20% off when you buy 3 or more items',
      terms: ['Add 3 or more items to cart', 'Maximum discount ₹500', 'Cannot be combined with other coupons'],
      minOrderAmount: 999,
      maxDiscount: 500,
      category: 'bundle',
      isActive: true,
      usageLimit: 0,
      perUserLimit: 2,
    },
    {
      code: 'FREESHIP',
      type: 'fixed',
      value: 99,
      description: 'Free shipping on your order',
      terms: ['Covers standard shipping charges', 'Minimum order ₹199'],
      minOrderAmount: 199,
      category: 'shipping',
      isActive: true,
      usageLimit: 0,
      perUserLimit: 5,
    },
    {
      code: 'FESTIVE15',
      type: 'percentage',
      value: 15,
      description: '15% off festival special discount',
      terms: ['Festival season special', 'Minimum order ₹599', 'Maximum discount ₹300'],
      minOrderAmount: 599,
      maxDiscount: 300,
      category: 'festival',
      isActive: true,
      usageLimit: 1000,
      perUserLimit: 1,
    },
  ];

  const toInsert = coupons.filter(c => !existingCodes.includes(c.code));
  if (toInsert.length > 0) {
    await Coupon.insertMany(toInsert);
  }
  console.log(`Coupons: ${toInsert.length} created`);
};

const seedSpinConfig = async () => {
  const existing = await SpinConfig.findOne();
  if (existing) {
    console.log('SpinConfig: already exists, skipping');
    return;
  }

  await SpinConfig.create({
    segments: [
      { label: '₹10 Off', value: 10, color: '#FF6B6B', type: 'discount', probability: 0.20 },
      { label: '₹25 Off', value: 25, color: '#4ECDC4', type: 'discount', probability: 0.15 },
      { label: '₹50 Off', value: 50, color: '#45B7D1', type: 'discount', probability: 0.10 },
      { label: '₹100 Off', value: 100, color: '#96CEB4', type: 'discount', probability: 0.05 },
      { label: '10 Points', value: 10, color: '#FFEAA7', type: 'points', probability: 0.15 },
      { label: '25 Points', value: 25, color: '#DDA0DD', type: 'points', probability: 0.10 },
      { label: 'Better Luck Next Time', value: 0, color: '#B0BEC5', type: 'no_prize', probability: 0.15 },
      { label: 'Try Again!', value: 0, color: '#90A4AE', type: 'no_prize', probability: 0.10 },
    ],
    dailySpinsAllowed: 1,
    isActive: true,
  });
  console.log('SpinConfig: created with 8 segments');
};

const seedQuizQuestions = async () => {
  const count = await QuizQuestion.countDocuments();
  if (count >= 10) {
    console.log(`QuizQuestions: ${count} already exist, skipping`);
    return;
  }

  const questions = [
    {
      question: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correctAnswer: 1,
      points: 10,
      category: 'science',
    },
    {
      question: 'What does CPU stand for?',
      options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Computer Processing Unit'],
      correctAnswer: 0,
      points: 10,
      category: 'tech',
    },
    {
      question: 'Which company created the iPhone?',
      options: ['Samsung', 'Google', 'Apple', 'Microsoft'],
      correctAnswer: 2,
      points: 10,
      category: 'tech',
    },
    {
      question: 'What is the largest ocean on Earth?',
      options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
      correctAnswer: 3,
      points: 10,
      category: 'general',
    },
    {
      question: 'Which programming language is known as the language of the web?',
      options: ['Python', 'Java', 'JavaScript', 'C++'],
      correctAnswer: 2,
      points: 10,
      category: 'tech',
    },
    {
      question: 'What is the chemical symbol for water?',
      options: ['HO', 'H2O', 'O2H', 'H2O2'],
      correctAnswer: 1,
      points: 10,
      category: 'science',
    },
    {
      question: 'Which Indian festival is known as the Festival of Lights?',
      options: ['Holi', 'Eid', 'Diwali', 'Christmas'],
      correctAnswer: 2,
      points: 10,
      category: 'general',
    },
    {
      question: 'What does GST stand for in India?',
      options: ['General Sales Tax', 'Goods and Services Tax', 'Government Service Tax', 'Gross Sales Tax'],
      correctAnswer: 1,
      points: 10,
      category: 'shopping',
    },
    {
      question: 'Which of these is NOT a type of e-commerce?',
      options: ['B2B', 'B2C', 'C2C', 'X2X'],
      correctAnswer: 3,
      points: 10,
      category: 'shopping',
    },
    {
      question: 'What does RAM stand for in computing?',
      options: ['Read Access Memory', 'Random Access Memory', 'Rapid Access Module', 'Read And Modify'],
      correctAnswer: 1,
      points: 10,
      category: 'tech',
    },
  ];

  await QuizQuestion.insertMany(questions);
  console.log('QuizQuestions: 10 created');
};

const seedAppConfig = async () => {
  const existing = await AppConfig.findOne();
  if (existing) {
    console.log('AppConfig: already exists, skipping');
    return;
  }

  await AppConfig.create({
    contactInfo: {
      email: 'support@vtechkitchen.com',
      phone: '+91 98765 43210',
      whatsapp: '+91 98765 43210',
      website: 'vtechkitchen.com',
      businessHours: 'Monday - Saturday: 9:00 AM - 6:00 PM',
      address: 'V-Tech Headquarters, Bangalore, India',
    },
    aboutPage: {
      companyName: 'V-Tech',
      tagline: 'Premium Products, Delivered With Care',
      description: 'V-Tech is your trusted marketplace for premium kitchen and lifestyle products. We connect quality vendors with discerning customers across India.',
      stats: [
        { label: 'Happy Customers', value: '1000+', icon: 'people' },
        { label: 'Products', value: '500+', icon: 'cube' },
        { label: 'Vendors', value: '50+', icon: 'storefront' },
        { label: 'Cities Served', value: '100+', icon: 'location' },
      ],
    },
    referralConfig: {
      rewardAmount: 100,
      referrerReward: 100,
      refereeReward: 50,
      isActive: true,
    },
    festivalSale: {
      isActive: false,
      title: 'Festival Sale',
      categories: [
        { name: 'Electronics', searchQuery: 'electronics', icon: 'phone-portrait', gradient: ['#4F46E5', '#7C3AED'] },
        { name: 'Kitchen', searchQuery: 'kitchen', icon: 'restaurant', gradient: ['#059669', '#10B981'] },
        { name: 'Home Decor', searchQuery: 'home decor', icon: 'home', gradient: ['#DC2626', '#EF4444'] },
      ],
    },
    giftCardAmounts: [250, 500, 1000, 2000, 5000],
  });
  console.log('AppConfig: created with defaults');
};

const runSeed = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    await seedBanners();
    await seedCoupons();
    await seedSpinConfig();
    await seedQuizQuestions();
    await seedAppConfig();

    console.log('\nSeeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

runSeed();
