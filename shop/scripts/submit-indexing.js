// FILE: scripts/submit-indexing.js
// Google Indexing API - Submit URLs for indexing
// Usage: node scripts/submit-indexing.js [--key path/to/key.json] [--dry-run]

const https = require('https');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

// Config
const SITEMAP_URL = 'https://www.vtechkitchen.com/sitemap.xml';
const INDEXING_API = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const DELAY_MS = 500; // 500ms between requests to avoid rate limits
const QUOTA_LIMIT = 200; // Google's daily quota

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const keyIdx = args.indexOf('--key');
const keyPath = keyIdx !== -1 && args[keyIdx + 1]
  ? path.resolve(args[keyIdx + 1])
  : path.resolve(__dirname, '..', 'google-indexing-key.json');

// ========== HELPERS ==========

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractUrls(sitemapXml) {
  const urls = [];
  const regex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = regex.exec(sitemapXml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

async function submitUrl(auth, url) {
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ url, type: 'URL_UPDATED' });

    const req = https.request(INDEXING_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.token}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ========== MAIN ==========

async function main() {
  console.log('=== Google Indexing API Submitter ===\n');

  // Check key file
  if (!fs.existsSync(keyPath)) {
    console.error(`ERROR: Service account key not found at: ${keyPath}`);
    console.error('\nPlace your JSON key file at one of these locations:');
    console.error(`  1. ${path.resolve(__dirname, '..', 'google-indexing-key.json')}`);
    console.error('  2. Or specify: node scripts/submit-indexing.js --key /path/to/key.json');
    process.exit(1);
  }

  console.log(`Key file: ${keyPath}`);
  console.log(`Dry run: ${dryRun ? 'YES (no submissions)' : 'NO (will submit)'}\n`);

  // Auth
  const auth = new GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });

  // Fetch sitemap
  console.log(`Fetching sitemap: ${SITEMAP_URL}`);
  const sitemapXml = await fetchUrl(SITEMAP_URL);
  const urls = extractUrls(sitemapXml);
  console.log(`Found ${urls.length} URLs in sitemap\n`);

  if (urls.length === 0) {
    console.error('No URLs found in sitemap!');
    process.exit(1);
  }

  if (urls.length > QUOTA_LIMIT) {
    console.warn(`WARNING: ${urls.length} URLs exceeds daily quota of ${QUOTA_LIMIT}.`);
    console.warn(`Only the first ${QUOTA_LIMIT} will be submitted.\n`);
  }

  const toSubmit = urls.slice(0, QUOTA_LIMIT);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < toSubmit.length; i++) {
    const url = toSubmit[i];
    const progress = `[${i + 1}/${toSubmit.length}]`;

    if (dryRun) {
      console.log(`${progress} (dry-run) ${url}`);
    } else {
      try {
        const result = await submitUrl(auth, url);
        if (result.status === 200) {
          console.log(`${progress} OK  ${url}`);
          success++;
        } else {
          console.log(`${progress} ERR ${url} — ${result.status}: ${JSON.stringify(result.data)}`);
          failed++;
        }
      } catch (err) {
        console.log(`${progress} ERR ${url} — ${err.message}`);
        failed++;
      }

      // Rate limit delay
      if (i < toSubmit.length - 1) {
        await sleep(DELAY_MS);
      }
    }
  }

  console.log('\n=== Done ===');
  if (!dryRun) {
    console.log(`Submitted: ${success} OK, ${failed} failed, ${urls.length - toSubmit.length} skipped (quota)`);
  } else {
    console.log(`Dry run complete. ${toSubmit.length} URLs would be submitted.`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
