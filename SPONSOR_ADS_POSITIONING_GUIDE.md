# Sponsor Ads Positioning System - Complete Guide

## Overview

The sponsor ads system uses a **placement-to-position mapping** to control where ads appear on different pages.

## How It Works

### 1. Frontend Requests Ads
The frontend requests ads using **placement names**:
```javascript
// Example from Home.jsx
useSponsorAds('homepage_banner')        // Requests banner ad
useSponsorAds('homepage_sidebar_left')  // Requests left sidebar ad
useSponsorAds('homepage_sidebar_right') // Requests right sidebar ad
```

### 2. Backend Filters by Placement
The backend controller ([adPlacementController.js:20-30](E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api\src\controllers\adPlacementController.js#L20-L30)) directly filters ads by the `placement` field:

```javascript
const query = {
  status: 'active',
  placement: placement, // Direct placement matching
  startAt: { $lte: now },
  $or: [
    { endAt: { $gte: now } },
    { endAt: null }
  ]
};
```

### 3. Database Query
The backend queries the AdCampaign collection for ads matching:
- **Status**: `active`
- **Placement**: Direct match (e.g., 'homepage_banner', 'blog_sidebar')
- **Date Range**: `startAt <= now <= endAt`
- **Sort**: By bid (highest first), then createdAt

### 4. Ads are Returned
The matching ads are returned to the frontend and displayed using the `<SponsorAd>` component.

## Placement System Overview

| Placement Name | Position | Typical Location | Ad Size |
|----------------|----------|------------------|---------|
| `homepage_banner` | `top` | Homepage hero section | hero (full-width) |
| `homepage_sidebar_left` | `left` | Homepage left sidebar | side-large (vertical) |
| `homepage_sidebar_right` | `right` | Homepage right sidebar | side-large (vertical) |
| `blog_sidebar` | `right` | Blog post sidebar | side-small (vertical) |
| `category_top_banner` | `top` | Category page top | hero (full-width) |
| `product_sidebar` | `right` | Product page sidebar | side-small (vertical) |
| `search_sponsored_products` | `center` | Search results grid | rectangle (card) |

**Note**: The `placement` field is now stored directly in the AdCampaign model. When creating an ad, vendors select both:
- **Placement**: Which page/location (homepage_banner, blog_sidebar, etc.)
- **Position**: Visual position within that placement (top, left, right, etc.)

## Database Schema

### AdCampaign Model Fields Related to Positioning

```javascript
{
  position: {
    type: String,
    enum: ['top', 'right', 'bottom', 'left', 'center',
           'top-right', 'top-left', 'bottom-right', 'bottom-left'],
    default: 'top'
  },

  bannerSize: {
    type: String,
    enum: ['hero', 'side-small', 'side-large', 'rectangle',
           'leaderboard', 'skyscraper', 'square', 'custom'],
    default: 'hero'
  },

  dimensions: {
    width: Number,
    height: Number
  }
}
```

## Position Values Explained

### Primary Positions
- **`top`**: Top of page (banners, hero ads)
- **`right`**: Right sidebar
- **`left`**: Left sidebar
- **`bottom`**: Bottom of page
- **`center`**: In-content, grid layouts

### Corner Positions
- **`top-right`**: Top-right corner
- **`top-left`**: Top-left corner
- **`bottom-right`**: Bottom-right corner
- **`bottom-left`**: Bottom-left corner

## Banner Sizes

### Standard Sizes
- **`hero`**: 1200x400px - Full-width banner
- **`leaderboard`**: 728x90px - Top banner
- **`rectangle`**: 300x250px - Medium rectangle
- **`skyscraper`**: 160x600px - Tall vertical
- **`square`**: 250x250px - Square ad

### Sidebar Sizes
- **`side-small`**: 300x250px - Small sidebar
- **`side-large`**: 300x600px - Large sidebar

### Custom Size
- **`custom`**: Uses `dimensions.width` and `dimensions.height`

## Who Controls Ad Positioning?

### 1. **Vendors** (When Creating Campaigns)
Location: `/vendor-dashboard/ads`

Vendors set:
- **Position**: Where the ad should appear (top, left, right, etc.)
- **Banner Size**: Size of the ad (hero, side-large, etc.)
- **Targeting**: Keywords, categories, products
- **Budget & Bid**: How much to spend and bid per click/impression

### 2. **Admins** (Global Settings)
Location: `/admin-dashboard/ads`

Admins control:
- **Global Ad Enable/Disable**: Turn all ads on/off
- **Placement Settings**: Enable/disable specific placements
  - `ads.placement.homepage_banner.enabled`
  - `ads.placement.homepage_sidebar_left.enabled`
  - `ads.placement.homepage_sidebar_right.enabled`
- **Campaign Approval**: Approve or reject vendor campaigns
- **Minimum Budget Requirements**: Set minimum ad spend

### 3. **Developers** (Schema Configuration)
Location: [AdCampaign.js:56-69](E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api\src\models\AdCampaign.js#L56-L69)

Developers configure:
- **Placement Enum**: Define available placement options in the schema
- **New Placements**: Add new ad placement locations to the enum
- **Position Enums**: Define available position values in the schema

## How to Add a New Ad Placement

### Step 1: Add to Placement Enum (Backend)
Edit [AdCampaign.js:56-69](E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api\src\models\AdCampaign.js#L56-L69):

```javascript
placement: {
  type: String,
  enum: [
    'homepage_banner',
    'homepage_sidebar_left',
    'homepage_sidebar_right',
    'blog_sidebar',  // NEW PLACEMENT
    'category_top_banner',
    'product_sidebar',
    'search_sponsored_products'
  ],
  default: 'homepage_banner',
}
```

### Step 2: Use in Frontend Component
```javascript
import SponsorAd from '@/components/ads/SponsorAd';
import useSponsorAds from '@/hooks/useSponsorAds';

function BlogPost() {
  const { ad } = useSponsorAds('blog_sidebar');  // NEW PLACEMENT

  return (
    <div className="grid grid-cols-4">
      <main className="col-span-3">
        {/* Blog content */}
      </main>

      <aside className="col-span-1">
        {ad && <SponsorAd ad={ad} variant="sidebar" />}
      </aside>
    </div>
  );
}
```

### Step 3: Create Demo Ads for New Placement
```javascript
await AdCampaign.create({
  vendorId: vendor._id,
  name: 'Blog Sidebar Ad',
  type: 'Banner',
  placement: 'blog_sidebar',  // NEW: Identifies page/location
  position: 'right',           // Visual position within placement
  bannerSize: 'side-small',
  bannerImage: 'https://example.com/ad.jpg',
  pricing: 'CPC',
  bid: 3,
  dailyBudget: 500,
  status: 'active',
  startAt: new Date(),
  endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
});
```

## Current Implementation Status

### ✅ Fixed Issues
1. **Placement Field Added**: AdCampaign model now includes `placement` field for clear page/location identification
2. **Direct Placement Filtering**: The `getSponsoredAds()` controller filters ads by `placement` field directly
3. **Homepage Integration**: Home page uses the new `useSponsorAds` hook with proper placement names
4. **Dashboard Identification**: Ads can now be identified by their placement field (homepage_banner, blog_sidebar, etc.)

### ✅ Active Placements
1. **Homepage Banner** (`homepage_banner` - placement: homepage_banner, position: top)
2. **Homepage Left Sidebar** (`homepage_sidebar_left` - placement: homepage_sidebar_left, position: left)
3. **Homepage Right Sidebar** (`homepage_sidebar_right` - placement: homepage_sidebar_right, position: right)

### 📋 Demo Ads Created
- **Summer Sale Banner** (placement: homepage_banner, position: top, bid: $10, CPM)
- **Gaming Gear** (placement: homepage_sidebar_left, position: left, bid: $5, CPC)
- **Electronics Sale** (placement: homepage_sidebar_right, position: right, bid: $4, CPC)

## API Endpoints

### Get Sponsored Ads
```
GET /api/ads/sponsored?placement=homepage_banner&limit=3
```

**Query Parameters:**
- `placement` (required): Placement name (e.g., 'homepage_banner')
- `limit` (optional): Number of ads to return (default: 3)

**Response:**
```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "_id": "...",
        "name": "Summer Sale Banner",
        "type": "Banner",
        "bannerImage": "https://...",
        "targetUrl": "#",
        "position": "top",
        "bannerSize": "hero",
        "bid": 10,
        "pricing": "CPM"
      }
    ]
  }
}
```

### Track Impression
```
POST /api/ads/:id/impression
Body: { "placement": "homepage_banner" }
```

### Track Click
```
POST /api/ads/:id/click
Body: { "placement": "homepage_banner" }
```

## Best Practices

### For Vendors
1. ✅ Choose appropriate **position** for your ad type
2. ✅ Set competitive **bid** amounts to win auctions
3. ✅ Use high-quality **banner images** (proper dimensions)
4. ✅ Target relevant **keywords** and **categories**
5. ✅ Monitor **daily budget** to avoid overspending

### For Developers
1. ✅ Always add new placements to the mapping table
2. ✅ Use descriptive placement names (e.g., `product_sidebar_top`)
3. ✅ Document new placements in this guide
4. ✅ Test ads on multiple screen sizes
5. ✅ Implement proper error handling for missing ads

### For Admins
1. ✅ Review and approve new ad campaigns
2. ✅ Monitor ad performance metrics
3. ✅ Disable problematic placements if needed
4. ✅ Set reasonable minimum budgets
5. ✅ Handle fraud detection and quality control

## Troubleshooting

### Ads Not Showing
1. ✅ Check if ads are globally enabled: `ads.global.enabled`
2. ✅ Check if placement is enabled: `ads.placement.{name}.enabled`
3. ✅ Verify ads exist with matching **placement** in database
4. ✅ Check ad **status** is 'active'
5. ✅ Verify **startAt/endAt** dates are current
6. ✅ Check **budget** is not exhausted

### Wrong Ads Showing in Wrong Places
1. ✅ Verify ad **placement** field matches the requested placement
2. ✅ Check ad **position** field is correct for visual display
3. ✅ Ensure frontend uses correct **placement name** in `useSponsorAds()` call

### Ads Not Tracking Impressions/Clicks
1. ✅ Verify `trackImpression: true` in `useSponsorAds` hook
2. ✅ Check network requests to `/ads/:id/impression`
3. ✅ Verify ad has valid `_id` field
4. ✅ Check backend tracking endpoints are working

## Summary

The sponsor ads positioning system is now fully functional with:
- ✅ **Placement Field**: AdCampaign model includes `placement` field for clear page/location identification
- ✅ **Direct Placement Filtering**: Ads are filtered by `placement` field directly (no mapping needed)
- ✅ **Reusable Components**: `SponsorAd` and `useSponsorAds` for easy integration
- ✅ **Automatic Tracking**: Impressions and clicks tracked automatically
- ✅ **Demo Ads**: 3 active demo ads for homepage testing with proper placement values
- ✅ **Dashboard Identification**: Vendors can now identify which page each ad is for by the placement field

**Key Improvement**: The addition of the `placement` field solves the user's question: "how can identify which is home page sponsor ads which blog side sponsor ads?" - Each ad now clearly shows its placement (homepage_banner, homepage_sidebar_left, blog_sidebar, etc.) in the database and will be visible in the dashboard.

Visit **http://localhost:5173** to see the sponsor ads in action!
