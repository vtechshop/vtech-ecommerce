// FILE: apps/api/scripts/seedPosts.js
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();

const Post = require('../src/models/Post'); // adjust path if needed

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('[seed] Connected:', MONGO_URI);

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

  const posts = [
    {
      title: 'Welcome to Our Marketplace!',
      slug: 'welcome-to-our-marketplace',
      excerpt: 'Discover quality products from thousands of vendors worldwide. Learn about our marketplace features and how to get started.',
      content: `
        <p>Welcome to our online marketplace! We're thrilled to have you here.</p>

        <h2>What Makes Us Different?</h2>
        <p>Our marketplace connects you with trusted vendors from around the world, offering a wide range of products at competitive prices. Whether you're looking for electronics, fashion, home goods, or sporting equipment, you'll find it here.</p>

        <h2>Key Features</h2>
        <ul>
          <li><strong>Secure Shopping:</strong> All transactions are protected with industry-standard encryption</li>
          <li><strong>Buyer Protection:</strong> 30-day return policy on most items</li>
          <li><strong>Fast Shipping:</strong> Quick delivery from local and international vendors</li>
          <li><strong>24/7 Support:</strong> Our customer service team is always ready to help</li>
          <li><strong>Best Prices:</strong> Regular deals and discounts across all categories</li>
        </ul>

        <h2>How to Get Started</h2>
        <p>Getting started is easy:</p>
        <ol>
          <li>Create a free account in seconds</li>
          <li>Browse thousands of products by category</li>
          <li>Add items to your cart and checkout securely</li>
          <li>Track your order in real-time</li>
          <li>Enjoy your purchase!</li>
        </ol>

        <p>Have questions? Check out our <a href="/page/about">About page</a> or <a href="/page/contact">contact us</a> anytime.</p>

        <p>Happy shopping!</p>
      `,
      category: 'News',
      published: true,
      readTime: 3,
      publishedAt: now,
      createdAt: now,
      updatedAt: now
    },
    {
      title: '10 Tips for Smart Online Shopping',
      slug: '10-tips-smart-online-shopping',
      excerpt: 'Master the art of online shopping with these essential tips to save money, find quality products, and shop safely.',
      content: `
        <p>Online shopping offers convenience and great deals, but it pays to shop smart. Here are our top 10 tips for getting the most out of your online shopping experience.</p>

        <h2>1. Compare Prices</h2>
        <p>Don't settle for the first price you see. Check multiple vendors and use price comparison tools to ensure you're getting the best deal.</p>

        <h2>2. Read Reviews</h2>
        <p>Customer reviews are invaluable. Look for products with high ratings and read both positive and negative reviews to get a balanced perspective.</p>

        <h2>3. Check the Return Policy</h2>
        <p>Always review the vendor's return policy before purchasing. Make sure you understand the timeframe and conditions for returns.</p>

        <h2>4. Look for Discounts</h2>
        <p>Sign up for newsletters, follow vendors on social media, and check for coupon codes before checking out. You can save significantly with promotional offers.</p>

        <h2>5. Use Secure Payment Methods</h2>
        <p>Stick to trusted payment gateways and consider using credit cards or secure payment services for added protection.</p>

        <h2>6. Check Shipping Costs</h2>
        <p>Factor in shipping costs when comparing prices. Sometimes a slightly higher-priced item with free shipping is actually the better deal.</p>

        <h2>7. Verify Vendor Ratings</h2>
        <p>Check the vendor's rating and reviews. Established vendors with high ratings are generally more reliable.</p>

        <h2>8. Keep Records</h2>
        <p>Save confirmation emails, order numbers, and receipts. These are essential for tracking shipments and handling returns if needed.</p>

        <h2>9. Watch for Red Flags</h2>
        <p>Be wary of deals that seem too good to be true, poor grammar in product descriptions, or vendors with no contact information.</p>

        <h2>10. Track Your Orders</h2>
        <p>Use order tracking features to monitor your shipment. Most issues can be resolved quickly if you stay informed about your order status.</p>

        <p>Follow these tips to shop smarter and safer online. Happy shopping!</p>
      `,
      category: 'Shopping Tips',
      published: true,
      readTime: 5,
      publishedAt: yesterday,
      createdAt: yesterday,
      updatedAt: yesterday
    },
    {
      title: 'How to Choose the Perfect Smartphone in 2025',
      slug: 'choose-perfect-smartphone-2025',
      excerpt: 'Confused by all the smartphone options? This comprehensive guide will help you find the perfect phone for your needs and budget.',
      content: `
        <p>With so many smartphones on the market, choosing the right one can be overwhelming. This guide will help you make an informed decision.</p>

        <h2>1. Determine Your Budget</h2>
        <p>Smartphones range from budget-friendly options under $300 to premium flagship devices over $1000. Set a realistic budget before you start shopping.</p>

        <h2>2. Choose Your Operating System</h2>
        <p><strong>iOS:</strong> Apple's ecosystem offers seamless integration with other Apple devices, regular updates, and strong security.</p>
        <p><strong>Android:</strong> More device variety, customization options, and price ranges to choose from.</p>

        <h2>3. Consider Screen Size</h2>
        <p>Display sizes typically range from 5.5" to 6.7". Larger screens are better for media and gaming, while smaller phones are more pocketable.</p>

        <h2>4. Evaluate Camera Quality</h2>
        <p>Look for:</p>
        <ul>
          <li>Multiple lenses (wide, ultra-wide, telephoto)</li>
          <li>Good low-light performance</li>
          <li>Optical image stabilization</li>
          <li>High megapixel count for the main camera</li>
        </ul>

        <h2>5. Check Battery Life</h2>
        <p>Look for phones with at least 4000mAh battery capacity. Check reviews for real-world battery performance.</p>

        <h2>6. Storage Space</h2>
        <p>Consider how much storage you need:</p>
        <ul>
          <li>128GB: Light users</li>
          <li>256GB: Average users</li>
          <li>512GB+: Heavy users, photographers, gamers</li>
        </ul>

        <h2>7. Processor Performance</h2>
        <p>For flagship performance, look for Qualcomm Snapdragon 8 series, Apple A-series, or Google Tensor chips.</p>

        <h2>8. 5G Connectivity</h2>
        <p>Most modern phones support 5G, which offers faster data speeds where available.</p>

        <h2>Top Picks for 2025</h2>
        <ul>
          <li><strong>Best Overall:</strong> iPhone 15 Pro</li>
          <li><strong>Best Android:</strong> Samsung Galaxy S24</li>
          <li><strong>Best Budget:</strong> Google Pixel 7a</li>
          <li><strong>Best Camera:</strong> iPhone 15 Pro Max</li>
        </ul>

        <p>Take your time, read reviews, and don't hesitate to visit a store to handle the phones in person before making your decision.</p>
      `,
      category: 'Buying Guides',
      published: true,
      readTime: 7,
      publishedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo
    },
    {
      title: 'Become a Vendor: Start Selling on Our Marketplace',
      slug: 'become-vendor-start-selling',
      excerpt: 'Turn your business into an online success. Learn how to become a vendor on our platform and reach millions of customers.',
      content: `
        <p>Are you a business owner looking to expand your reach? Join thousands of successful vendors on our marketplace!</p>

        <h2>Why Sell on Our Platform?</h2>
        <ul>
          <li><strong>Large Customer Base:</strong> Access to millions of active shoppers</li>
          <li><strong>Low Fees:</strong> Only 15% commission per sale, no monthly fees</li>
          <li><strong>Easy Setup:</strong> Get your store up and running in minutes</li>
          <li><strong>Marketing Support:</strong> Benefit from our advertising and promotions</li>
          <li><strong>Secure Payments:</strong> Fast and reliable payment processing</li>
        </ul>

        <h2>Who Can Become a Vendor?</h2>
        <p>We welcome:</p>
        <ul>
          <li>Small businesses and entrepreneurs</li>
          <li>Manufacturers and wholesalers</li>
          <li>Artisans and craftspeople</li>
          <li>Retailers looking to expand online</li>
        </ul>

        <h2>Getting Started</h2>
        <ol>
          <li><strong>Register:</strong> Create your vendor account</li>
          <li><strong>Set Up Your Store:</strong> Add your business information and branding</li>
          <li><strong>List Products:</strong> Upload product photos and descriptions</li>
          <li><strong>Start Selling:</strong> Begin receiving orders immediately</li>
        </ol>

        <h2>Success Tips</h2>
        <ul>
          <li>Use high-quality product images</li>
          <li>Write detailed, accurate descriptions</li>
          <li>Price competitively</li>
          <li>Respond quickly to customer inquiries</li>
          <li>Ship orders promptly</li>
          <li>Maintain high customer satisfaction ratings</li>
        </ul>

        <h2>Vendor Dashboard Features</h2>
        <p>Manage your business with our comprehensive dashboard:</p>
        <ul>
          <li>Track orders and sales in real-time</li>
          <li>Manage inventory automatically</li>
          <li>View detailed analytics and reports</li>
          <li>Process returns and refunds</li>
          <li>Run promotional campaigns</li>
        </ul>

        <h2>Ready to Start?</h2>
        <p><a href="/register?role=vendor">Register as a vendor</a> today and start growing your business with us!</p>

        <p>Questions? Check our <a href="/page/vendor-terms">Vendor Terms</a> or contact our vendor support team.</p>
      `,
      category: 'For Vendors',
      published: true,
      readTime: 4,
      publishedAt: threeDaysAgo,
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo
    },
    {
      title: 'Affiliate Marketing: Earn Money Promoting Products',
      slug: 'affiliate-marketing-earn-money',
      excerpt: 'Learn how to join our affiliate program and start earning commissions by promoting products you love.',
      content: `
        <p>Want to earn money online? Our affiliate program lets you earn commissions by promoting products to your audience.</p>

        <h2>What is Affiliate Marketing?</h2>
        <p>Affiliate marketing is a performance-based business model where you earn a commission for promoting products and driving sales through your unique affiliate links.</p>

        <h2>How Much Can You Earn?</h2>
        <ul>
          <li><strong>Base Commission:</strong> 5% on all sales</li>
          <li><strong>Special Rates:</strong> Some products offer higher commissions</li>
          <li><strong>No Limits:</strong> The more you promote, the more you earn</li>
          <li><strong>Passive Income:</strong> Earn from your existing content 24/7</li>
        </ul>

        <h2>Who Can Join?</h2>
        <p>Anyone with an online presence:</p>
        <ul>
          <li>Bloggers and content creators</li>
          <li>YouTubers and video creators</li>
          <li>Social media influencers</li>
          <li>Email marketers</li>
          <li>Review website owners</li>
          <li>Deal and coupon sites</li>
        </ul>

        <h2>Getting Started</h2>
        <ol>
          <li><strong>Sign Up:</strong> <a href="/register?role=affiliate">Register for free</a></li>
          <li><strong>Get Your Links:</strong> Access your unique affiliate links from the dashboard</li>
          <li><strong>Share:</strong> Promote products through your channels</li>
          <li><strong>Earn:</strong> Get paid monthly for qualified sales</li>
        </ol>

        <h2>Promotion Strategies</h2>
        <p><strong>1. Product Reviews</strong></p>
        <p>Write detailed, honest reviews of products you've used or researched.</p>

        <p><strong>2. Comparison Articles</strong></p>
        <p>Create "best of" lists or comparison guides in your niche.</p>

        <p><strong>3. Tutorial Content</strong></p>
        <p>Show how to use products in tutorials or how-to guides.</p>

        <p><strong>4. Social Media</strong></p>
        <p>Share product recommendations with your followers on Instagram, Twitter, TikTok, etc.</p>

        <p><strong>5. Email Marketing</strong></p>
        <p>Include product recommendations in your newsletters (to opted-in subscribers only).</p>

        <h2>Success Tips</h2>
        <ul>
          <li>Choose products relevant to your audience</li>
          <li>Be transparent about affiliate relationships</li>
          <li>Focus on products you genuinely recommend</li>
          <li>Create quality content that provides value</li>
          <li>Track your performance and optimize</li>
          <li>Be patient - affiliate income grows over time</li>
        </ul>

        <h2>Affiliate Dashboard</h2>
        <p>Track your success with our powerful dashboard:</p>
        <ul>
          <li>Real-time earnings and statistics</li>
          <li>Click and conversion tracking</li>
          <li>Performance reports</li>
          <li>Payment history</li>
          <li>Deep linking tools</li>
        </ul>

        <h2>Ready to Start Earning?</h2>
        <p><a href="/register?role=affiliate">Join our affiliate program</a> today and start monetizing your content!</p>

        <p>Read our <a href="/page/affiliate-terms">Affiliate Terms</a> for full program details.</p>
      `,
      category: 'For Affiliates',
      published: true,
      readTime: 6,
      publishedAt: fourDaysAgo,
      createdAt: fourDaysAgo,
      updatedAt: fourDaysAgo
    },
  ];

  for (const p of posts) {
    await Post.updateOne({ slug: p.slug }, { $set: p }, { upsert: true });
  }

  console.log('✅ Posts seeded');
  await mongoose.disconnect();
  process.exit(0);
})();
