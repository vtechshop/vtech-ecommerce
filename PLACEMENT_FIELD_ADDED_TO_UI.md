# Placement Field Added to Admin Dashboard

## Problem Solved

**User Question**: "where is placement?"

The user was editing an ad campaign and couldn't see the placement field to identify which page the ad belongs to (homepage vs blog sidebar vs other pages).

## Solution Implemented

Added the **Placement** field to the Admin Ads Management form with full integration.

## Changes Made

### File: `apps/web/src/assets/pages/dashboard/admin/AdsManagement.jsx`

#### 1. Added `placement` to Form State (Lines 15-33)

```javascript
const [formData, setFormData] = useState({
  // ... other fields
  placement: 'homepage_banner',  // NEW FIELD
  position: 'top',
  bannerSize: 'hero',
  // ... other fields
});
```

#### 2. Added `placement` to Form Reset (Lines 107-128)

```javascript
const resetForm = () => {
  setFormData({
    // ... other fields
    placement: 'homepage_banner',  // NEW FIELD
    // ... other fields
  });
};
```

#### 3. Added `placement` to Edit Handler (Lines 135-157)

```javascript
const handleEdit = (ad) => {
  setFormData({
    // ... other fields
    placement: ad.placement || 'homepage_banner',  // NEW FIELD
    // ... other fields
  });
};
```

#### 4. Added `placement` to Submit Data (Lines 197-220)

```javascript
const dataToSend = {
  // ... other fields
  placement: formData.placement,  // NEW FIELD
  position: formData.position,
  // ... other fields
};
```

#### 5. Added Placement Column to Table Header (Lines 276-301)

```javascript
<thead>
  <tr>
    <th>Campaign</th>
    <th>Type</th>
    <th>Placement</th>  {/* NEW COLUMN */}
    <th>Position</th>
    <th>Bid</th>
    <th>Budget</th>
    <th>Status</th>
    <th>Actions</th>
  </tr>
</thead>
```

#### 6. Added Placement Column Data (Lines 312-320)

```javascript
<td className="px-6 py-4 whitespace-nowrap">
  <div className="text-sm text-gray-600">
    {ad.placement ? (
      <div className="text-xs">
        {ad.placement.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </div>
    ) : '-'}
  </div>
</td>
```

This converts `homepage_banner` → "Homepage Banner" for display.

#### 7. Added Placement Selector to Form (Lines 536-560)

```javascript
{/* Placement - Only show for Banner type */}
{formData.type === 'Banner' && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Placement (Page/Location) *
    </label>
    <select
      value={formData.placement}
      onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      required
    >
      <option value="homepage_banner">Homepage - Banner (Hero Section)</option>
      <option value="homepage_sidebar_left">Homepage - Left Sidebar</option>
      <option value="homepage_sidebar_right">Homepage - Right Sidebar</option>
      <option value="blog_sidebar">Blog - Sidebar</option>
      <option value="category_top_banner">Category Page - Top Banner</option>
      <option value="product_sidebar">Product Page - Sidebar</option>
      <option value="search_sponsored_products">Search Results - Sponsored Products</option>
    </select>
    <p className="text-xs text-gray-500 mt-1">
      🎯 Select which page and section your ad will appear on
    </p>
  </div>
)}
```

## How It Works Now

### 1. When Creating a New Ad Campaign

Admins will see:
1. **Campaign Name** field
2. **Vendor** dropdown
3. **Type** dropdown (SponsoredProduct, SponsoredBrand, Banner)
4. **Pricing** dropdown (CPC, CPM)
5. Bid, Daily Budget, Total Budget fields
6. Start Date and End Date
7. **Status** dropdown
8. **Placement (Page/Location)** dropdown ← NEW! (only shows for Banner type)
9. **Banner Position** dropdown (only shows for Banner type)
10. **Banner Size/Type** dropdown (only shows for Banner type)
11. Banner Image upload

### 2. When Editing an Existing Ad

- The **Placement** field will be pre-filled with the current placement value
- For example: "Homepage Demo Ad - Electronics Sale" will show "Homepage - Right Sidebar"

### 3. In the Ads Table

The table now shows:
- **CAMPAIGN**: Ad name
- **TYPE**: SponsoredProduct, SponsoredBrand, or Banner
- **PLACEMENT**: Human-readable placement (e.g., "Homepage Right Sidebar") ← NEW!
- **POSITION**: Position and size (e.g., "right / side-large")
- **BID**: Bid amount
- **BUDGET**: Budget amount
- **STATUS**: Active/Paused/Draft dropdown
- **ACTIONS**: View, Edit, Delete buttons

## Available Placements

| Value | Display Name | Description |
|-------|-------------|-------------|
| `homepage_banner` | Homepage - Banner (Hero Section) | Full-width banner at top of homepage |
| `homepage_sidebar_left` | Homepage - Left Sidebar | Left sidebar on homepage |
| `homepage_sidebar_right` | Homepage - Right Sidebar | Right sidebar on homepage |
| `blog_sidebar` | Blog - Sidebar | Sidebar on blog posts |
| `category_top_banner` | Category Page - Top Banner | Top banner on category pages |
| `product_sidebar` | Product Page - Sidebar | Sidebar on product pages |
| `search_sponsored_products` | Search Results - Sponsored Products | In search results grid |

## What This Solves

### Before (Problem)
- No way to identify which page/location an ad belongs to
- Had to guess based on position and size
- Confusing when multiple ads have same position

### After (Solution)
- Clear **Placement** field shows exactly which page each ad is for
- Table displays placement in human-readable format
- Easy to filter and identify homepage ads vs blog ads vs product page ads

## Example Usage

### Creating a Blog Sidebar Ad

1. Click "Create Campaign"
2. Fill in campaign details
3. Select **Type**: "Banner"
4. Select **Placement**: "Blog - Sidebar"
5. Select **Position**: "Right - Sidebar"
6. Select **Banner Size**: "Small Sidebar Banner (300x250px)"
7. Upload banner image
8. Submit

The ad will now appear in the blog sidebar, and the table will show:
- **PLACEMENT**: "Blog Sidebar"
- **POSITION**: "right / side-small"

### Updating Existing Demo Ads

The 3 existing demo ads should be updated with their placement values:
- "Homepage Demo Ad - Summer Sale Banner" → `placement: 'homepage_banner'`
- "Homepage Demo Ad - Gaming Gear" → `placement: 'homepage_sidebar_left'`
- "Homepage Demo Ad - Electronics Sale" → `placement: 'homepage_sidebar_right'`

These have already been updated in the database via the `create-homepage-sponsor-ads.js` script.

## Testing

1. **View Ads Table**:
   - Visit `/admin-dashboard/ads`
   - You should see a new "PLACEMENT" column
   - Existing ads with placement field will show their placement

2. **Edit Existing Ad**:
   - Click "Edit" on any banner ad
   - You should see the "Placement (Page/Location)" dropdown
   - It should show the current placement value

3. **Create New Ad**:
   - Click "Create Campaign"
   - Select Type: "Banner"
   - The Placement field should appear
   - Select a placement and save
   - The ad should show the placement in the table

## Next Steps (Optional)

### Add Placement Filter
Allow filtering ads by placement:

```javascript
const [placementFilter, setPlacementFilter] = useState('');

// In the filters section:
<CustomSelect
  value={placementFilter}
  onChange={(value) => setPlacementFilter(value)}
  options={[
    { value: '', label: 'All Placements' },
    { value: 'homepage_banner', label: 'Homepage Banner' },
    { value: 'homepage_sidebar_left', label: 'Homepage Left Sidebar' },
    { value: 'homepage_sidebar_right', label: 'Homepage Right Sidebar' },
    { value: 'blog_sidebar', label: 'Blog Sidebar' },
    // ... more options
  ]}
  placeholder="All Placements"
/>
```

### Add Placement-Based Stats
Show performance metrics grouped by placement to see which placements perform best.

## Summary

The placement field is now fully integrated into the admin dashboard:
- ✅ Shows in create/edit form
- ✅ Displays in table listing
- ✅ Saves to database
- ✅ Human-readable display
- ✅ Only shows for Banner type ads
- ✅ Required field for banners

Admins can now easily identify and manage ads by their placement!
