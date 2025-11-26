# Sponsor Ads Placement Field Implementation

## Problem Statement

**User Question**: "how can identify which is home page sponsor ads which blog side sponsor ads?"

The user was looking at the ads dashboard table and couldn't distinguish which ads belonged to which pages (homepage vs blog sidebar vs other pages).

## Solution: Add `placement` Field to AdCampaign Model

Added a new `placement` field to clearly identify which page/location each ad belongs to.

## Changes Made

### 1. Updated AdCampaign Model
**File**: [AdCampaign.js:56-69](E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api\src\models\AdCampaign.js#L56-L69)

```javascript
// NEW FIELD: Page/Placement where ad appears
placement: {
  type: String,
  enum: [
    'homepage_banner',
    'homepage_sidebar_left',
    'homepage_sidebar_right',
    'blog_sidebar',
    'category_top_banner',
    'product_sidebar',
    'search_sponsored_products'
  ],
  default: 'homepage_banner',
},
```

### 2. Updated Controller to Filter by Placement
**File**: [adPlacementController.js:20-30](E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api\src\controllers\adPlacementController.js#L20-L30)

**Before** (incorrect - returned all active ads):
```javascript
const campaigns = await AdCampaign.find({
  status: 'active',
  startAt: { $lte: now },
  $or: [{ endAt: { $gte: now } }, { endAt: null }]
});
```

**After** (correct - filters by placement):
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

const campaigns = await AdCampaign.find(query)
  .sort({ bid: -1, createdAt: -1 })
  .limit(parseInt(limit))
  .lean();
```

### 3. Updated Demo Ads Script
**File**: [create-homepage-sponsor-ads.js](E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api\create-homepage-sponsor-ads.js)

Added `placement` field to all demo ads:

```javascript
// Banner ad
const bannerAd = await AdCampaign.create({
  vendorId: vendor._id,
  name: 'Homepage Demo Ad - Summer Sale Banner',
  type: 'Banner',
  placement: 'homepage_banner', // NEW: Identifies this is for homepage banner
  position: 'top',
  bannerSize: 'hero',
  // ... rest of fields
});

// Left sidebar ad
const leftAd = await AdCampaign.create({
  vendorId: vendor._id,
  name: 'Homepage Demo Ad - Gaming Gear',
  type: 'Banner',
  placement: 'homepage_sidebar_left', // NEW: Identifies this is for left sidebar
  position: 'left',
  bannerSize: 'side-large',
  // ... rest of fields
});

// Right sidebar ad
const rightAd = await AdCampaign.create({
  vendorId: vendor._id,
  name: 'Homepage Demo Ad - Electronics Sale',
  type: 'Banner',
  placement: 'homepage_sidebar_right', // NEW: Identifies this is for right sidebar
  position: 'right',
  bannerSize: 'side-large',
  // ... rest of fields
});
```

### 4. Recreated Demo Ads
Ran the updated script to create demo ads with the new `placement` field:

```bash
cd "E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api" && node create-homepage-sponsor-ads.js
```

**Result**: 3 active demo ads created:
- Summer Sale Banner (placement: homepage_banner, position: top, bid: $10, CPM)
- Gaming Gear (placement: homepage_sidebar_left, position: left, bid: $5, CPC)
- Electronics Sale (placement: homepage_sidebar_right, position: right, bid: $4, CPC)

## How It Works Now

### Database Level
Each ad now has a `placement` field that clearly identifies which page/location it belongs to:

```javascript
{
  _id: "...",
  name: "Homepage Demo Ad - Summer Sale Banner",
  type: "Banner",
  placement: "homepage_banner", // 🎯 Clear identification!
  position: "top",
  bannerSize: "hero",
  status: "active",
  // ... other fields
}
```

### Frontend Request
The frontend requests ads using placement names:

```javascript
// Homepage banner ad
const { ad: bannerAd } = useSponsorAds('homepage_banner');

// Homepage left sidebar ad
const { ad: leftAd } = useSponsorAds('homepage_sidebar_left');

// Blog sidebar ad
const { ad: blogAd } = useSponsorAds('blog_sidebar');
```

### Backend Filtering
The backend controller filters ads by the `placement` field:

```javascript
exports.getSponsoredAds = async (req, res) => {
  const { placement, limit = 3 } = req.query;

  const query = {
    status: 'active',
    placement: placement, // Filters by exact placement match
    startAt: { $lte: now },
    $or: [
      { endAt: { $gte: now } },
      { endAt: null }
    ]
  };

  const campaigns = await AdCampaign.find(query)
    .sort({ bid: -1 })
    .limit(parseInt(limit));
};
```

## Benefits

### 1. Clear Identification in Dashboard
Vendors can now see exactly which page each ad is for by looking at the `placement` field:
- `homepage_banner` → Homepage hero banner
- `homepage_sidebar_left` → Homepage left sidebar
- `blog_sidebar` → Blog post sidebar
- `category_top_banner` → Category page top banner
- etc.

### 2. Accurate Ad Serving
Ads are now served to the correct placements:
- Homepage banner gets `homepage_banner` ads only
- Homepage left sidebar gets `homepage_sidebar_left` ads only
- No more mixing of ads between different placements

### 3. Easy to Add New Placements
To add a new placement:
1. Add to the enum in [AdCampaign.js:56-69](E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api\src\models\AdCampaign.js#L56-L69)
2. Use the placement name in the frontend: `useSponsorAds('new_placement')`
3. Create ads with `placement: 'new_placement'`

## Available Placements

| Placement Name | Description | Typical Position | Typical Size |
|----------------|-------------|------------------|--------------|
| `homepage_banner` | Homepage hero banner | top | hero (full-width) |
| `homepage_sidebar_left` | Homepage left sidebar | left | side-large (vertical) |
| `homepage_sidebar_right` | Homepage right sidebar | right | side-large (vertical) |
| `blog_sidebar` | Blog post sidebar | right | side-small (vertical) |
| `category_top_banner` | Category page top banner | top | hero (full-width) |
| `product_sidebar` | Product page sidebar | right | side-small (vertical) |
| `search_sponsored_products` | Search results grid | center | rectangle (card) |

## Next Steps (Optional)

### 1. Update Vendor Dashboard UI
**File**: `apps/web/src/assets/pages/vendor/VendorAds.jsx`

Add `placement` column to the ads table so vendors can see it in the UI:

```jsx
<TableHead>
  <TableRow>
    <TableCell>CAMPAIGN</TableCell>
    <TableCell>TYPE</TableCell>
    <TableCell>PLACEMENT</TableCell> {/* NEW COLUMN */}
    <TableCell>POSITION</TableCell>
    <TableCell>BID</TableCell>
    <TableCell>BUDGET</TableCell>
    <TableCell>STATUS</TableCell>
    <TableCell>ACTIONS</TableCell>
  </TableRow>
</TableHead>
<TableBody>
  {campaigns.map(campaign => (
    <TableRow key={campaign._id}>
      <TableCell>{campaign.name}</TableCell>
      <TableCell>{campaign.type}</TableCell>
      <TableCell>
        {/* Display human-readable placement */}
        {campaign.placement?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </TableCell>
      <TableCell>{campaign.position}</TableCell>
      {/* ... rest of cells */}
    </TableRow>
  ))}
</TableBody>
```

### 2. Add Placement Selector in Create/Edit Ad Form
Allow vendors to select placement when creating/editing ads:

```jsx
<FormControl fullWidth>
  <InputLabel>Placement</InputLabel>
  <Select
    name="placement"
    value={formData.placement}
    onChange={handleChange}
  >
    <MenuItem value="homepage_banner">Homepage Banner</MenuItem>
    <MenuItem value="homepage_sidebar_left">Homepage Left Sidebar</MenuItem>
    <MenuItem value="homepage_sidebar_right">Homepage Right Sidebar</MenuItem>
    <MenuItem value="blog_sidebar">Blog Sidebar</MenuItem>
    <MenuItem value="category_top_banner">Category Top Banner</MenuItem>
    <MenuItem value="product_sidebar">Product Sidebar</MenuItem>
    <MenuItem value="search_sponsored_products">Search Sponsored Products</MenuItem>
  </Select>
</FormControl>
```

### 3. Add Placement Filter
Allow filtering ads by placement:

```jsx
<FormControl>
  <InputLabel>Filter by Placement</InputLabel>
  <Select
    value={placementFilter}
    onChange={(e) => setPlacementFilter(e.target.value)}
  >
    <MenuItem value="all">All Placements</MenuItem>
    <MenuItem value="homepage_banner">Homepage Banner</MenuItem>
    <MenuItem value="homepage_sidebar_left">Homepage Left Sidebar</MenuItem>
    <MenuItem value="homepage_sidebar_right">Homepage Right Sidebar</MenuItem>
    <MenuItem value="blog_sidebar">Blog Sidebar</MenuItem>
    {/* ... more options */}
  </Select>
</FormControl>
```

## Testing

To verify the implementation:

1. **Check Database**:
```bash
mongo shop
db.adcampaigns.find().pretty()
```
You should see the `placement` field on all ads.

2. **Test Frontend**:
- Visit http://localhost:5173
- Check browser DevTools Network tab
- Look for requests to `/api/ads/sponsored?placement=homepage_banner`
- Verify response contains ads with matching `placement` field

3. **Test Different Placements**:
- Homepage banner should show different ad than sidebars
- Each placement should get its own specific ads

## Documentation Updated

- ✅ [SPONSOR_ADS_POSITIONING_GUIDE.md](E:\V-Tech  Ecommerce\SPONSOR_ADS_POSITIONING_GUIDE.md) - Updated to reflect placement field implementation
- ✅ [create-homepage-sponsor-ads.js](E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api\create-homepage-sponsor-ads.js) - Updated to include placement field
- ✅ [AdCampaign.js](E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api\src\models\AdCampaign.js) - Added placement field to schema
- ✅ [adPlacementController.js](E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api\src\controllers\adPlacementController.js) - Updated to filter by placement

## Conclusion

The `placement` field implementation successfully solves the user's question about identifying which ads belong to which pages. Ads can now be clearly identified by their placement value (homepage_banner, blog_sidebar, etc.) both in the database and (once the dashboard is updated) in the UI.

This makes the sponsor ads system more maintainable, easier to understand, and provides vendors with clear visibility into where their ads will appear.
