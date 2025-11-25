# Database Seed Scripts

These scripts populate your database with demo content to help you get started quickly.

## Quick Start

Run all seed scripts at once:

```bash
cd apps/api
node scripts/seedAll.js
```

## Individual Seed Scripts

You can also run individual scripts:

### 1. Seed Categories
```bash
node scripts/seedCategories.js
```
Creates product categories:
- Electronics
- Fashion
- Home & Garden
- Sports
- etc.

### 2. Seed Users
```bash
node scripts/seedUser.js
```
Creates test users:
- Admin account
- Vendor account
- Affiliate account
- Customer account

### 3. Seed Pages
```bash
node scripts/seedPages.js
```
Creates CMS pages:
- About Us
- Privacy Policy
- Return & Refund Policy
- Contact Us
- Vendor Terms & Conditions
- Affiliate Program Terms

### 4. Seed Blog Posts
```bash
node scripts/seedPosts.js
```
Creates demo blog posts:
- Welcome to Our Marketplace
- 10 Tips for Smart Online Shopping
- How to Choose the Perfect Smartphone
- Become a Vendor
- Affiliate Marketing Guide

### 5. Seed Settings
```bash
node scripts/seedSettings.js
```
Creates default system settings.

## After Seeding

Once seeding is complete, you can access:

- **About Page:** `/page/about`
- **Blog:** `/blog`
- **Categories:** Navigate from the header menu
- **All Pages:** `/page/{slug}`

## Troubleshooting

If you encounter errors:

1. **Connection Error:** Make sure MongoDB is running and MONGO_URI in .env is correct
2. **Duplicate Key Error:** The scripts use upsert, so running them multiple times is safe
3. **Missing Models:** Make sure you're running from the correct directory

## Environment Variables

Make sure your `.env` file contains:

```env
MONGO_URI=mongodb://localhost:27017/shop
```

## Need More Data?

You can modify the seed scripts to add more content:
- Edit `seedPages.js` to add more CMS pages
- Edit `seedPosts.js` to add more blog posts
- Edit `seedCategories.js` to add more product categories
