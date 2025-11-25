# 📢 Ad Placement System - Complete Guide

## ✅ What Has Been Implemented

Your e-commerce platform now has a **complete ad management system** with enable/disable controls for different ad placements throughout the website.

---

## 📍 Available Ad Placements

The following ad placements are now available and can be controlled from Admin Settings:

| Placement ID | Location | Description | Default Status |
|-------------|----------|-------------|----------------|
| `left_sidebar` | Left sidebar on pages | Vertical ad on left side | ✅ Enabled |
| `right_sidebar` | Right sidebar on pages | Vertical ad on right side | ✅ Enabled |
| `top_banner` | Top of pages | Horizontal banner at top | ✅ Enabled |
| `bottom_banner` | Bottom of pages | Horizontal banner at bottom | ✅ Enabled |
| `homepage_hero` | Homepage hero section | Large hero ad on homepage | ✅ Enabled |
| `category_header` | Category page header | Ad on category listing pages | ✅ Enabled |
| `product_page_side` | Product detail page sidebar | Ad next to product details | ✅ Enabled |
| `product_list` | Within product listings | In-feed ads between products | ✅ Enabled |
| `cart_page` | Cart/Checkout page | Ad on cart page | ❌ Disabled |

---

## 🎛️ Admin Controls

### Navigate to Ad Settings

1. **Login as Admin**
2. Go to: **Admin Dashboard → Settings → Ads** tab
3. You'll see all available ad placement settings

### Available Controls Per Placement

Each ad placement has the following settings:

#### 1. **Enable/Disable Toggle**
- **Setting Key:** `ads.placement.{placement}.enabled`
- **Type:** Boolean (true/false)
- **Example:** `ads.placement.left_sidebar.enabled`
- **Description:** Turn ad placement on or off

#### 2. **Priority Level** (for some placements)
- **Setting Key:** `ads.placement.{placement}.priority`
- **Options:** High, Medium, Low
- **Description:** Determines which ads show first

#### 3. **Global Master Toggle**
- **Setting Key:** `ads.global.enabled`
- **Type:** Boolean
- **Description:** Master switch - disables ALL ads site-wide when turned off

#### 4. **Auto-Refresh Interval**
- **Setting Key:** `ads.global.refresh_interval`
- **Type:** Number (seconds)
- **Default:** 30 seconds
- **Description:** How often ads auto-refresh (set to 0 to disable)

---

## 🔧 How to Use in Frontend

### Method 1: Use the AdPlacement Component

```jsx
import AdPlacement from '@/components/ads/AdPlacement';

// In your component
function MyPage() {
  return (
    <div className="container">
      {/* Left Sidebar Ad */}
      <aside className="sidebar-left">
        <AdPlacement
          placement="left_sidebar"
          className="sticky top-4"
          fallback={<div>No ads available</div>}
        />
      </aside>

      {/* Main Content */}
      <main>
        <h1>Page Content</h1>
      </main>

      {/* Right Sidebar Ad */}
      <aside className="sidebar-right">
        <AdPlacement
          placement="right_sidebar"
          className="sticky top-4"
        />
      </aside>
    </div>
  );
}
```

### Method 2: Homepage Hero Ad

```jsx
import AdPlacement from '@/components/ads/AdPlacement';

function Homepage() {
  return (
    <>
      {/* Hero Ad Placement */}
      <AdPlacement
        placement="homepage_hero"
        className="mb-8"
      />

      {/* Rest of homepage content */}
      <FeaturedProducts />
      <Categories />
    </>
  );
}
```

### Method 3: Top Banner Ad

```jsx
// In your Layout component
import AdPlacement from '@/components/ads/AdPlacement';

function Layout({ children }) {
  return (
    <div>
      <Header />

      {/* Top Banner Ad */}
      <AdPlacement placement="top_banner" className="w-full" />

      <main>{children}</main>

      {/* Bottom Banner Ad */}
      <AdPlacement placement="bottom_banner" className="w-full" />

      <Footer />
    </div>
  );
}
```

### Method 4: Product Page Side Ad

```jsx
// In Product.jsx
import AdPlacement from '@/components/ads/AdPlacement';

function ProductPage() {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Product Info - 8 columns */}
      <div className="col-span-8">
        <ProductImages />
        <ProductDetails />
      </div>

      {/* Right Sidebar - 4 columns */}
      <aside className="col-span-4">
        <ProductActions />

        {/* Product Page Ad */}
        <AdPlacement
          placement="product_page_side"
          className="mt-6"
        />
      </aside>
    </div>
  );
}
```

### Method 5: In-Feed Ads (Product Listings)

```jsx
// In ProductGrid.jsx
import AdPlacement from '@/components/ads/AdPlacement';

function ProductGrid({ products }) {
  // Get ad frequency from settings (default: every 6 products)
  const adFrequency = 6;

  return (
    <div className="grid grid-cols-4 gap-4">
      {products.map((product, index) => (
        <>
          <ProductCard key={product._id} product={product} />

          {/* Show ad after every N products */}
          {(index + 1) % adFrequency === 0 && (
            <div className="col-span-1">
              <AdPlacement
                placement="product_list"
                className="h-full"
              />
            </div>
          )}
        </>
      ))}
    </div>
  );
}
```

---

## 📊 Ad Campaign Setup

### Creating Ad Campaigns

1. Go to: **Admin Dashboard → Sponsored Ads**
2. Click **"Create Campaign"**
3. Fill in campaign details:
   - **Title:** Campaign name
   - **Type:** Image, Banner, HTML, or Product
   - **Target URL:** Where ad clicks go
   - **Placements:** Select placement IDs (e.g., `left_sidebar`, `top_banner`)
   - **Budget:** Total budget
   - **Start/End Date:** Campaign duration

### Ad Types

#### 1. **Image Ad**
- Upload an image
- Set target URL
- Best for: Sidebar placements

#### 2. **Banner Ad**
- Title, description, CTA button
- Gradient background
- Best for: Top/bottom banners

#### 3. **HTML Ad**
- Custom HTML content
- Full creative control
- Best for: Advanced users

#### 4. **Product Ad**
- Promote specific products
- Auto-populated from product catalog
- Best for: In-feed ads

---

## 🚀 Testing the System

### Step 1: Verify Settings Created

1. Login as Admin
2. Navigate to: **Settings → Ads**
3. You should see:
   - `ads.global.enabled` - Master toggle
   - `ads.placement.left_sidebar.enabled`
   - `ads.placement.right_sidebar.enabled`
   - `ads.placement.top_banner.enabled`
   - And more...

### Step 2: Create Test Campaign

1. Go to: **Sponsored Ads → Create Campaign**
2. Create a simple banner ad:
   - Title: "Test Ad"
   - Type: Banner
   - Description: "This is a test"
   - Placements: Select `top_banner`
   - Status: Active
   - Start Date: Today
   - End Date: Next week

### Step 3: Add AdPlacement to Your Pages

Add the component to any page you want to show ads:

```jsx
import AdPlacement from '@/components/ads/AdPlacement';

<AdPlacement placement="top_banner" />
```

### Step 4: Test Enable/Disable

1. Go to **Settings → Ads**
2. Find `ads.placement.top_banner.enabled`
3. Click **Edit**
4. Toggle to **Disabled**
5. Click **Save**
6. Visit your website - ad should disappear
7. Toggle back to **Enabled** - ad should reappear

---

## 🎯 API Endpoints

### Public Endpoints (No Auth Required)

#### Get Ad for Placement
```http
GET /api/ads/placement/:placement

Example: GET /api/ads/placement/left_sidebar

Response:
{
  "success": true,
  "data": {
    "_id": "campaign_id",
    "title": "Ad Title",
    "type": "banner",
    "targetUrl": "https://example.com",
    "imageUrl": "https://...",
    "description": "Ad description"
  }
}
```

#### Track Ad Impression
```http
POST /api/ads/:id/impression
Body: { "placement": "left_sidebar" }
```

#### Track Ad Click
```http
POST /api/ads/:id/click
Body: { "placement": "left_sidebar" }
```

#### Get Public Settings
```http
GET /api/settings/public?category=ads

Response:
{
  "success": true,
  "data": [
    {
      "key": "ads.global.enabled",
      "value": "true",
      "type": "boolean",
      "category": "ads"
    },
    ...
  ]
}
```

---

## 📝 Advanced Configuration

### Custom Ad Refresh Interval

```jsx
// The AdPlacement component auto-refreshes based on settings
// To customize globally:

1. Go to Settings → Ads
2. Edit `ads.global.refresh_interval`
3. Set value in seconds (e.g., 30 for 30 seconds)
4. Set to 0 to disable auto-refresh
```

### Conditional Ad Display

```jsx
import AdPlacement from '@/components/ads/AdPlacement';

function ProductPage({ isPremiumUser }) {
  return (
    <div>
      <ProductContent />

      {/* Only show ads to non-premium users */}
      {!isPremiumUser && (
        <AdPlacement placement="product_page_side" />
      )}
    </div>
  );
}
```

### Fallback Content

```jsx
<AdPlacement
  placement="right_sidebar"
  fallback={
    <div className="bg-gray-100 p-4 rounded">
      <h3>Special Offer</h3>
      <p>Check out our latest deals!</p>
    </div>
  }
/>
```

---

## 🔐 Security Notes

- ✅ Ad settings are cached for 5 minutes
- ✅ Only admins can modify settings
- ✅ Ad placements are publicly accessible
- ✅ Click/impression tracking is rate-limited
- ✅ HTML ads are sanitized (use with caution)

---

## 📈 Analytics

The system automatically tracks:

- **Impressions:** How many times ad was shown
- **Clicks:** How many times ad was clicked
- **CTR (Click-Through Rate):** Clicks ÷ Impressions
- **Budget Consumption:** Auto-deducted based on CPM/CPC
- **Campaign Status:** Auto-completes when budget exhausted

View analytics at: **Sponsored Ads → Campaign Report**

---

## 🛠️ Troubleshooting

### Ads Not Showing?

**Check:**
1. Is `ads.global.enabled` set to `true`?
2. Is the specific placement enabled? (e.g., `ads.placement.top_banner.enabled`)
3. Is there an active campaign for that placement?
4. Has the campaign budget been exhausted?
5. Is the campaign within its start/end date range?

### How to Disable All Ads Site-Wide?

1. Go to **Settings → Ads**
2. Find `ads.global.enabled`
3. Click **Edit**
4. Set to **Disabled**
5. Click **Save**
6. All ads will be hidden across the entire site

### How to Disable Specific Placement?

1. Go to **Settings → Ads**
2. Find `ads.placement.{placement}.enabled`
3. Example: `ads.placement.cart_page.enabled`
4. Set to **Disabled**
5. Ads will stop showing on that placement only

---

## 🎨 Styling Tips

### Custom Ad Container

```jsx
<AdPlacement
  placement="left_sidebar"
  className="
    sticky
    top-20
    max-w-xs
    mx-auto
    p-4
    rounded-lg
    shadow-lg
    hover:shadow-xl
    transition-shadow
  "
/>
```

### Responsive Ads

```jsx
<AdPlacement
  placement="top_banner"
  className="
    hidden
    md:block
    w-full
    max-w-screen-xl
    mx-auto
  "
/>
```

---

## ✨ Summary

You now have:

✅ **16 Ad Settings** initialized in database
✅ **9 Ad Placements** ready to use
✅ **AdPlacement Component** for easy integration
✅ **Admin Controls** in Settings → Ads tab
✅ **Public API Endpoints** for fetching ads
✅ **Click/Impression Tracking** built-in
✅ **Budget Management** with auto-deactivation
✅ **Global Master Toggle** to disable all ads
✅ **Auto-Refresh** functionality

---

## 📞 Next Steps

1. **Add AdPlacement components** to your pages (see examples above)
2. **Create test campaigns** to see ads in action
3. **Customize settings** from Settings → Ads
4. **Monitor analytics** to optimize ad performance

---

**File Locations:**

- **Component:** `apps/web/src/assets/components/ads/AdPlacement.jsx`
- **Controller:** `apps/api/src/controllers/adPlacementController.js`
- **Init Script:** `apps/api/src/scripts/initAdSettings.js`
- **Settings Page:** `apps/web/src/assets/pages/dashboard/admin/Settings.jsx`
