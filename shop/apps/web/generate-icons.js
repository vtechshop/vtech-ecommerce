// Script to generate PWA icons from source logo
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceLogo = path.join(__dirname, 'src', 'cropped-vtech-logo.webp');
const iconsDir = path.join(__dirname, 'public', 'icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('PWA Icon Generation');
console.log('===================');
console.log(`Source logo: ${sourceLogo}`);
console.log(`Output directory: ${iconsDir}`);

// Check if source exists
if (!fs.existsSync(sourceLogo)) {
  console.error('❌ Source logo not found:', sourceLogo);
  process.exit(1);
}

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('✅ Created icons directory');
}

console.log('\n📝 Note: This script requires manual icon generation.');
console.log('Please use one of these methods:\n');

console.log('Option 1: Use an online tool (Recommended)');
console.log('- Visit: https://realfavicongenerator.net/');
console.log('- Upload:', sourceLogo);
console.log('- Download the generated icons');
console.log('- Extract to:', iconsDir);

console.log('\nOption 2: Use ImageMagick (if installed)');
console.log('Run these commands:');
sizes.forEach(size => {
  console.log(`magick convert "${sourceLogo}" -resize ${size}x${size} "${path.join(iconsDir, `icon-${size}x${size}.png`)}"`);
});

console.log('\nOption 3: Use sharp package (Node.js)');
console.log('npm install sharp');
console.log('Then uncomment the code below in this file\n');

// Uncomment this section if you want to use sharp
/*
import sharp from 'sharp';

(async () => {
  console.log('\n🔄 Generating icons with sharp...\n');

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    try {
      await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate ${size}x${size}:`, error.message);
    }
  }

  console.log('\n✅ All icons generated successfully!');
})();
*/

console.log('\n💡 Quick fix: Disable PWA temporarily');
console.log('Edit src/main.jsx and comment out the service worker registration code (lines 37-65)');
