# Sponsor Ads System - Complete Guide

## Overview

The V-Tech ecommerce platform has a comprehensive sponsor ads system that allows vendors to create and manage advertising campaigns. The system supports multiple ad types, placements, and pricing models (CPC and CPM).

## System Architecture

### Backend Components

#### 1. **Ad Campaign Model**
Location: [apps/api/src/models/AdCampaign.js](Ecommerce/shop/apps/api/src/models/AdCampaign.js)

**Key Fields**:
- `vendorId`: Reference to the vendor who created the campaign
- `name`: Campaign name
- `type`: Ad type (`SponsoredProduct`, `SponsoredBrand`, `Banner`)
- `targeting`: Keyword, category, product, and geo targeting
- `bannerImage`: Image URL for banner ads
- `position`: Banner position (top, right, bottom, left, center, etc.)
- `bannerSize`: Banner size (hero, side-small, side-large, rectangle, etc.)
- `pricing`: Pricing model (`CPC` or `CPM`)
- `bid`: Bid amount per click/impression
- `dailyBudget`: Daily spending limit
- `totalBudget`: Total campaign budget
- `startAt` / `endAt`: Campaign schedule
- `status`: Campaign status (draft, active, paused, completed, budget_exhausted)
- `stats`: Performance metrics (impressions, clicks, conversions, spend, revenue)

#### 2. **Ad Placement Controller**
Location: [apps/api/src/controllers/adPlacementController.js](Ecommerce/shop/apps/api/src/controllers/adPlacementController.js)

**Functions**:
- **`getSponsoredAds()`**: Fetch active ads for a placement
  - Filters by: active status, date range, budget
  - Sorts by: bid (descending), creation date
  - Supports limit parameter for multiple ads

- **`getAdForPlacement()`**: Get single ad for specific placement
  - Checks global and placement-specific ad settings
  - Populates product data if applicable
  - Returns formatted ad data

- **`trackImpression()`**: Track ad impression
  - Increments impression count
  - Deducts from budget (if CPM-based)
  - Auto-deactivates campaign when budget exhausted

- **`trackClick()`**: Track ad click
  - Increments click count
  - Deducts from budget (if CPC-based)
  - Auto-deactivates campaign when budget exhausted

#### 3. **API Routes**
Location: [apps/api/src/routes/ads.js](Ecommerce/shop/apps/api/src/routes/ads.js)

```
Public Routes:
- GET /ads/placement/:placement - Get ad for specific placement
- GET /ads/sponsored?placement=X&limit=N - Get sponsored ads
- POST /ads/:id/impression - Track impression
- POST /ads/:id/click - Track click

Vendor/Admin Routes (authenticated):
- GET /ads/campaigns - List campaigns
- POST /ads/campaigns - Create campaign
- GET /ads/campaigns/:id - Get campaign details
- PUT /ads/campaigns/:id - Update campaign
- DELETE /ads/campaigns/:id - Delete campaign
- GET /ads/campaigns/:id/report - Get campaign report
- GET /ads/wallet - Get ad wallet balance
- POST /ads/wallet/recharge - Recharge wallet
```

### Frontend Components

#### 1. **SponsorAd Component** (NEW)
Location: [apps/web/src/assets/components/ads/SponsorAd.jsx](Ecommerce/shop/apps/web/src/assets/components/ads/SponsorAd.jsx)

A reusable component for displaying sponsor ads with three variants:

##### **Banner Variant** (Large horizontal ad)
```jsx
<SponsorAd ad={adData} variant="banner" onAdClick={handleClick} />
```
- Full-width banner with image or gradient background
- Displays ad name/headline and description
- Automatically tracks clicks
- Best for: Homepage hero section, category page top

##### **Sidebar Variant** (Vertical ad)
```jsx
<SponsorAd ad={adData} variant="sidebar" onAdClick={handleClick} />
```
- Sticky sidebar ad with blue gradient background
- Image thumbnail + text content
- "Learn More" call-to-action button
- Best for: Homepage sidebar, product page sidebar

##### **Card Variant** (Compact card)
```jsx
<SponsorAd ad={adData} variant="card" onAdClick={handleClick} />
```
- Compact card with image and text
- Suitable for grid layouts
- Best for: Product listings, search results

#### 2. **useSponsorAds Hook** (NEW)
Location: [apps/web/src/assets/hooks/useSponsorAds.js](Ecommerce/shop/apps/web/src/assets/hooks/useSponsorAds.js)

Custom hook for fetching and managing sponsor ads:

```jsx
const { ads, ad, loading, error, refetch } = useSponsorAds('homepage_banner', {
  limit: 3,
  refreshInterval: 120000, // Refresh every 2 minutes
  trackImpression: true    // Auto-track impressions
});
```

**Parameters:**
- `placement` (string): Ad placement identifier
- `options` (object):
  - `limit` (number): Number of ads to fetch (default: 1)
  - `refreshInterval` (number): Auto-refresh interval in ms (default: null)
  - `trackImpression` (boolean): Auto-track impressions (default: true)

**Returns:**
- `ads` (array): Array of ad objects
- `ad` (object): First ad (convenience property)
- `loading` (boolean): Loading state
- `error` (object): Error object if fetch fails
- `refetch` (function): Manual refetch function

#### 3. **SponsoredLabel Component**
Location: [apps/web/src/assets/components/ads/SponsoredLabel.jsx](Ecommerce/shop/apps/web/src/assets/components/ads/SponsoredLabel.jsx)

Small "Sponsored" badge for labeling ads:

```jsx
<SponsoredLabel placement="banner" />  // For banner ads
<SponsoredLabel placement="inline" />  // For inline ads
```

## Current Implementation

### Home Page
Location: [apps/web/src/assets/pages/Home.jsx](Ecommerce/shop/apps/web/src/assets/pages/Home.jsx)

The home page already has sponsor ads implemented with three placements:

1. **Homepage Banner** (lines 390-422)
   - Large banner ad above featured products
   - Fetched via `/ads/auction` endpoint
   - Displays banner image or gradient with headline/description
   - Tracks impressions and clicks

2. **Left Sidebar Ad** (lines 349-370)
   - Sticky sidebar ad on the left
   - Only shows when ad data is available
   - Blue gradient background with "Sponsored" label

3. **Right Sidebar Ad** (similar to left)
   - Sticky sidebar ad on the right
   - Responsive grid layout adjusts based on active sidebars

## Usage Examples

### Example 1: Simple Banner Ad on Category Page

```jsx
import SponsorAd from '@/components/ads/SponsorAd';
import useSponsorAds from '@/hooks/useSponsorAds';

function CategoryPage() {
  const { ad, loading } = useSponsorAds('category_top_banner');

  return (
    <div className="container">
      {!loading && ad && (
        <div className="mb-8">
          <SponsorAd ad={ad} variant="banner" />
        </div>
      )}

      {/* Category content */}
    </div>
  );
}
```

### Example 2: Multiple Sidebar Ads

```jsx
import SponsorAd from '@/components/ads/SponsorAd';
import useSponsorAds from '@/hooks/useSponsorAds';

function ProductPage() {
  const { ads, loading } = useSponsorAds('product_sidebar', {
    limit: 3,
    refreshInterval: 180000 // Refresh every 3 minutes
  });

  return (
    <div className="grid grid-cols-4 gap-6">
      <main className="col-span-3">
        {/* Product details */}
      </main>

      <aside>
        {!loading && ads.map((ad, index) => (
          <div key={ad._id || index} className="mb-6">
            <SponsorAd ad={ad} variant="sidebar" />
          </div>
        ))}
      </aside>
    </div>
  );
}
```

### Example 3: Card Grid of Sponsored Products

```jsx
import SponsorAd from '@/components/ads/SponsorAd';
import useSponsorAds from '@/hooks/useSponsorAds';

function SearchResults() {
  const { ads } = useSponsorAds('search_sponsored_products', {
    limit: 4
  });

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Sponsored products */}
      {ads.map(ad => (
        <SponsorAd key={ad._id} ad={ad} variant="card" />
      ))}

      {/* Regular products */}
      {products.map(product => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
```

## Available Ad Placements

- `homepage_banner` - Hero banner on homepage
- `homepage_sidebar_left` - Left sidebar on homepage
- `homepage_sidebar_right` - Right sidebar on homepage
- `category_top_banner` - Top banner on category pages
- `product_sidebar` - Sidebar on product detail pages
- `search_sponsored_products` - Sponsored products in search results

## Ad Campaign Management (Vendor Dashboard)

Vendors can manage campaigns through `/vendor-dashboard/ads`:

1. **Create Campaign**: Choose ad type, set targeting, upload banner, set pricing and budget
2. **Monitor Performance**: View impressions, clicks, conversions, spend, revenue
3. **Manage Budget**: Recharge ad wallet, view transaction history

## Admin Configuration

Admins can configure ad settings at `/admin-dashboard/ads`:

1. **Global Settings**: Enable/disable ads globally (`ads.global.enabled`)
2. **Placement Settings**: Enable/disable specific placements
3. **Campaign Review**: Approve/reject vendor campaigns

## Performance Tracking

- **Impressions**: Automatically tracked when ad is displayed (CPM deduction)
- **Clicks**: Tracked when user clicks on ad (CPC deduction)
- **Conversions**: Track purchases after ad click (ROI calculation)

## Best Practices

1. Always use the `SponsorAd` component for consistent rendering
2. Use `useSponsorAds` hook for data fetching
3. Enable auto-refresh (2-3 minutes) for dynamic ad rotation
4. Track impressions automatically by default
5. Provide `onAdClick` callback for custom analytics
6. Handle loading states gracefully
7. Test with no ads available (empty state)
8. All variants are mobile-friendly
9. Lazy load images for better performance
10. Cache bust with `_ts` parameter for fresh ads

## Summary

The sponsor ads system is **fully functional and already implemented on the homepage**. The new reusable components (`SponsorAd` and `useSponsorAds`) make it easy to add sponsor ads to any page with minimal code. The system supports multiple ad types, pricing models, and advanced targeting, providing vendors with a powerful advertising platform.
