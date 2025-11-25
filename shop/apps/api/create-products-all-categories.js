const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();

const Product = require('./src/models/Product');
const Category = require('./src/models/Category');
const User = require('./src/models/User');

// Products organized by category
const productsByCategory = {
  'Electronics': [
    { title: 'Smart Home Hub', description: 'Central control for all your smart home devices with voice assistant integration', price: 129.99, compareAtPrice: 179.99, images: ['https://images.unsplash.com/photo-1558089687-e53f3c8b9c3d?w=800', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'], stock: 80, featured: true, tags: ['smart-home', 'iot', 'automation'] },
    { title: 'Wireless Charger Pad', description: '15W fast wireless charging pad compatible with all Qi-enabled devices', price: 39.99, compareAtPrice: 59.99, images: ['https://images.unsplash.com/photo-1591290619762-d71b60e0e2c5?w=800', 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800'], stock: 200, featured: false, tags: ['charging', 'wireless', 'accessories'] },
    { title: 'LED Smart Bulbs 4-Pack', description: 'Color-changing smart LED bulbs with app and voice control', price: 49.99, compareAtPrice: 69.99, images: ['https://images.unsplash.com/photo-1567359781514-3b964e2b04d6?w=800', 'https://images.unsplash.com/photo-1585435557193-2d7c41c44b70?w=800'], stock: 150, featured: false, tags: ['smart-lighting', 'led', 'home-automation'] },
    { title: 'Digital Photo Frame', description: '10-inch WiFi digital photo frame with touchscreen and cloud storage', price: 159.99, compareAtPrice: 199.99, images: ['https://images.unsplash.com/photo-1578022761797-b8636ac1773c?w=800', 'https://images.unsplash.com/photo-1516961642265-531546e84af2?w=800'], stock: 60, featured: false, tags: ['photo-frame', 'display', 'digital'] },
    { title: 'Power Bank 20000mAh', description: 'High-capacity portable charger with fast charging and dual USB ports', price: 44.99, compareAtPrice: 64.99, images: ['https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800', 'https://images.unsplash.com/photo-1624823183493-ed5832f48f18?w=800'], stock: 180, featured: true, tags: ['power-bank', 'portable', 'charging'] },
    { title: 'Cable Management Kit', description: 'Complete cable organization system with clips, sleeves, and holders', price: 24.99, compareAtPrice: 34.99, images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'https://images.unsplash.com/photo-1591291621164-2c6367723315?w=800'], stock: 250, featured: false, tags: ['cable-management', 'organization', 'accessories'] },
    { title: 'Screen Cleaning Kit', description: 'Professional screen cleaning solution with microfiber cloths', price: 19.99, compareAtPrice: 29.99, images: ['https://images.unsplash.com/photo-1585435557193-2d7c41c44b70?w=800', 'https://images.unsplash.com/photo-1567359781514-3b964e2b04d6?w=800'], stock: 300, featured: false, tags: ['cleaning', 'maintenance', 'accessories'] },
    { title: 'Desk Lamp LED', description: 'Adjustable LED desk lamp with USB charging port and touch controls', price: 54.99, compareAtPrice: 74.99, images: ['https://images.unsplash.com/photo-1565633545982-15ed4c49e048?w=800', 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800'], stock: 100, featured: false, tags: ['lighting', 'desk', 'led'] },
    { title: 'Bluetooth Tracker Tags 4-Pack', description: 'Item finder tags with app tracking and replaceable battery', price: 69.99, compareAtPrice: 89.99, images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'https://images.unsplash.com/photo-1591291621164-2c6367723315?w=800'], stock: 120, featured: false, tags: ['tracker', 'bluetooth', 'finder'] },
    { title: 'Surge Protector 12 Outlet', description: 'Heavy-duty surge protector with 12 outlets and 4 USB ports', price: 39.99, compareAtPrice: 54.99, images: ['https://images.unsplash.com/photo-1591290619762-d71b60e0e2c5?w=800', 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800'], stock: 140, featured: false, tags: ['surge-protector', 'power', 'safety'] },
  ],
  'Computers & Laptops': [
    { title: 'Gaming Laptop RTX 4080', description: 'High-performance gaming laptop with RTX 4080, 32GB RAM, 2TB SSD', price: 2499.99, compareAtPrice: 2899.99, images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800'], stock: 15, featured: true, tags: ['gaming-laptop', 'high-performance', 'rtx'] },
    { title: 'Business Ultrabook', description: 'Thin and light business laptop with Intel i7, 16GB RAM, 512GB SSD', price: 1299.99, compareAtPrice: 1599.99, images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'], stock: 40, featured: true, tags: ['business', 'ultrabook', 'portable'] },
    { title: 'Desktop PC Workstation', description: 'Powerful workstation PC for creative professionals with 64GB RAM', price: 3299.99, compareAtPrice: 3799.99, images: ['https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800', 'https://images.unsplash.com/photo-1591799265444-d66432b91588?w=800'], stock: 20, featured: false, tags: ['desktop', 'workstation', 'professional'] },
    { title: 'Chromebook 14-inch', description: 'Fast and secure Chromebook perfect for students and everyday use', price: 399.99, compareAtPrice: 499.99, images: ['https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=800', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800'], stock: 80, featured: false, tags: ['chromebook', 'student', 'affordable'] },
    { title: 'All-in-One Desktop 27"', description: '27-inch 4K all-in-one desktop with touchscreen and wireless peripherals', price: 1799.99, compareAtPrice: 2199.99, images: ['https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800', 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800'], stock: 30, featured: false, tags: ['all-in-one', 'desktop', '4k'] },
    { title: 'Laptop Cooling Pad', description: 'RGB cooling pad with 6 quiet fans and adjustable height', price: 34.99, compareAtPrice: 49.99, images: ['https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800', 'https://images.unsplash.com/photo-1591290619762-d71b60e0e2c5?w=800'], stock: 150, featured: false, tags: ['cooling', 'laptop-accessory', 'rgb'] },
    { title: 'Laptop Stand Aluminum', description: 'Ergonomic aluminum laptop stand with ventilation design', price: 49.99, compareAtPrice: 69.99, images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800', 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800'], stock: 200, featured: false, tags: ['stand', 'aluminum', 'ergonomic'] },
    { title: 'External GPU Enclosure', description: 'Thunderbolt 3 eGPU enclosure for laptop graphics boost', price: 349.99, compareAtPrice: 449.99, images: ['https://images.unsplash.com/photo-1591799265444-d66432b91588?w=800', 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800'], stock: 25, featured: false, tags: ['egpu', 'graphics', 'thunderbolt'] },
    { title: 'Laptop Privacy Screen', description: '15.6-inch privacy filter to protect sensitive information', price: 39.99, compareAtPrice: 54.99, images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'], stock: 100, featured: false, tags: ['privacy', 'screen-filter', 'security'] },
    { title: 'USB Docking Station', description: 'Universal docking station with dual monitor support and 13 ports', price: 179.99, compareAtPrice: 229.99, images: ['https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800', 'https://images.unsplash.com/photo-1591290619762-d71b60e0e2c5?w=800'], stock: 60, featured: true, tags: ['docking', 'usb', 'workstation'] },
  ],
  'Smartphones & Tablets': [
    { title: 'Flagship Smartphone 512GB', description: 'Latest flagship with AI camera, 5G, and all-day battery life', price: 1199.99, compareAtPrice: 1399.99, images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800', 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800'], stock: 50, featured: true, tags: ['smartphone', '5g', 'flagship'] },
    { title: 'Budget Smartphone 128GB', description: 'Affordable smartphone with great camera and long battery life', price: 299.99, compareAtPrice: 399.99, images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800', 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800'], stock: 120, featured: false, tags: ['smartphone', 'budget', 'affordable'] },
    { title: 'iPad Pro 12.9" 256GB', description: 'Professional tablet with M2 chip and ProMotion display', price: 1099.99, compareAtPrice: 1299.99, images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800', 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800'], stock: 40, featured: true, tags: ['tablet', 'ipad', 'professional'] },
    { title: 'Android Tablet 10"', description: '10-inch Android tablet perfect for media and productivity', price: 249.99, compareAtPrice: 329.99, images: ['https://images.unsplash.com/photo-1585790050230-5dd28404f398?w=800', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800'], stock: 80, featured: false, tags: ['tablet', 'android', 'media'] },
    { title: 'Phone Case Premium Leather', description: 'Genuine leather case with card slots and kickstand', price: 49.99, compareAtPrice: 69.99, images: ['https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800', 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800'], stock: 200, featured: false, tags: ['case', 'leather', 'accessory'] },
    { title: 'Tempered Glass Screen Protector 3-Pack', description: 'Crystal clear tempered glass with easy installation kit', price: 24.99, compareAtPrice: 34.99, images: ['https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800', 'https://images.unsplash.com/photo-1591290619762-d71b60e0e2c5?w=800'], stock: 300, featured: false, tags: ['screen-protector', 'glass', 'protection'] },
    { title: 'Tablet Keyboard Case', description: 'Bluetooth keyboard case with trackpad and adjustable angles', price: 89.99, compareAtPrice: 119.99, images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800', 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800'], stock: 70, featured: false, tags: ['keyboard', 'tablet-case', 'bluetooth'] },
    { title: 'Phone Gimbal Stabilizer', description: '3-axis smartphone gimbal for smooth video recording', price: 129.99, compareAtPrice: 169.99, images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800'], stock: 50, featured: false, tags: ['gimbal', 'stabilizer', 'video'] },
    { title: 'Tablet Stand Adjustable', description: 'Multi-angle tablet stand for desk and bedside use', price: 29.99, compareAtPrice: 44.99, images: ['https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800', 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800'], stock: 150, featured: false, tags: ['stand', 'tablet-accessory', 'holder'] },
    { title: 'Wireless Car Charger Mount', description: 'Fast wireless charging car mount with auto-clamping', price: 44.99, compareAtPrice: 59.99, images: ['https://images.unsplash.com/photo-1591290619762-d71b60e0e2c5?w=800', 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800'], stock: 100, featured: false, tags: ['car-mount', 'wireless-charging', 'automotive'] },
  ],
  'Audio & Headphones': [
    { title: 'Premium Wireless Headphones', description: 'High-quality wireless headphones with noise cancellation and 30-hour battery', price: 299.99, compareAtPrice: 399.99, images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800'], stock: 60, featured: true, tags: ['wireless', 'noise-cancelling', 'headphones'] },
    { title: 'True Wireless Earbuds Pro', description: 'Premium TWS earbuds with ANC and wireless charging case', price: 199.99, compareAtPrice: 249.99, images: ['https://images.unsplash.com/photo-1590658165737-15a047b7a430?w=800', 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=800'], stock: 100, featured: true, tags: ['earbuds', 'wireless', 'anc'] },
    { title: 'Studio Monitor Speakers Pair', description: 'Professional studio monitors for music production and mixing', price: 399.99, compareAtPrice: 499.99, images: ['https://images.unsplash.com/photo-1558584673-c834fb92d337?w=800', 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800'], stock: 40, featured: false, tags: ['studio', 'monitors', 'speakers'] },
    { title: 'Bluetooth Speaker Waterproof', description: 'Portable Bluetooth speaker with 360° sound and IPX7 waterproof', price: 89.99, compareAtPrice: 119.99, images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800', 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800'], stock: 120, featured: false, tags: ['speaker', 'bluetooth', 'waterproof'] },
    { title: 'Gaming Headset RGB', description: '7.1 surround sound gaming headset with detachable mic and RGB lighting', price: 89.99, compareAtPrice: 129.99, images: ['https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800', 'https://images.unsplash.com/photo-1599669454699-248893623440?w=800'], stock: 80, featured: false, tags: ['gaming', 'headset', 'rgb'] },
    { title: 'Soundbar with Subwoofer', description: 'Home theater soundbar system with wireless subwoofer and Dolby Atmos', price: 449.99, compareAtPrice: 599.99, images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800', 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800'], stock: 30, featured: true, tags: ['soundbar', 'home-theater', 'dolby'] },
    { title: 'Podcast Microphone Kit', description: 'USB condenser microphone with boom arm and pop filter', price: 129.99, compareAtPrice: 179.99, images: ['https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800'], stock: 60, featured: false, tags: ['microphone', 'podcast', 'usb'] },
    { title: 'Vinyl Record Player', description: 'Bluetooth turntable with built-in speakers and USB output', price: 179.99, compareAtPrice: 229.99, images: ['https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800', 'https://images.unsplash.com/photo-1603481546852-cc18e3e16b30?w=800'], stock: 45, featured: false, tags: ['turntable', 'vinyl', 'retro'] },
    { title: 'Headphone Stand RGB', description: 'Premium headphone stand with RGB lighting and USB hub', price: 39.99, compareAtPrice: 54.99, images: ['https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800', 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800'], stock: 150, featured: false, tags: ['stand', 'accessory', 'rgb'] },
    { title: 'Audio Interface 2-Channel', description: 'Professional audio interface for recording and production', price: 199.99, compareAtPrice: 249.99, images: ['https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800'], stock: 50, featured: false, tags: ['audio-interface', 'recording', 'professional'] },
  ],
  'Gaming': [
    { title: 'Gaming Console Next-Gen', description: 'Latest generation gaming console with 4K 120fps support', price: 499.99, compareAtPrice: 599.99, images: ['https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800'], stock: 30, featured: true, tags: ['console', 'gaming', 'next-gen'] },
    { title: 'Gaming PC Pre-Built', description: 'High-performance gaming PC with RTX 4070 and RGB lighting', price: 1999.99, compareAtPrice: 2399.99, images: ['https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800', 'https://images.unsplash.com/photo-1591799265444-d66432b91588?w=800'], stock: 20, featured: true, tags: ['gaming-pc', 'rtx', 'pre-built'] },
    { title: 'Mechanical Gaming Keyboard', description: 'RGB mechanical keyboard with Cherry MX switches and macro keys', price: 149.99, compareAtPrice: 199.99, images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800', 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800'], stock: 100, featured: false, tags: ['keyboard', 'mechanical', 'rgb'] },
    { title: 'Gaming Mouse Wireless', description: 'Lightweight wireless gaming mouse with 25K DPI sensor', price: 79.99, compareAtPrice: 99.99, images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800', 'https://images.unsplash.com/photo-1563297007-0686b7003af7?w=800'], stock: 150, featured: false, tags: ['mouse', 'wireless', 'gaming'] },
    { title: 'Gaming Monitor 27" 165Hz', description: '27-inch QHD gaming monitor with 165Hz refresh rate and G-Sync', price: 399.99, compareAtPrice: 499.99, images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'], stock: 50, featured: true, tags: ['monitor', 'gaming', '165hz'] },
    { title: 'Gaming Chair Ergonomic', description: 'Professional gaming chair with lumbar support and adjustable armrests', price: 299.99, compareAtPrice: 399.99, images: ['https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=800', 'https://images.unsplash.com/photo-1618221381711-42ca8ab6e908?w=800'], stock: 40, featured: false, tags: ['chair', 'ergonomic', 'gaming'] },
    { title: 'VR Headset Standalone', description: 'All-in-one VR headset with hand tracking and 4K display', price: 399.99, compareAtPrice: 499.99, images: ['https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=800', 'https://images.unsplash.com/photo-1617802690992-15d93263d3a9?w=800'], stock: 35, featured: false, tags: ['vr', 'headset', 'standalone'] },
    { title: 'Controller Wireless Elite', description: 'Pro wireless controller with programmable buttons and hair triggers', price: 179.99, compareAtPrice: 229.99, images: ['https://images.unsplash.com/photo-1585665781876-b630c8e049c3?w=800', 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800'], stock: 70, featured: false, tags: ['controller', 'wireless', 'pro'] },
    { title: 'Gaming Desk RGB', description: 'Large gaming desk with RGB lighting and cable management', price: 349.99, compareAtPrice: 449.99, images: ['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800', 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=800'], stock: 25, featured: false, tags: ['desk', 'gaming', 'rgb'] },
    { title: 'Streaming Camera 1080p60', description: 'HD streaming webcam with auto-focus and ring light', price: 99.99, compareAtPrice: 129.99, images: ['https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800', 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800'], stock: 80, featured: false, tags: ['webcam', 'streaming', '1080p'] },
  ],
  'Cameras & Photography': [
    { title: 'Mirrorless Camera 24MP', description: 'Professional mirrorless camera with 4K video and in-body stabilization', price: 1799.99, compareAtPrice: 2199.99, images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800', 'https://images.unsplash.com/photo-1606980624941-2c4a1c484fc6?w=800'], stock: 25, featured: true, tags: ['camera', 'mirrorless', '4k'] },
    { title: 'DSLR Camera Kit 24.1MP', description: 'DSLR camera with 18-55mm lens kit for beginners and enthusiasts', price: 699.99, compareAtPrice: 899.99, images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800', 'https://images.unsplash.com/photo-1606980631796-2dd3f3975d32?w=800'], stock: 40, featured: false, tags: ['dslr', 'camera-kit', 'photography'] },
    { title: 'Action Camera 4K', description: 'Waterproof action camera with image stabilization and accessories', price: 299.99, compareAtPrice: 399.99, images: ['https://images.unsplash.com/photo-1581518389331-cf387fc1106e?w=800', 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800'], stock: 60, featured: true, tags: ['action-camera', '4k', 'waterproof'] },
    { title: 'Camera Lens 50mm f/1.8', description: 'Prime lens with wide aperture for stunning portraits and low light', price: 199.99, compareAtPrice: 249.99, images: ['https://images.unsplash.com/photo-1606980631796-2dd3f3975d32?w=800', 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'], stock: 70, featured: false, tags: ['lens', 'prime', 'photography'] },
    { title: 'Camera Tripod Carbon Fiber', description: 'Professional carbon fiber tripod with ball head and carrying case', price: 179.99, compareAtPrice: 229.99, images: ['https://images.unsplash.com/photo-1606980631796-2dd3f3975d32?w=800', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'], stock: 50, featured: false, tags: ['tripod', 'carbon-fiber', 'professional'] },
    { title: 'Camera Bag Backpack', description: 'Weatherproof camera backpack with laptop compartment', price: 129.99, compareAtPrice: 169.99, images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', 'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=800'], stock: 80, featured: false, tags: ['camera-bag', 'backpack', 'protection'] },
    { title: 'Ring Light LED 18"', description: '18-inch dimmable LED ring light with phone holder and stand', price: 89.99, compareAtPrice: 119.99, images: ['https://images.unsplash.com/photo-1565633545982-15ed4c49e048?w=800', 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800'], stock: 100, featured: false, tags: ['ring-light', 'led', 'lighting'] },
    { title: 'Memory Card 128GB', description: 'High-speed SD card for 4K video recording and burst photography', price: 39.99, compareAtPrice: 54.99, images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800', 'https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=800'], stock: 200, featured: false, tags: ['memory-card', 'sd-card', 'storage'] },
    { title: 'Camera Cleaning Kit Pro', description: 'Professional cleaning kit for cameras and lenses', price: 29.99, compareAtPrice: 44.99, images: ['https://images.unsplash.com/photo-1585435557193-2d7c41c44b70?w=800', 'https://images.unsplash.com/photo-1567359781514-3b964e2b04d6?w=800'], stock: 150, featured: false, tags: ['cleaning', 'maintenance', 'accessories'] },
    { title: 'Gimbal Stabilizer 3-Axis', description: 'Professional 3-axis gimbal for smooth video recording', price: 249.99, compareAtPrice: 329.99, images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800'], stock: 45, featured: false, tags: ['gimbal', 'stabilizer', 'video'] },
  ],
  'Wearables': [
    { title: 'Smart Watch Pro', description: 'Advanced fitness tracking, heart rate monitoring, and smartphone notifications', price: 399.99, compareAtPrice: 499.99, images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800'], stock: 75, featured: true, tags: ['smartwatch', 'fitness', 'wearable'] },
    { title: 'Fitness Tracker Band', description: 'Lightweight fitness band with sleep tracking and 7-day battery', price: 79.99, compareAtPrice: 99.99, images: ['https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800', 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800'], stock: 150, featured: false, tags: ['fitness-tracker', 'band', 'health'] },
    { title: 'Smart Ring', description: 'Health tracking ring with heart rate and sleep monitoring', price: 299.99, compareAtPrice: 399.99, images: ['https://images.unsplash.com/photo-1611652022419-a9419f74343a?w=800', 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=800'], stock: 40, featured: false, tags: ['smart-ring', 'health', 'tracking'] },
    { title: 'Kids Smart Watch', description: 'GPS tracking watch for kids with SOS button and games', price: 89.99, compareAtPrice: 119.99, images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800'], stock: 80, featured: false, tags: ['kids', 'gps', 'smartwatch'] },
    { title: 'Running Watch GPS', description: 'GPS running watch with training plans and performance metrics', price: 249.99, compareAtPrice: 329.99, images: ['https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800', 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800'], stock: 60, featured: true, tags: ['running', 'gps', 'sports'] },
    { title: 'Smart Glasses', description: 'Audio smart glasses with open-ear speakers and voice assistant', price: 199.99, compareAtPrice: 249.99, images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800', 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800'], stock: 50, featured: false, tags: ['smart-glasses', 'audio', 'wearable'] },
    { title: 'Watch Band Leather', description: 'Premium leather watch band compatible with most smartwatches', price: 39.99, compareAtPrice: 54.99, images: ['https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800', 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800'], stock: 200, featured: false, tags: ['watch-band', 'leather', 'accessory'] },
    { title: 'Smart Watch Charger Stand', description: 'Aluminum charging stand for smartwatches with cable management', price: 29.99, compareAtPrice: 39.99, images: ['https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800', 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800'], stock: 150, featured: false, tags: ['charger', 'stand', 'accessory'] },
    { title: 'Screen Protector Watch 3-Pack', description: 'Tempered glass screen protectors for smartwatches', price: 19.99, compareAtPrice: 29.99, images: ['https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800', 'https://images.unsplash.com/photo-1591290619762-d71b60e0e2c5?w=800'], stock: 250, featured: false, tags: ['screen-protector', 'protection', 'accessory'] },
    { title: 'Heart Rate Monitor Chest Strap', description: 'Professional chest strap for accurate heart rate monitoring', price: 49.99, compareAtPrice: 69.99, images: ['https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800', 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800'], stock: 100, featured: false, tags: ['heart-rate', 'fitness', 'monitor'] },
  ],
};

async function createAllProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shop');
    console.log('✅ Connected to MongoDB\n');

    // Find admin or vendor
    let vendor = await User.findOne({ role: 'admin' });
    if (!vendor) {
      vendor = await User.findOne({ role: 'vendor' });
    }
    if (!vendor) {
      console.error('❌ No admin or vendor found. Please create a user first.');
      process.exit(1);
    }

    // Clear existing products
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products\n');

    let totalCreated = 0;
    let featuredCount = 0;

    // Create products for each category
    for (const [categoryName, products] of Object.entries(productsByCategory)) {
      console.log(`📦 Creating products for: ${categoryName}`);

      const category = await Category.findOne({ name: categoryName });
      if (!category) {
        console.log(`⚠️  Category "${categoryName}" not found, skipping...`);
        continue;
      }

      for (const productData of products) {
        const product = await Product.create({
          ...productData,
          categoryIds: [category._id],
          vendorId: vendor._id,
          status: 'active',
          published: true,
        });

        if (product.featured) featuredCount++;
        totalCreated++;
        console.log(`  ✓ ${product.title}`);
      }
      console.log('');
    }

    console.log('🎉 Product creation complete!');
    console.log(`   Total products: ${totalCreated}`);
    console.log(`   Featured products: ${featuredCount}`);
    console.log(`   Categories: ${Object.keys(productsByCategory).length}`);
    console.log(`   All products have Unsplash images ✨`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAllProducts();
