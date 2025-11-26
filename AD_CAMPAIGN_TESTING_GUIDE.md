# Ad Campaign Testing & Verification Guide

## ✅ System Status

**Web Server:** Running on http://localhost:5174
**API Server:** Running on http://localhost:8080
**Database:** MongoDB connected

---

## What's Working

### Backend (API)
✅ **AdCampaign Model** - Has all required fields:
- `placement` (enum with 7 options)
- `position` (enum with 9 options)
- `bannerSize` (enum with 8 options)
- `dimensions` (width/height for custom)

✅ **Ad Controller** - Properly handles all fields:
- `createCampaign` - Uses `...req.body` (accepts all fields)
- `updateCampaign` - Uses `...req.body` (accepts all fields)
- Admin can create campaigns for any vendor
- Vendors can create campaigns for themselves

✅ **Routes** - All endpoints configured:
- POST `/ads/campaigns` - Create campaign
- PUT `/ads/campaigns/:id` - Update campaign
- GET `/ads/campaigns` - List campaigns
- DELETE `/ads/campaigns/:id` - Delete campaign

### Frontend (UI)
✅ **AdsManagement.jsx** - All fields visible:
- Placement dropdown (7 options)
- Position dropdown (9 options)
- Banner Size dropdown (8 options)
- Custom dimensions (when size = custom)
- Fields show for ALL campaign types now

---

## Testing Checklist

### Test 1: Access the Ads Page

1. Open browser: http://localhost:5174/admin/dashboard
2. Login as admin
3. Navigate to: **Sponsored Ads** (in sidebar or via URL: http://localhost:5174/admin/ads)
4. You should see the ads management page

**Expected Result:** ✅ Page loads successfully with "Create Campaign" button

---

### Test 2: Create Sponsored Product Campaign

1. Click **"Create Campaign"** button
2. Fill in the form:
   ```
   Campaign Name: Test Sponsored Product
   Vendor: Select any active vendor
   Type: Sponsored Product
   Pricing: CPC
   Bid: 2.50
   Daily Budget: 100
   Total Budget: 1000
   Start Date: [Today's date]
   End Date: [Future date]
   Status: Active

   ✅ Placement: Search Results - Sponsored Products
   ✅ Banner Position: Top - Full Width
   ✅ Banner Size/Type: Medium Rectangle (300x250px)

   Target Keywords: laptop, computer, electronics
   ```

3. Click **"Create"** button

**Expected Result:**
✅ Campaign created successfully
✅ Toast notification shows success
✅ Campaign appears in the table
✅ All fields saved including placement, position, size

---

### Test 3: Verify in Database

Open MongoDB Compass or use mongo shell:

```javascript
db.adcampaigns.findOne({ name: "Test Sponsored Product" })
```

**Expected Result:**
```json
{
  "_id": "...",
  "name": "Test Sponsored Product",
  "type": "SponsoredProduct",
  "vendorId": "...",
  "pricing": "CPC",
  "bid": 2.5,
  "dailyBudget": 100,
  "totalBudget": 1000,
  "status": "active",

  // ✅ These should be present:
  "placement": "search_sponsored_products",
  "position": "top",
  "bannerSize": "rectangle",

  "targeting": {
    "keywords": [
      { "keyword": "laptop", "matchType": "broad" },
      { "keyword": "computer", "matchType": "broad" },
      { "keyword": "electronics", "matchType": "broad" }
    ]
  },
  "stats": {
    "impressions": 0,
    "clicks": 0,
    "conversions": 0,
    "spend": 0
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### Test 4: Create Banner Campaign with Custom Size

1. Click **"Create Campaign"** again
2. Fill in the form:
   ```
   Campaign Name: Test Banner Campaign
   Vendor: Select any active vendor
   Type: Banner
   Pricing: CPM
   Bid: 5.00
   Daily Budget: 200
   Start Date: [Today's date]
   Status: Active

   ✅ Placement: Homepage - Banner (Hero Section)
   ✅ Banner Position: Top - Full Width
   ✅ Banner Size/Type: Custom Size (Specify Dimensions)

   [Custom dimensions should appear]
   ✅ Width (px): 1920
   ✅ Height (px): 400

   Target Keywords: sale, discount, promo
   ```

3. Optionally upload a banner image
4. Click **"Create"**

**Expected Result:**
✅ Campaign created with custom dimensions
✅ Database shows: `dimensions: { width: 1920, height: 400 }`

---

### Test 5: Edit Existing Campaign

1. Find a campaign in the table
2. Click the **Edit** icon (pencil)
3. Modal opens with all current values pre-filled
4. Change **Placement** to: "Product Page - Sidebar"
5. Change **Position** to: "Right - Sidebar"
6. Change **Banner Size** to: "Large Sidebar Banner (300x600px)"
7. Click **"Update"**

**Expected Result:**
✅ Campaign updated successfully
✅ New values reflected in table
✅ Database updated with new placement/position/size

---

### Test 6: View Campaign Details

1. Click the **View** icon (eye) on any campaign
2. View modal opens

**Expected Result:**
✅ Modal shows all campaign details
✅ Placement, position, and size visible (if added to view modal)

---

### Test 7: Check All Dropdowns Work

**Placement Dropdown:**
```
✅ Homepage - Banner (Hero Section)
✅ Homepage - Left Sidebar
✅ Homepage - Right Sidebar
✅ Blog - Sidebar
✅ Category Page - Top Banner
✅ Product Page - Sidebar
✅ Search Results - Sponsored Products
```

**Position Dropdown:**
```
✅ Top - Full Width
✅ Right - Sidebar
✅ Bottom - Full Width
✅ Left - Sidebar
✅ Center - Overlay
✅ Top Right - Corner
✅ Top Left - Corner
✅ Bottom Right - Corner
✅ Bottom Left - Corner
```

**Banner Size Dropdown:**
```
✅ Hero Banner - Full Width Header (1920x600px)
✅ Leaderboard - Top Banner (728x90px)
✅ Large Sidebar Banner (300x600px)
✅ Small Sidebar Banner (300x250px)
✅ Medium Rectangle (300x250px)
✅ Skyscraper - Tall Sidebar (160x600px)
✅ Square Banner (250x250px)
✅ Custom Size (Specify Dimensions)
```

---

## Common Issues & Solutions

### Issue 1: Fields Not Visible

**Problem:** Placement/Position/Size fields don't appear

**Solution:**
- Clear browser cache (Ctrl+F5)
- Check browser console for errors
- Verify web server is running on port 5174
- Check file: `AdsManagement.jsx` lines 548-621

### Issue 2: Campaign Not Saving Fields

**Problem:** Campaign creates but placement/position/size are null

**Solution:**
1. Check network tab in browser dev tools
2. Look at the request payload - should include:
   ```json
   {
     "name": "...",
     "placement": "homepage_banner",
     "position": "top",
     "bannerSize": "hero"
   }
   ```
3. If fields are missing from payload, check formData state
4. If fields are in payload but not saved, check backend model

### Issue 3: Dropdown Shows No Options

**Problem:** Dropdown is empty or shows only one option

**Solution:**
- Check AdsManagement.jsx lines 559-565, 583-591, 609-616
- Verify `<option>` tags are properly formatted
- Check browser console for JSX errors

### Issue 4: Custom Dimensions Don't Appear

**Problem:** When selecting "Custom Size", width/height fields don't show

**Solution:**
- Check conditional rendering at line 624: `{formData.bannerSize === 'custom' &&`
- Verify formData.bannerSize is exactly 'custom' (lowercase)
- Check browser console for errors

---

## Manual Database Check

If campaigns are created but fields are missing, check directly in MongoDB:

```javascript
// Get all campaigns
db.adcampaigns.find().pretty()

// Check specific campaign
db.adcampaigns.findOne({ _id: ObjectId("CAMPAIGN_ID") })

// Check if fields exist
db.adcampaigns.find({
  placement: { $exists: true },
  position: { $exists: true },
  bannerSize: { $exists: true }
}).count()

// Update a campaign manually (for testing)
db.adcampaigns.updateOne(
  { _id: ObjectId("CAMPAIGN_ID") },
  {
    $set: {
      placement: "homepage_banner",
      position: "top",
      bannerSize: "hero"
    }
  }
)
```

---

## API Testing with cURL

Test the API directly:

```bash
# Create campaign with all fields
curl -X POST http://localhost:8080/ads/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "API Test Campaign",
    "vendorId": "VENDOR_ID",
    "type": "Banner",
    "pricing": "CPC",
    "bid": 3.00,
    "dailyBudget": 150,
    "startAt": "2025-01-01T00:00:00Z",
    "status": "active",
    "placement": "homepage_banner",
    "position": "top",
    "bannerSize": "hero",
    "targeting": {
      "keywords": [
        { "keyword": "test", "matchType": "broad" }
      ]
    }
  }'

# Check response should include placement, position, bannerSize
```

---

## Verification Checklist

After running all tests, verify:

- [ ] ✅ Placement field visible for all campaign types
- [ ] ✅ Position field visible for all campaign types
- [ ] ✅ Banner Size field visible for all campaign types
- [ ] ✅ Custom dimensions appear when size = "Custom Size"
- [ ] ✅ All dropdown options selectable
- [ ] ✅ Create campaign saves all fields to database
- [ ] ✅ Edit campaign updates all fields in database
- [ ] ✅ View campaign shows placement/position/size
- [ ] ✅ Table displays placement and position columns
- [ ] ✅ No console errors in browser
- [ ] ✅ No server errors in API logs

---

## What Should Be Working Now

### ✅ Frontend Changes Applied
- Removed conditional rendering `{formData.type === 'Banner' &&`
- Fields now always visible regardless of campaign type
- Custom dimensions show when bannerSize = 'custom'

### ✅ Backend Already Working
- AdCampaign model has all fields defined
- Controller accepts all fields via `...req.body`
- Routes properly configured
- Validation working (enum values enforced)

### ✅ Database
- Schema supports all field types
- Indexes created for performance
- Default values set for placement, position, bannerSize

---

## Next Steps

1. **Test the form** - Create a campaign and verify all fields save
2. **Check the database** - Confirm placement, position, size are stored
3. **Test edit functionality** - Update a campaign and verify changes
4. **Review console** - No errors should appear

If you encounter any issues, check the specific test that's failing and refer to the "Common Issues & Solutions" section above.

---

**Status:** ✅ All fields implemented and ready for testing
**Date:** November 21, 2025
**Web Server:** http://localhost:5174
**API Server:** http://localhost:8080
