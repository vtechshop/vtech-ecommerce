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

  const posts = [
    {
      title: 'Vtech Commercial Blender - Power and Precision for Professional Kitchens',
      slug: 'vtech-commercial-blender-professional-kitchen',
      excerpt: 'Discover the Vtech Commercial Blender - a heavy-duty powerhouse designed for professional kitchens, restaurants, and commercial food preparation.',
      content: `
        <p>When it comes to commercial food preparation, having the right equipment can make all the difference. The <strong>Vtech Commercial Blender</strong> is engineered to deliver exceptional performance in the most demanding professional kitchen environments.</p>

        <h2>Heavy-Duty Power for Professional Use</h2>
        <p>The Vtech Commercial Blender is built with professional-grade components that ensure consistent, reliable performance day after day. Whether you're running a busy restaurant, café, smoothie bar, or catering business, this blender is designed to handle high-volume operations without compromising on quality.</p>

        <h2>Key Features</h2>
        <ul>
          <li><strong>Professional-Grade Motor:</strong> Powerful motor designed for continuous commercial use</li>
          <li><strong>Durable Construction:</strong> Built with heavy-duty materials to withstand rigorous daily operations</li>
          <li><strong>Versatile Performance:</strong> Perfect for smoothies, soups, sauces, purees, and more</li>
          <li><strong>Easy to Clean:</strong> Designed for quick cleanup between uses in busy kitchens</li>
          <li><strong>Reliable Brand:</strong> Backed by Vtech's reputation for quality commercial kitchen equipment</li>
        </ul>

        <h2>Perfect For</h2>
        <ul>
          <li>Restaurants and cafés</li>
          <li>Juice bars and smoothie shops</li>
          <li>Hotels and catering services</li>
          <li>Commercial kitchens and food prep facilities</li>
          <li>Health food stores and nutrition centers</li>
        </ul>

        <h2>Why Choose Vtech Commercial Blender?</h2>
        <p>Vtech has established itself as a trusted name in commercial kitchen equipment. This commercial blender combines durability, power, and efficiency to meet the demands of professional food service operations. The robust design ensures long-lasting performance, while the powerful motor handles even the toughest blending tasks with ease.</p>

        <h2>Specifications</h2>
        <ul>
          <li><strong>Price:</strong> ₹18,500</li>
          <li><strong>Brand:</strong> Vtech</li>
          <li><strong>SKU:</strong> SKU-MIO8U66Z4NA</li>
          <li><strong>Tax Rate:</strong> 18% GST</li>
          <li><strong>Stock:</strong> Available (100 units)</li>
        </ul>

        <h2>Investment in Quality</h2>
        <p>At ₹18,500, the Vtech Commercial Blender represents an excellent investment for any commercial kitchen. The combination of professional-grade performance, durability, and reliability makes it a cost-effective choice for businesses that demand the best.</p>

        <p>Watch our detailed product video to see the Vtech Commercial Blender in action: <a href="https://youtu.be/xnckGklO1a4" target="_blank">Product Demo Video</a></p>

        <h2>Order Today</h2>
        <p>Upgrade your commercial kitchen with the Vtech Commercial Blender. With 100 units in stock and fast shipping, you can start experiencing professional-grade blending performance in your kitchen right away.</p>

        <p><a href="/product/vtech-commercial-blender">View Product Details and Order Now</a></p>
      `,
      category: 'Product Showcase',
      published: true,
      readTime: 4,
      publishedAt: now,
      createdAt: now,
      updatedAt: now
    },
    {
      title: 'Vtech 15 Liter Commercial Tilting Wet Grinder - The Ultimate Solution for Commercial Grinding',
      slug: 'vtech-15-liter-commercial-tilting-wet-grinder',
      excerpt: 'Upgrade your commercial kitchen with the Vtech 15 Liter Commercial Tilting Wet Grinder - perfect for restaurants, hotels, and large-scale food preparation.',
      content: `
        <p>Introducing the <strong>Vtech 15 Liter Commercial Tilting Wet Grinder</strong> - a game-changing piece of equipment designed specifically for commercial kitchens, restaurants, hotels, and catering businesses that demand efficiency, consistency, and quality in their food preparation.</p>

        <h2>Why Choose a Commercial Wet Grinder?</h2>
        <p>Wet grinders are essential equipment for preparing authentic South Indian cuisine, including dosa batter, idli batter, and various chutneys. The Vtech 15 Liter Commercial Tilting Wet Grinder takes this traditional kitchen tool to a professional level, offering superior capacity, durability, and convenience.</p>

        <h2>Key Features</h2>
        <ul>
          <li><strong>15 Liter Capacity:</strong> Large drum size perfect for high-volume commercial operations</li>
          <li><strong>Tilting Mechanism:</strong> Innovative tilting design makes it easy to pour out batter without strain or mess</li>
          <li><strong>Heavy-Duty Construction:</strong> Built with commercial-grade materials for long-lasting durability</li>
          <li><strong>Powerful Motor:</strong> Efficient grinding with consistent results every time</li>
          <li><strong>Easy to Clean:</strong> Designed for quick cleanup between batches in busy kitchens</li>
          <li><strong>Energy Efficient:</strong> Optimized motor performance reduces electricity consumption</li>
        </ul>

        <h2>Perfect For</h2>
        <ul>
          <li>South Indian restaurants and eateries</li>
          <li>Hotel kitchens and buffet services</li>
          <li>Catering businesses and event services</li>
          <li>Commercial kitchen operations</li>
          <li>Food production facilities</li>
          <li>Tiffin centers and breakfast joints</li>
        </ul>

        <h2>The Tilting Advantage</h2>
        <p>What sets this wet grinder apart is its innovative <strong>tilting mechanism</strong>. Traditional wet grinders require you to scoop out the batter manually, which can be time-consuming and messy. The Vtech tilting design allows you to simply tilt the drum and pour the batter directly into your container - saving time, reducing mess, and improving workplace safety.</p>

        <h2>Commercial-Grade Performance</h2>
        <p>This isn't your typical household wet grinder. The Vtech 15 Liter Commercial Wet Grinder is engineered for continuous operation in demanding commercial environments. The robust motor and heavy-duty construction ensure reliable performance batch after batch, day after day.</p>

        <h2>Applications</h2>
        <p>Use the Vtech 15 Liter Commercial Tilting Wet Grinder for:</p>
        <ul>
          <li>Idli and dosa batter preparation</li>
          <li>Grinding chutneys and masalas</li>
          <li>Preparing wet batters for various dishes</li>
          <li>Grinding lentils, rice, and grains</li>
          <li>Making coconut-based preparations</li>
        </ul>

        <h2>Specifications</h2>
        <ul>
          <li><strong>Capacity:</strong> 15 Liters</li>
          <li><strong>Price:</strong> ₹42,000</li>
          <li><strong>Brand:</strong> Vtech</li>
          <li><strong>SKU:</strong> SKU-MIOEBR5L0M6</li>
          <li><strong>Tax Rate:</strong> 18% GST</li>
          <li><strong>Stock:</strong> Available (99 units)</li>
          <li><strong>Featured Product:</strong> Yes</li>
        </ul>

        <h2>Investment That Pays for Itself</h2>
        <p>At ₹42,000, the Vtech 15 Liter Commercial Tilting Wet Grinder is a smart investment for any commercial kitchen. The time saved, consistency achieved, and durability provided make this equipment pay for itself quickly through increased productivity and reduced labor costs.</p>

        <h2>See It in Action</h2>
        <p>Watch our comprehensive product demonstration video to see the Vtech 15 Liter Commercial Tilting Wet Grinder in action: <a href="https://youtu.be/Rpp9RvyMmpQ" target="_blank">Watch Demo Video</a></p>

        <h2>What Customers Say</h2>
        <p>Commercial kitchen operators who have upgraded to the Vtech 15 Liter Commercial Tilting Wet Grinder report significant improvements in their operations:</p>
        <ul>
          <li>Faster batter preparation</li>
          <li>More consistent quality</li>
          <li>Reduced labor time</li>
          <li>Cleaner, more efficient operation</li>
          <li>Reliable daily performance</li>
        </ul>

        <h2>Order Your Vtech Wet Grinder Today</h2>
        <p>Don't let outdated equipment slow down your commercial kitchen. Upgrade to the Vtech 15 Liter Commercial Tilting Wet Grinder and experience the difference that professional-grade equipment makes.</p>

        <p>With 99 units currently in stock and fast shipping available, you can start enjoying the benefits of this premium commercial wet grinder right away.</p>

        <p><a href="/product/vtech-15-liter-commercial-tilting-wet-grinder">View Full Product Details and Order Now</a></p>
      `,
      category: 'Product Showcase',
      published: true,
      readTime: 6,
      publishedAt: yesterday,
      createdAt: yesterday,
      updatedAt: yesterday
    },
    {
      title: 'Why Commercial Kitchen Equipment from Vtech is the Smart Choice',
      slug: 'why-vtech-commercial-kitchen-equipment',
      excerpt: 'Discover why restaurant owners, hoteliers, and catering professionals trust Vtech for their commercial kitchen equipment needs.',
      content: `
        <p>When it comes to equipping a commercial kitchen, the choices you make can significantly impact your business operations, food quality, and bottom line. Vtech has emerged as a trusted name in commercial kitchen equipment, offering professional-grade solutions that deliver reliability, efficiency, and value.</p>

        <h2>The Vtech Difference</h2>
        <p>Vtech specializes in manufacturing high-quality commercial kitchen equipment designed specifically for the demanding needs of professional food service operations. From small cafés to large hotel kitchens, Vtech equipment is built to perform.</p>

        <h2>Our Product Range</h2>
        <p>Vtech offers a comprehensive range of commercial kitchen equipment:</p>
        <ul>
          <li><strong>Commercial Blenders:</strong> Heavy-duty blenders for smoothies, soups, and sauces</li>
          <li><strong>Wet Grinders:</strong> Large-capacity tilting wet grinders for efficient batter preparation</li>
          <li><strong>Food Processors:</strong> Multi-function processors for versatile food prep</li>
          <li><strong>Mixers:</strong> Industrial-strength mixers for bakeries and kitchens</li>
        </ul>

        <h2>Why Choose Vtech?</h2>

        <h3>1. Built for Commercial Use</h3>
        <p>Unlike consumer-grade equipment, Vtech products are engineered for continuous, high-volume operation. Heavy-duty motors, reinforced components, and commercial-grade materials ensure reliable performance even in the busiest kitchens.</p>

        <h3>2. Innovative Features</h3>
        <p>Vtech continuously innovates to make commercial kitchen work easier and more efficient. Features like tilting mechanisms, easy-clean designs, and energy-efficient motors demonstrate our commitment to practical innovation.</p>

        <h3>3. Durability and Longevity</h3>
        <p>Commercial kitchen equipment represents a significant investment. Vtech equipment is built to last, with robust construction that withstands the rigors of daily professional use. This durability means lower replacement costs and better return on investment.</p>

        <h3>4. Competitive Pricing</h3>
        <p>Quality commercial kitchen equipment doesn't have to break the bank. Vtech offers professional-grade equipment at competitive prices, making it accessible for businesses of all sizes.</p>

        <h3>5. Energy Efficiency</h3>
        <p>Modern commercial kitchens need to manage operating costs carefully. Vtech equipment features energy-efficient motors and designs that help reduce electricity consumption without compromising performance.</p>

        <h2>Featured Products</h2>

        <h3>Vtech Commercial Blender - ₹18,500</h3>
        <p>Perfect for juice bars, smoothie shops, and restaurants. Heavy-duty construction with a powerful motor for consistent blending performance. <a href="/product/vtech-commercial-blender">Learn More</a></p>

        <h3>Vtech 15 Liter Commercial Tilting Wet Grinder - ₹42,000</h3>
        <p>The ultimate solution for South Indian restaurants and catering businesses. Large 15-liter capacity with innovative tilting mechanism for easy batter transfer. <a href="/product/vtech-15-liter-commercial-tilting-wet-grinder">Learn More</a></p>

        <h2>Who Trusts Vtech?</h2>
        <ul>
          <li>Restaurant chains and independent eateries</li>
          <li>Hotel kitchens and buffet operations</li>
          <li>Catering companies and event services</li>
          <li>Cloud kitchens and ghost restaurants</li>
          <li>Institutional kitchens (schools, hospitals, corporate cafeterias)</li>
          <li>Food production facilities</li>
        </ul>

        <h2>Making the Right Investment</h2>
        <p>Choosing commercial kitchen equipment is about more than just the initial purchase price. Consider:</p>
        <ul>
          <li><strong>Operating Costs:</strong> Energy-efficient equipment reduces long-term costs</li>
          <li><strong>Maintenance:</strong> Durable, well-built equipment requires less frequent repairs</li>
          <li><strong>Productivity:</strong> Efficient equipment helps you serve more customers</li>
          <li><strong>Quality:</strong> Professional-grade equipment ensures consistent food quality</li>
          <li><strong>Longevity:</strong> Equipment that lasts means better ROI</li>
        </ul>

        <h2>Free Shipping on Orders Over ₹500</h2>
        <p>We offer free shipping on all orders over ₹500, making it even more economical to upgrade your commercial kitchen equipment.</p>

        <h2>Ready to Upgrade Your Kitchen?</h2>
        <p>Browse our complete range of Vtech commercial kitchen equipment and discover how the right equipment can transform your food service operations. With competitive pricing, quality construction, and features designed for professional use, Vtech is the smart choice for commercial kitchens.</p>

        <p><a href="/search?brand=Vtech">View All Vtech Products</a></p>
      `,
      category: 'Product Showcase',
      published: true,
      readTime: 5,
      publishedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo
    },
  ];

  for (const p of posts) {
    await Post.updateOne({ slug: p.slug }, { $set: p }, { upsert: true });
  }

  console.log('✅ Posts seeded');
  await mongoose.disconnect();
  process.exit(0);
})();
