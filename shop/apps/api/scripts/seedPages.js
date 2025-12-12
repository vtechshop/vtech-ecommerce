// FILE: apps/api/scripts/seedPages.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();

const Page = require('../src/models/Page'); // adjust if your path differs

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('[seed] Connected:', MONGO_URI);

  const now = new Date();

  const pages = [
    {
      title: 'About Us',
      slug: 'about',
      content: `
        <h1>About Our Store</h1>
        <p>Welcome to our online marketplace! We are dedicated to providing you with the best shopping experience possible.</p>

        <h2>Our Story</h2>
        <p>Founded in 2024, our marketplace has grown to become one of the leading e-commerce platforms, connecting thousands of vendors with millions of satisfied customers worldwide.</p>

        <h2>Our Mission</h2>
        <p>To create a trusted marketplace where vendors can grow their businesses and customers can discover quality products at competitive prices.</p>

        <h2>Why Choose Us?</h2>
        <ul>
          <li><strong>Wide Selection:</strong> Thousands of products from verified vendors</li>
          <li><strong>Secure Shopping:</strong> Protected transactions and buyer protection</li>
          <li><strong>Fast Shipping:</strong> Quick delivery from local and international vendors</li>
          <li><strong>24/7 Support:</strong> Our customer service team is always here to help</li>
          <li><strong>Best Prices:</strong> Competitive pricing and regular deals</li>
        </ul>

        <h2>Contact Us</h2>
        <p>Have questions? Reach out to us at support@shop.com or call 1-800-SHOP-NOW</p>
      `,
      excerpt: 'Learn more about our marketplace and mission',
      isPublished: true,
      createdAt: now,
      updatedAt: now
    },
    {
      title: 'Privacy Policy',
      slug: 'privacy',
      content: `
        <h1>Privacy Policy</h1>
        <p><em>Last Updated: January 2025</em></p>

        <h2>Information We Collect</h2>
        <p>We collect information you provide directly to us, including:</p>
        <ul>
          <li>Name, email address, and contact information</li>
          <li>Shipping and billing addresses</li>
          <li>Payment information (processed securely)</li>
          <li>Order history and preferences</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Process and fulfill your orders</li>
          <li>Communicate with you about your orders and account</li>
          <li>Improve our services and user experience</li>
          <li>Send promotional offers (with your consent)</li>
        </ul>

        <h2>Data Security</h2>
        <p>We implement industry-standard security measures to protect your personal information. All payment transactions are encrypted and processed through secure payment gateways.</p>

        <h2>Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal data. Contact us at privacy@shop.com for any privacy-related requests.</p>

        <h2>Cookies</h2>
        <p>We use cookies to enhance your browsing experience. You can manage your cookie preferences through your browser settings.</p>
      `,
      excerpt: 'How we collect, use, and protect your personal information',
      isPublished: true,
      createdAt: now,
      updatedAt: now
    },
    {
      title: 'Return & Refund Policy',
      slug: 'returns',
      content: `
        <h1>Return & Refund Policy</h1>

        <h2>30-Day Return Policy</h2>
        <p>We offer a 30-day return policy for most items. If you're not satisfied with your purchase, you can return it within 30 days of delivery for a full refund.</p>

        <h2>Return Conditions</h2>
        <p>To be eligible for a return:</p>
        <ul>
          <li>Items must be in original condition with tags attached</li>
          <li>Items must be unused and in original packaging</li>
          <li>Proof of purchase (order number) is required</li>
          <li>Some items (perishables, custom items) are non-returnable</li>
        </ul>

        <h2>How to Return</h2>
        <ol>
          <li>Log into your account and go to "My Orders"</li>
          <li>Select the order and click "Request Return"</li>
          <li>Choose the items and reason for return</li>
          <li>Print the prepaid return label</li>
          <li>Pack the items securely and ship them back</li>
        </ol>

        <h2>Refund Processing</h2>
        <p>Once we receive your return, we'll inspect the items and process your refund within 5-7 business days. Refunds are issued to the original payment method.</p>

        <h2>Exchanges</h2>
        <p>For exchanges, please return the original item and place a new order for the replacement.</p>

        <h2>Questions?</h2>
        <p>Contact our customer service team at returns@shop.com</p>
      `,
      excerpt: 'Our return and refund policy for your peace of mind',
      isPublished: true,
      createdAt: now,
      updatedAt: now
    },
    {
      title: 'Contact Us',
      slug: 'contact',
      content: `
        <h1>Contact Us</h1>
        <p>We're here to help! Get in touch with us through any of the following methods:</p>

        <h2>Customer Support</h2>
        <p><strong>Email:</strong> support@shop.com<br>
        <strong>Phone:</strong> 1-800-SHOP-NOW (1-800-746-7669)<br>
        <strong>Hours:</strong> Monday - Friday, 9 AM - 6 PM EST</p>

        <h2>Departments</h2>
        <ul>
          <li><strong>Orders & Shipping:</strong> orders@shop.com</li>
          <li><strong>Returns & Refunds:</strong> returns@shop.com</li>
          <li><strong>Technical Support:</strong> tech@shop.com</li>
          <li><strong>Vendor Support:</strong> vendors@shop.com</li>
          <li><strong>Affiliate Program:</strong> affiliates@shop.com</li>
        </ul>

        <h2>Office Address</h2>
        <p>Shop Marketplace Inc.<br>
        123 Commerce Street, Suite 100<br>
        San Francisco, CA 94105<br>
        United States</p>

        <h2>Business Inquiries</h2>
        <p>For partnerships and business inquiries, email: business@shop.com</p>

        <h2>Social Media</h2>
        <p>Follow us for updates, deals, and news:<br>
        Facebook | Twitter | Instagram | LinkedIn</p>
      `,
      excerpt: 'Get in touch with our team',
      isPublished: true,
      createdAt: now,
      updatedAt: now
    },
    {
      title: 'Vendor Terms & Conditions',
      slug: 'vendor-terms',
      content: `
        <h1>Vendor Terms & Conditions</h1>

        <h2>Welcome Vendors!</h2>
        <p>Thank you for your interest in selling on our marketplace. Please read these terms carefully before registering.</p>

        <h2>Commission Structure</h2>
        <p>We charge a commission on each sale:</p>
        <ul>
          <li>Standard Commission: 15% per transaction</li>
          <li>Product-specific commissions may vary</li>
          <li>No monthly fees or listing fees</li>
        </ul>

        <h2>Vendor Requirements</h2>
        <ul>
          <li>Must be a registered business or individual seller</li>
          <li>Provide valid business/tax documentation</li>
          <li>Maintain accurate product listings</li>
          <li>Honor warranty and return policies</li>
          <li>Ship orders within promised timeframes</li>
        </ul>

        <h2>Product Guidelines</h2>
        <ul>
          <li>All products must be authentic and as described</li>
          <li>No counterfeit or prohibited items</li>
          <li>Accurate images and descriptions required</li>
          <li>Competitive pricing encouraged</li>
        </ul>

        <h2>Payment Terms</h2>
        <p>Vendor payments are processed bi-weekly. Funds are transferred to your registered bank account after deducting commission and any applicable fees.</p>

        <h2>Performance Standards</h2>
        <ul>
          <li>Maintain 95% order fulfillment rate</li>
          <li>Keep customer rating above 4.0 stars</li>
          <li>Respond to customer inquiries within 24 hours</li>
        </ul>

        <h2>Ready to Start?</h2>
        <p><a href="/register?role=vendor">Register as a Vendor</a> and start selling today!</p>
      `,
      excerpt: 'Terms and conditions for vendors on our platform',
      isPublished: true,
      createdAt: now,
      updatedAt: now
    },
    {
      title: 'Affiliate Program Terms',
      slug: 'affiliate-terms',
      content: `
        <h1>Affiliate Program Terms</h1>

        <h2>Join Our Affiliate Program!</h2>
        <p>Earn commissions by promoting our products. Here's how it works:</p>

        <h2>Commission Rates</h2>
        <ul>
          <li>Standard Rate: 5% on all sales</li>
          <li>Product-specific rates may be higher</li>
          <li>30-day cookie window for tracking</li>
          <li>No minimum payout threshold</li>
        </ul>

        <h2>How It Works</h2>
        <ol>
          <li>Register for the affiliate program</li>
          <li>Get your unique affiliate links</li>
          <li>Share links on your website, blog, or social media</li>
          <li>Earn commissions on qualified sales</li>
          <li>Get paid monthly via bank transfer or PayPal</li>
        </ol>

        <h2>Affiliate Requirements</h2>
        <ul>
          <li>Must have a website, blog, or social media presence</li>
          <li>Content must comply with our guidelines</li>
          <li>No misleading claims or spam</li>
          <li>No bidding on our brand keywords in paid ads</li>
        </ul>

        <h2>Promotional Methods Allowed</h2>
        <ul>
          <li>Blog posts and reviews</li>
          <li>Social media sharing</li>
          <li>Email marketing (to opted-in lists)</li>
          <li>YouTube videos and content</li>
          <li>Comparison and deal websites</li>
        </ul>

        <h2>Prohibited Activities</h2>
        <ul>
          <li>Self-referral purchases</li>
          <li>Cookie stuffing or fraud</li>
          <li>Trademark infringement</li>
          <li>Spam or unsolicited emails</li>
        </ul>

        <h2>Payment Terms</h2>
        <p>Commissions are paid monthly, typically by the 15th of each month for the previous month's sales. Minimum payout is ₹500.</p>

        <h2>Ready to Earn?</h2>
        <p><a href="/register?role=affiliate">Join Our Affiliate Program</a> today!</p>
      `,
      excerpt: 'Earn money by promoting our products',
      isPublished: true,
      createdAt: now,
      updatedAt: now
    },
  ];

  for (const p of pages) {
    await Page.updateOne({ slug: p.slug }, { $set: p }, { upsert: true });
  }

  console.log('✅ Pages seeded');
  await mongoose.disconnect();
  process.exit(0);
})();
