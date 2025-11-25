# Ad Campaign Troubleshooting Guide

## Issue: Campaigns Created But Not Displaying

### Root Cause Identified

The ad system has **two components** that work together:

1. **AdCampaign** - The campaign metadata (budget, dates, targeting, status)
2. **AdCreative** - The actual ad content that gets displayed (placement, images, text)

**The Problem:** When you created campaigns through the admin interface, only the AdCampaign was created, but no AdCreative was generated. The `/ads/auction` endpoint looks for AdCreatives with specific placements, not campaigns directly.

### What Was Fixed

#### 1. Updated AdCreative Model
Added missing placement options to support all ad locations:
- `homepage_banner` ✓
- `homepage_sidebar_left` ✓
- `homepage_sidebar_right` ✓
- `left_sidebar` ✓
- `right_sidebar` ✓
- `top_banner` ✓
- `bottom_banner` ✓
- `category_header` ✓
- `product_page_side` ✓
- `product_list` ✓
- `cart_page` ✓

**File:** `apps/api/src/models/AdCreative.js`

#### 2. Modified Campaign Creation
Updated the admin campaign creation to **automatically create an AdCreative** when a Banner campaign is created.

**File:** `apps/api/src/controllers/adminController.js`

**What it does:**
- When you create a Banner campaign with an image
- It automatically creates an AdCreative with placement `homepage_banner`
- This makes the ad immediately visible (if campaign is active)

#### 3. Backfilled Existing Campaigns
Ran a script to create AdCreatives for your existing Banner campaign:
- ✅ **vsvrhgew** - AdCreative created successfully

**Script:** `apps/api/src/scripts/backfillAdCreatives.js`

---

## Campaign Types Explained

### 1. Banner Campaign
**Purpose:** Display image/banner ads in specific placements

**How it works:**
- Upload banner image during campaign creation
- AdCreative is **automatically created** with `homepage_banner` placement
- Ad displays immediately if campaign is active and has budget

**Your Campaign:**
- **vsvrhgew** (Type: Banner) ✅ Now has AdCreative - should be visible!

### 2. SponsoredProduct Campaign
**Purpose:** Promote specific products in search results and listings

**How it works:**
- Select products to promote during campaign creation
- Must manually create AdCreatives for each product
- AdCreatives specify where product ads appear (search_grid, category_grid, etc.)

**Your Campaigns:**
- **eefefe** (Type: SponsoredProduct) - Needs AdCreatives to be created
- **Headphones Promotion** (Type: SponsoredProduct) - Needs AdCreatives to be created

---

## Why Your "vsvrhgew" Campaign Should Now Work

After the fixes, your Banner campaign "vsvrhgew" should now be visible on the homepage **IF**:

✅ Campaign status = "active" (check in Sponsored Ads list)
✅ Campaign has budget > 0 (dailyBudget and totalBudget must be set)
✅ Campaign dates include today (startAt ≤ today, endAt ≥ today or null)
✅ Ad placement settings enabled (Settings → Ads → homepage_banner.enabled = true)
✅ Global ads enabled (Settings → Ads → ads.global.enabled = true)
✅ AdCreative was created (done by backfill script)

### Budget Issue

From your screenshot, the BUDGET column showed "$" (empty), which suggests:
- `dailyBudget` might be 0 or not set
- `totalBudget` might be 0 or not set

**To fix:**
1. Go to Sponsored Ads
2. Click Edit on "vsvrhgew"
3. Set `dailyBudget` to a value > 0 (e.g., 100)
4. Set `totalBudget` to a value > 0 (e.g., 1000) or leave empty for unlimited
5. Save

---

## How to Create Ads That Display (Going Forward)

### For Banner Ads (Homepage)

1. **Go to:** Admin Dashboard → Sponsored Ads
2. **Click:** Create Campaign
3. **Fill in:**
   - **Name:** Your campaign name
   - **Type:** Banner
   - **Pricing:** CPC or CPM
   - **Bid:** Amount per click/impression (e.g., 5)
   - **Daily Budget:** Daily spend limit (e.g., 100) ⚠️ IMPORTANT
   - **Total Budget:** Total campaign budget (e.g., 1000)
   - **Start Date:** Today or earlier
   - **End Date:** Future date or leave empty
   - **Status:** Active (or Draft, then activate later)
   - **Banner Image:** Upload your image
   - **Vendor:** Select vendor (if admin creating for vendor)
4. **Click:** Save

**Result:** AdCreative is automatically created with placement `homepage_banner`. Ad will appear on homepage center area.

### For Product Ads (Search/Category)

1. **Create Campaign** (Type: SponsoredProduct)
2. **Go to:** Campaign Details → Creatives tab
3. **Click:** Add Creative
4. **Select:**
   - **Product:** Choose product to promote
   - **Placement:** Where ad should appear (e.g., `search_grid`, `category_grid`)
   - **Headline:** Ad headline
   - **Description:** Ad description
5. **Save**

**Result:** Product ad will appear in selected placement when users search or browse categories.

---

## Testing Your Ads

### 1. Check Campaign in Database

Run this in MongoDB shell to verify your campaign:

```javascript
db.adcampaigns.findOne({ name: 'vsvrhgew' })
```

**Check:**
- `status`: Should be "active"
- `dailyBudget`: Should be > 0
- `totalBudget`: Should be > 0 or undefined
- `startAt`: Should be ≤ now
- `endAt`: Should be ≥ now or null
- `bannerImage`: Should have image URL

### 2. Check AdCreative Created

```javascript
db.adcreatives.find({ campaignId: ObjectId('your_campaign_id') })
```

**Check:**
- `placement`: Should be "homepage_banner"
- `status`: Should be "active"
- `bannerAsset.imageUrl`: Should have image URL

### 3. Test Ad Auction Endpoint

```bash
curl -X POST http://localhost:8080/api/ads/auction \
  -H "Content-Type: application/json" \
  -d '{"placement": "homepage_banner", "limit": 1}'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "campaignId": "...",
        "creativeId": "...",
        "headline": "vsvrhgew",
        "placement": "homepage_banner",
        "bannerImage": "http://localhost:8080/uploads/ads/...",
        "url": "/"
      }
    ]
  }
}
```

If you get `"ads": []`, check campaign status, budget, and dates.

### 4. Check Homepage

1. **Enable ads in settings:**
   - Go to Settings → Ads
   - Ensure `ads.global.enabled` = true
   - Ensure `ads.placement.homepage_banner.enabled` = true

2. **Visit homepage**
3. **Hard refresh:** Ctrl+Shift+R (clears React Query cache)
4. **Check for banner ad** in center area

---

## Common Issues & Solutions

### Issue: "No budget" in campaign list

**Cause:** dailyBudget = 0 or not set

**Fix:**
1. Edit campaign
2. Set dailyBudget > 0
3. Save

### Issue: Ad not showing after creating campaign

**Possible causes:**
1. Campaign status is "draft" → Change to "active"
2. Budget is 0 → Set dailyBudget and totalBudget
3. Dates don't include today → Adjust startAt/endAt
4. Ad placements disabled → Check Settings → Ads
5. Need hard refresh → Press Ctrl+Shift+R

### Issue: SponsoredProduct campaigns don't show

**Cause:** SponsoredProduct campaigns need separate AdCreatives

**Fix:**
1. Go to campaign details
2. Navigate to Creatives tab
3. Create creatives for each product
4. Select appropriate placement

---

## Files Modified

1. **AdCreative.js** - Added placement options
2. **adminController.js** - Auto-create AdCreative for Banner campaigns
3. **backfillAdCreatives.js** - Script to fix existing campaigns (already run)

---

## Next Steps

1. ✅ Check if "vsvrhgew" campaign is now visible on homepage
2. ⚠️ If not showing, edit campaign and verify:
   - Status = "active"
   - dailyBudget > 0
   - totalBudget > 0
   - startAt is today or earlier
3. ✅ For "eefefe" and "Headphones Promotion":
   - These are SponsoredProduct campaigns
   - Need to create AdCreatives manually through Creatives interface
   - Or change type to Banner if you want homepage banner ads

---

## Summary

**What was wrong:**
- Campaigns existed but had no AdCreatives
- Auction endpoint looks for AdCreatives, not campaigns directly

**What was fixed:**
- AdCreative model updated with all placements
- Campaign creation now auto-creates AdCreative for Banner type
- Backfill script created AdCreative for existing "vsvrhgew" campaign

**What you need to do:**
- Edit "vsvrhgew" campaign and ensure dailyBudget > 0
- Hard refresh homepage (Ctrl+Shift+R)
- For SponsoredProduct campaigns, create AdCreatives manually

Your ads should now work! 🎉
