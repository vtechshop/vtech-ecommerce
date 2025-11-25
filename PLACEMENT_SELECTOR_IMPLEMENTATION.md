# Ad Placement Selector - Implementation Guide

## Overview

This guide shows how to add a placement selector to the admin panel, allowing admins to choose where ads appear.

---

## Step 1: Update Form State

Add `placements` field to formData:

```jsx
// AdsManagement.jsx - Line 14
const [formData, setFormData] = useState({
  name: '',
  type: 'SponsoredProduct',
  pricing: 'CPC',
  bid: '',
  dailyBudget: '',
  totalBudget: '',
  startAt: '',
  endAt: '',
  status: 'draft',
  targetKeywords: '',
  targetProducts: '',
  vendorId: '',
  bannerImage: '',
  placements: ['homepage_banner'], // ✅ ADD THIS
});
```

---

## Step 2: Add Placement Selector UI

Add this after the Banner Image section (after line 545):

```jsx
{/* Ad Placements Selector */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Ad Placements * <span className="text-xs text-gray-500">(Select where this ad should appear)</span>
  </label>

  <div className="space-y-2 border border-gray-300 rounded-lg p-4 bg-gray-50">
    {/* Homepage Banner */}
    <label className="flex items-start cursor-pointer hover:bg-gray-100 p-2 rounded">
      <input
        type="checkbox"
        value="homepage_banner"
        checked={formData.placements?.includes('homepage_banner')}
        onChange={(e) => {
          const value = e.target.value;
          const newPlacements = e.target.checked
            ? [...(formData.placements || []), value]
            : (formData.placements || []).filter(p => p !== value);
          setFormData({ ...formData, placements: newPlacements });
        }}
        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
      />
      <div className="ml-3 flex-1">
        <span className="font-medium text-gray-900">Homepage Banner (Center)</span>
        <p className="text-xs text-gray-500">Full-width banner displayed prominently on homepage</p>
      </div>
    </label>

    {/* Homepage Left Sidebar */}
    <label className="flex items-start cursor-pointer hover:bg-gray-100 p-2 rounded">
      <input
        type="checkbox"
        value="homepage_sidebar_left"
        checked={formData.placements?.includes('homepage_sidebar_left')}
        onChange={(e) => {
          const value = e.target.value;
          const newPlacements = e.target.checked
            ? [...(formData.placements || []), value]
            : (formData.placements || []).filter(p => p !== value);
          setFormData({ ...formData, placements: newPlacements });
        }}
        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
      />
      <div className="ml-3 flex-1">
        <span className="font-medium text-gray-900">Homepage Sidebar (Left)</span>
        <p className="text-xs text-gray-500">Vertical ad on the left side of homepage</p>
      </div>
    </label>

    {/* Homepage Right Sidebar */}
    <label className="flex items-start cursor-pointer hover:bg-gray-100 p-2 rounded">
      <input
        type="checkbox"
        value="homepage_sidebar_right"
        checked={formData.placements?.includes('homepage_sidebar_right')}
        onChange={(e) => {
          const value = e.target.value;
          const newPlacements = e.target.checked
            ? [...(formData.placements || []), value]
            : (formData.placements || []).filter(p => p !== value);
          setFormData({ ...formData, placements: newPlacements });
        }}
        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
      />
      <div className="ml-3 flex-1">
        <span className="font-medium text-gray-900">Homepage Sidebar (Right)</span>
        <p className="text-xs text-gray-500">Vertical ad on the right side of homepage</p>
      </div>
    </label>

    {/* Search Results Grid */}
    <label className="flex items-start cursor-pointer hover:bg-gray-100 p-2 rounded">
      <input
        type="checkbox"
        value="search_grid"
        checked={formData.placements?.includes('search_grid')}
        onChange={(e) => {
          const value = e.target.value;
          const newPlacements = e.target.checked
            ? [...(formData.placements || []), value]
            : (formData.placements || []).filter(p => p !== value);
          setFormData({ ...formData, placements: newPlacements });
        }}
        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
      />
      <div className="ml-3 flex-1">
        <span className="font-medium text-gray-900">Search Results Grid</span>
        <p className="text-xs text-gray-500">Mixed with product cards in search results</p>
      </div>
    </label>

    {/* Category Grid */}
    <label className="flex items-start cursor-pointer hover:bg-gray-100 p-2 rounded">
      <input
        type="checkbox"
        value="category_grid"
        checked={formData.placements?.includes('category_grid')}
        onChange={(e) => {
          const value = e.target.value;
          const newPlacements = e.target.checked
            ? [...(formData.placements || []), value]
            : (formData.placements || []).filter(p => p !== value);
          setFormData({ ...formData, placements: newPlacements });
        }}
        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
      />
      <div className="ml-3 flex-1">
        <span className="font-medium text-gray-900">Category Pages Grid</span>
        <p className="text-xs text-gray-500">Mixed with products on category browsing pages</p>
      </div>
    </label>
  </div>

  {formData.placements?.length === 0 && (
    <p className="text-xs text-red-500 mt-1">
      ⚠️ Please select at least one placement
    </p>
  )}
</div>
```

---

## Step 3: Update Form Submission

Update the `handleSubmit` function to include placements:

```jsx
// AdsManagement.jsx - Line 180
const handleSubmit = (e) => {
  e.preventDefault();

  // Validate placements
  if (!formData.placements || formData.placements.length === 0) {
    toast.error('Please select at least one ad placement');
    return;
  }

  const keywords = formData.targetKeywords.split(',').map(k => k.trim()).filter(Boolean);

  const dataToSend = {
    name: formData.name,
    type: formData.type,
    pricing: formData.pricing,
    bid: parseFloat(formData.bid),
    dailyBudget: parseFloat(formData.dailyBudget),
    totalBudget: formData.totalBudget ? parseFloat(formData.totalBudget) : undefined,
    startAt: formData.startAt,
    endAt: formData.endAt || undefined,
    status: formData.status,
    vendorId: formData.vendorId,
    bannerImage: formData.bannerImage || undefined,
    placements: formData.placements, // ✅ ADD THIS
    targeting: {
      keywords: keywords.map(k => ({ keyword: k, matchType: 'broad' })),
    },
  };
  saveMutation.mutate(dataToSend);
};
```

---

## Step 4: Update handleEdit

Make sure placements are loaded when editing:

```jsx
// AdsManagement.jsx - Line 126
const handleEdit = (ad) => {
  setSelectedAd(ad);
  setFormData({
    name: ad.name || '',
    type: ad.type || 'SponsoredProduct',
    pricing: ad.pricing || 'CPC',
    bid: ad.bid || '',
    dailyBudget: ad.dailyBudget || '',
    totalBudget: ad.totalBudget || '',
    startAt: ad.startAt ? new Date(ad.startAt).toISOString().slice(0, 16) : '',
    endAt: ad.endAt ? new Date(ad.endAt).toISOString().slice(0, 16) : '',
    status: ad.status || 'draft',
    targetKeywords: ad.targeting?.keywords?.map(k => k.keyword).join(', ') || '',
    targetProducts: ad.targeting?.products?.join(', ') || '',
    vendorId: ad.vendorId?._id || ad.vendorId || '',
    bannerImage: ad.bannerImage || '',
    placements: ad.placements || ['homepage_banner'], // ✅ ADD THIS
  });
  setModalOpen(true);
};
```

---

## Step 5: Update Backend Controller

Update `adminController.js` to use placements from request:

```javascript
// adminController.js - createAdCampaign (Line 503)
if (campaign.bannerImage && (campaign.type === 'Banner' || campaign.type === 'SponsoredProduct')) {
  // ✅ Use placements from request, default to homepage_banner
  const placements = req.body.placements && req.body.placements.length > 0
    ? req.body.placements
    : ['homepage_banner', 'search_grid'];

  for (const placement of placements) {
    const creative = await AdCreative.create({
      campaignId: campaign._id,
      placement: placement,
      headline: campaign.name,
      description: 'Sponsored Advertisement',
      status: 'active',
      bannerAsset: {
        imageUrl: campaign.bannerImage,
        imageAlt: campaign.name,
        clickUrl: '/',
        dimensions: {
          width: 1200,
          height: 400,
        },
      },
    });
    logger.info(`AdCreative auto-created for ${campaign.type} campaign with placement ${placement}: ${creative._id}`);
  }
}
```

Also update `updateAdCampaign`:

```javascript
// adminController.js - updateAdCampaign (Line 539)
if (campaign.bannerImage && (campaign.type === 'Banner' || campaign.type === 'SponsoredProduct')) {
  // ✅ Use placements from request
  const requestedPlacements = req.body.placements && req.body.placements.length > 0
    ? req.body.placements
    : ['homepage_banner', 'search_grid'];

  const existingCreatives = await AdCreative.find({ campaignId: campaign._id });

  // Update existing creatives that match requested placements
  for (const creative of existingCreatives) {
    if (requestedPlacements.includes(creative.placement)) {
      creative.headline = campaign.name;
      creative.bannerAsset = {
        imageUrl: campaign.bannerImage,
        imageAlt: campaign.name,
        clickUrl: creative.bannerAsset?.clickUrl || '/',
        dimensions: { width: 1200, height: 400 },
      };
      await creative.save();
    } else {
      // Remove creative if placement no longer selected
      await AdCreative.deleteOne({ _id: creative._id });
      logger.info(`Removed AdCreative for unselected placement: ${creative.placement}`);
    }
  }

  // Create creatives for new placements
  const existingPlacements = existingCreatives.map(c => c.placement);
  const newPlacements = requestedPlacements.filter(p => !existingPlacements.includes(p));

  for (const placement of newPlacements) {
    const creative = await AdCreative.create({
      campaignId: campaign._id,
      placement: placement,
      headline: campaign.name,
      description: 'Sponsored Advertisement',
      status: 'active',
      bannerAsset: {
        imageUrl: campaign.bannerImage,
        imageAlt: campaign.name,
        clickUrl: '/',
        dimensions: { width: 1200, height: 400 },
      },
    });
    logger.info(`Created AdCreative for new placement ${placement}: ${creative._id}`);
  }
}
```

---

## Step 6: Store Placements in Campaign Model

Update `AdCampaign` model to store placements:

```javascript
// models/AdCampaign.js - Add after bannerImage field
placements: {
  type: [String],
  enum: [
    'homepage_banner',
    'homepage_sidebar_left',
    'homepage_sidebar_right',
    'search_grid',
    'search_top',
    'category_grid',
    'category_top',
    'product_page_side',
  ],
  default: ['homepage_banner'],
},
```

---

## Visual Reference

### Before (No Control)
```
Admin creates campaign → Ads appear everywhere
❌ No choice where ads display
❌ Confusing for admins
```

### After (Full Control)
```
Admin creates campaign →
  ☑ Homepage Banner
  ☐ Left Sidebar
  ☑ Search Results
→ Ads appear ONLY in selected places
✅ Clear control
✅ Better UX
```

---

## Testing Steps

1. **Create New Campaign**
   - Go to Admin → Sponsored Ads → Create Campaign
   - Fill in basic info
   - Upload banner image
   - **Select placements:**
     - ☑ Homepage Banner
     - ☑ Search Results
     - ☐ Left Sidebar
     - ☐ Right Sidebar
   - Click Create

2. **Verify Creation**
   - Check database:
   ```javascript
   db.adcampaigns.findOne({ name: "Test Campaign" })
   // Should have: placements: ["homepage_banner", "search_grid"]

   db.adcreatives.find({ campaignId: ObjectId("...") })
   // Should have 2 creatives, one for each placement
   ```

3. **Test Display**
   - Visit homepage → Should see banner
   - Search for keyword → Should see ad in results
   - Check left sidebar → Should NOT see ad
   - Check right sidebar → Should NOT see ad

4. **Edit Campaign**
   - Click Edit on campaign
   - **Change selections:**
     - ☐ Homepage Banner (uncheck)
     - ☑ Left Sidebar (check)
   - Click Update

5. **Verify Update**
   - Visit homepage → Should NOT see banner
   - Check left sidebar → Should see ad
   - Database should have updated creatives

---

## Common Issues & Solutions

### Issue: "Placements not saving"
**Solution:** Check that backend is receiving placements array:
```javascript
console.log('Received placements:', req.body.placements);
```

### Issue: "All checkboxes selected by default"
**Solution:** Initialize with empty array or specific placements:
```jsx
placements: ['homepage_banner'], // Default to just homepage
```

### Issue: "Old ads still appearing everywhere"
**Solution:** Update existing campaigns manually:
```javascript
// Run this script once
db.adcampaigns.updateMany(
  { placements: { $exists: false } },
  { $set: { placements: ['homepage_banner', 'search_grid'] } }
);
```

---

## Summary

This implementation gives admins full control over ad placement with:
- ✅ Visual checkboxes for each placement
- ✅ Clear descriptions of what each placement means
- ✅ Validation (must select at least one)
- ✅ Backend creates AdCreatives only for selected placements
- ✅ Edit functionality to change placements
- ✅ Database stores placement preferences

**Estimated implementation time: 2-3 hours**
