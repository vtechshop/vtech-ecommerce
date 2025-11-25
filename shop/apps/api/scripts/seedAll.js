// FILE: apps/api/scripts/seedAll.js
const { exec } = require('child_process');
const path = require('path');

const scripts = [
  'seedCategories.js',
  'seedUser.js',
  'seedPages.js',
  'seedPosts.js',
  'seedSettings.js',
];

console.log('🌱 Starting seed process...\n');

const runScript = (script) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, script);
    console.log(`Running ${script}...`);

    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error in ${script}:`, error.message);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`⚠️  Warning in ${script}:`, stderr);
      }
      console.log(stdout);
      resolve();
    });
  });
};

(async () => {
  try {
    for (const script of scripts) {
      await runScript(script);
    }
    console.log('\n✅ All seeds completed successfully!');
    console.log('\nYou can now:');
    console.log('- Visit /page/about to see the About page');
    console.log('- Visit /blog to see blog posts');
    console.log('- Browse categories from the navigation');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed process failed:', error.message);
    process.exit(1);
  }
})();
