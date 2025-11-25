# How Campaign Images Work in Sponsored Ads

## Overview

When you upload a banner image in a sponsored ad campaign, here's what happens and where it will be displayed.

---

## Step-by-Step Process

### 1. **Upload Image in Campaign Creation**

When you create a campaign in **Sponsored Ads** and upload a banner image:

```
Campaign Form
├── Campaign Name: "fewgew"
├── Vendor: "Demo Store"
├── Type: "Banner"
├── Pricing: "CPM (Cost Per Mille)"
├── Bid: $5
├── Daily Budget: $2
├── Total Budget: $7
├── Start Date: 30-10-2025
├── End Date: 31-10-2025
├── Status: "Active"
├── Banner Image: [Upload button] ← YOU UPLOAD IMAGE HERE
└── Target Keywords: "laptop, phone, headphones"
```

**What happens:**
1. You click **"Click to upload banner image"**
2. Select a PNG/JPG file (up to 10MB)
3. Image uploads to: `e:\Project-4\Ecommerce_patched_v2\shop\apps\api\uploads\ads\{unique-id}.jpg`
4. Upload returns a URL like: `http://localhost:8080/uploads/ads/abc123-xyz789.jpg`
5. This URL is stored in your campaign as `bannerImage`

---

### 2. **Where the Image Will Show**

The uploaded banner image will be displayed based on your **campaign settings**:

#### Option A: Homepage Banner (Center)
```javascript
// If campaign targets placement: "homepage_banner"
Settings → Ads → ads.placement.homepage_banner.enabled = ✅ Enabled

Result: Your image shows in the CENTER BANNER on homepage
```

**Visual:**
```
┌──────────────────────────────────────────────┐
│  [Your uploaded banner image displays here]  │
│           (Full width, center)                │
└──────────────────────────────────────────────┘
```

#### Option B: Sidebar Ads (Left/Right)
```javascript
// If campaign targets placement: "homepage_sidebar_left"
Settings → Ads → ads.placement.homepage_sidebar_left.enabled = ✅ Enabled

Result: Your image shows in LEFT SIDEBAR
```

**Visual:**
```
┌────────────┐  ┌──────────┐  ┌────────────┐
│ Left       │  │  Main    │  │  Right     │
│ Sidebar    │  │ Content  │  │  Sidebar   │
│            │  │          │  │            │
│ [Image]    │  │          │  │  [Image]   │
│  here      │  │          │  │   here     │
└────────────┘  └──────────┘  └────────────┘
```

---

## Campaign Types and Image Usage

### Type 1: **Banner Ad** (Uses uploaded image)

```
Campaign Settings:
- Type: "Banner"
- Banner Image: ✅ Uploaded
- Target Placement: "homepage_banner"

Display:
┌─────────────────────────────────┐
│  Sponsored                       │
│  ┌──────────────────────────┐   │
│  │ Your Uploaded Image      │   │
│  │ (Clickable to target URL)│   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

### Type 2: **Sponsored Product** (No uploaded image needed)

```
Campaign Settings:
- Type: "SponsoredProduct"
- Target Product: Product ID
- NO banner image upload

Display:
┌─────────────────────────────────┐
│  Sponsored                       │
│  ┌──────────────────────────┐   │
│  │ [Product Image from DB]  │   │
│  │ Product Name             │   │
│  │ ₹Price                   │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

---

## Why Your Image Might Not Show

### Issue 1: Placement Not Enabled in Settings
```
Problem: Uploaded image but homepage is blank

Solution:
1. Go to: Admin → Settings → Ads
2. Find: ads.placement.homepage_banner.enabled
3. Set to: ✅ Enabled
4. Save
5. Refresh homepage (Ctrl+Shift+R)
```

### Issue 2: Campaign Not Active
```
Problem: Image uploaded but campaign status = "Draft"

Solution:
1. Go to: Sponsored Ads
2. Find your campaign
3. Change Status to: "Active"
4. Save
```

### Issue 3: Campaign Date Range
```
Problem: Today's date is outside campaign date range

Solution:
1. Check Start Date: Should be <= today
2. Check End Date: Should be >= today
3. Update if needed
```

### Issue 4: Budget Exhausted
```
Problem: Total budget spent completely

Solution:
1. Check campaign stats
2. If "Spend" >= "Total Budget", add more budget
3. Or create new campaign
```

### Issue 5: Wrong Placement Targeted
```
Problem: Campaign targets "category_header" but you're checking homepage

Solution:
1. Either visit category page to see ad
2. Or update campaign to target "homepage_banner"
```

---

## Complete Example

### Step 1: Create Campaign with Image

```
Go to: Vendor Dashboard → Sponsored Ads → Create Campaign

Fill form:
- Campaign Name: "Summer Sale Banner"
- Vendor: Your store
- Type: "Banner"
- Pricing: "CPM"
- Bid: $10
- Daily Budget: $50
- Total Budget: $500
- Start Date: Today
- End Date: 7 days from now
- Status: "Active" ← IMPORTANT!
- Banner Image: Upload your 1200x400 banner image
- Target Keywords: "sale, discount, offer"
```

Click **Create**

### Step 2: Enable Placement in Settings

```
Go to: Admin → Settings → Ads

Find these settings:
1. ads.global.enabled = ✅ Enabled
2. ads.placement.homepage_banner.enabled = ✅ Enabled

Save both
```

### Step 3: View on Homepage

```
1. Go to homepage: http://localhost:5173
2. Hard refresh: Ctrl + Shift + R
3. You should see:

┌─────────────────────────────────────────────┐
│  Sponsored                                   │
│  ┌──────────────────────────────────────┐   │
│  │ [Your Summer Sale Banner Image]      │   │
│  │ (1200x400, full-width, clickable)    │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Image Specifications

### Recommended Sizes:

| Placement | Recommended Size | Aspect Ratio |
|-----------|------------------|--------------|
| Homepage Banner | 1200 x 400 px | 3:1 |
| Left Sidebar | 300 x 600 px | 1:2 |
| Right Sidebar | 300 x 600 px | 1:2 |
| Top Banner | 970 x 90 px | 10.8:1 |
| Bottom Banner | 970 x 90 px | 10.8:1 |

### File Requirements:

- **Formats:** JPG, PNG, GIF, WebP
- **Max Size:** 10MB
- **Min Dimensions:** 300 x 250 px
- **Recommended:** High quality, optimized for web

---

## Troubleshooting Upload Errors

### Error: "Failed to upload image"

**Possible Causes:**

1. **File too large (>10MB)**
   ```
   Solution: Compress image or resize
   Tools: TinyPNG, Squoosh, Photoshop
   ```

2. **Wrong file format**
   ```
   Solution: Convert to JPG or PNG
   Allowed: .jpg, .jpeg, .png, .gif, .webp
   Not allowed: .bmp, .tiff, .svg, .pdf
   ```

3. **Network timeout**
   ```
   Solution: Try again with stable internet
   Check: API server is running
   ```

4. **Server directory permissions** (Fixed!)
   ```
   ✅ Created: e:\Project-4\...\uploads\ads\
   ✅ Permissions: Read/Write enabled
   ```

5. **Missing authentication**
   ```
   Solution: Make sure you're logged in
   Check: Token is valid
   ```

---

## API Flow (Technical)

```
User clicks "Upload Image"
         ↓
Frontend: Select file from computer
         ↓
Frontend: Create FormData
         formData.append('file', selectedFile)
         formData.append('folder', 'ads')
         ↓
Frontend: POST /upload/single
         Headers: { Authorization: Bearer {token} }
         ↓
Backend: Authenticate user
         ↓
Backend: Multer middleware validates file
         - Check size (<10MB)
         - Check type (jpg/png/gif/webp)
         ↓
Backend: LocalAdapter uploads to disk
         - Path: uploads/ads/{uuid}.jpg
         - Returns: {url: "http://.../{uuid}.jpg"}
         ↓
Backend: Save to Media collection (MongoDB)
         - Filename, size, mimetype, url
         ↓
Backend: Return response
         { success: true, data: { url: "..." } }
         ↓
Frontend: Store URL in campaign form
         formData.bannerImage = response.data.url
         ↓
User clicks "Create Campaign"
         ↓
Frontend: POST /admin/ads/campaigns or /ads/campaigns
         Body: { ...campaignData, bannerImage: url }
         ↓
Backend: Save campaign with image URL
         ↓
Homepage loads
         ↓
Frontend: POST /ads/auction
         Body: { placement: "homepage_banner" }
         ↓
Backend: Find active campaigns for placement
         - Match: placement, dates, budget, status
         - Return: Campaign with bannerImage URL
         ↓
Frontend: Display image
         <img src={campaign.bannerImage} />
```

---

## Summary

**Your uploaded banner image will show when:**

✅ Campaign Status = **Active**
✅ Today's date is **between Start Date and End Date**
✅ Budget > 0 (not exhausted)
✅ Placement is **enabled** in Settings → Ads
✅ You visit the page that matches the **target placement**

**Common mistake:** Creating campaign but not enabling placement in settings!

**Quick test:**
1. Upload image in campaign ✓
2. Set status = Active ✓
3. Enable ads.global.enabled ✓
4. Enable specific placement ✓
5. Refresh homepage (Ctrl+Shift+R) ✓
6. See your image! 🎉

---

## Need Help?

**If image still doesn't show:**

1. Check browser console (F12) for errors
2. Verify API response: `POST /ads/auction` returns your campaign
3. Check Settings → Ads (all needed placements enabled)
4. Verify campaign dates include today
5. Make sure budget > 0
6. Try incognito mode to bypass cache

**Upload folder location:**
```
e:\Project-4\Ecommerce_patched_v2\shop\apps\api\uploads\ads\
```

**Check if file uploaded:**
1. Go to folder above
2. Look for .jpg/.png files
3. If file exists, upload worked ✓
4. If not, check API logs for errors
