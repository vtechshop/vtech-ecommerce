# Ad Campaign Creation - Field Visibility

## Current Behavior (Working as Designed)

The ad campaign creation form has **conditional fields** that appear based on the campaign type you select.

### Form Fields Based on Campaign Type

#### Common Fields (Always Visible)
- ✅ Campaign Name
- ✅ Vendor
- ✅ Type (SponsoredProduct / SponsoredBrand / Banner)
- ✅ Pricing (CPC / CPM)
- ✅ Bid ($)
- ✅ Daily Budget ($)
- ✅ Total Budget ($)
- ✅ Start Date
- ✅ End Date
- ✅ Status
- ✅ Target Keywords

#### Banner-Specific Fields (Only Visible When Type = "Banner")
- ✅ **Placement (Page/Location)** - Lines 549-572
  - Options: Homepage Banner, Homepage Sidebar, Blog Sidebar, Category Top Banner, Product Sidebar, Search Results

- ✅ **Banner Position** - Lines 575-600
  - Options: Top, Right, Bottom, Left, Center, Top-Right, Top-Left, Bottom-Right, Bottom-Left

- ✅ **Banner Size/Type** - Lines 603-627
  - Options: Hero, Leaderboard, Large Sidebar, Small Sidebar, Rectangle, Skyscraper, Square, Custom

- ✅ **Custom Dimensions (Width/Height)** - Lines 630-665
  - Only shown when Banner Size = "Custom"

- ✅ **Banner Image Upload** - Lines 668-712

---

## How to Use

### Step 1: Create a Banner Campaign

1. Go to **Admin Dashboard → Sponsored Ads**
2. Click **"Create Campaign"**
3. Fill in common fields:
   - Campaign Name: "Summer Sale Banner"
   - Vendor: Select vendor
   - **Type: Select "Banner"** ← THIS IS KEY!
   - Pricing: CPC
   - Bid: $2.50
   - Daily Budget: $100
   - Start Date: Set date
   - Status: Active

### Step 2: Banner-Specific Fields Appear

Once you select **Type = "Banner"**, three additional sections appear:

**Placement (Page/Location):**
```
Select where your ad will appear:
- Homepage - Banner (Hero Section)
- Homepage - Left Sidebar
- Homepage - Right Sidebar
- Blog - Sidebar
- Category Page - Top Banner
- Product Page - Sidebar
- Search Results - Sponsored Products
```

**Banner Position:**
```
Choose where the banner is positioned:
- Top - Full Width
- Right - Sidebar
- Bottom - Full Width
- Left - Sidebar
- Center - Overlay
- Top Right - Corner
- Top Left - Corner
- Bottom Right - Corner
- Bottom Left - Corner
```

**Banner Size/Type:**
```
Choose banner dimensions:
- Hero Banner - Full Width Header (1920x600px)
- Leaderboard - Top Banner (728x90px)
- Large Sidebar Banner (300x600px)
- Small Sidebar Banner (300x250px)
- Medium Rectangle (300x250px)
- Skyscraper - Tall Sidebar (160x600px)
- Square Banner (250x250px)
- Custom Size (Specify Dimensions)
```

### Step 3: Upload Banner Image (Optional)

- Upload a custom banner image
- Supports PNG, JPG up to 10MB
- Preview shown after upload
- Can remove and re-upload

---

## Why Are These Fields Conditional?

**Sponsored Product Campaigns** don't need placement/position/size because they appear inline with search results and product listings.

**Banner Campaigns** need these fields because they are display ads that require specific placement and sizing.

This is a **design decision** to keep the form simple and only show relevant fields based on campaign type.

---

## Current Implementation Code

**Default Values (Line 15-33):**
```javascript
const [formData, setFormData] = useState({
  name: '',
  type: 'SponsoredProduct',  // Default = Sponsored Product
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
  placement: 'homepage_banner',  // Banner field (hidden by default)
  position: 'top',                // Banner field (hidden by default)
  bannerSize: 'hero',             // Banner field (hidden by default)
  dimensions: { width: '', height: '' },
});
```

**Conditional Rendering (Line 549):**
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
      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
      required
    >
      <option value="homepage_banner">Homepage - Banner (Hero Section)</option>
      <option value="homepage_sidebar_left">Homepage - Left Sidebar</option>
      ...
    </select>
  </div>
)}
```

---

## What You See in the Database

### Sponsored Product Campaign
```json
{
  "name": "Summer Sale",
  "type": "SponsoredProduct",
  "pricing": "CPC",
  "bid": 2.50,
  "dailyBudget": 100,
  "status": "active",
  "targeting": {
    "keywords": ["laptop", "phone"]
  }
  // No placement, position, or bannerSize fields
}
```

### Banner Campaign
```json
{
  "name": "Holiday Banner",
  "type": "Banner",
  "pricing": "CPM",
  "bid": 5.00,
  "dailyBudget": 200,
  "status": "active",
  "placement": "homepage_banner",      // ✅ Has placement
  "position": "top",                   // ✅ Has position
  "bannerSize": "hero",                // ✅ Has size
  "bannerImage": "https://...",        // ✅ Has image
  "targeting": {
    "keywords": ["sale", "discount"]
  }
}
```

---

## Testing the Feature

### Test 1: Create Sponsored Product Campaign
1. Type = "SponsoredProduct"
2. Placement/Position/Size fields should NOT appear
3. Form is shorter and simpler

### Test 2: Create Banner Campaign
1. Type = "Banner"
2. Placement/Position/Size fields SHOULD appear
3. Fill in all banner-specific fields
4. Upload banner image
5. Create campaign
6. Check database - should have placement, position, bannerSize

### Test 3: Switch Between Types
1. Start with Type = "Banner" (fields appear)
2. Switch to Type = "SponsoredProduct" (fields disappear)
3. Switch back to Type = "Banner" (fields reappear with previous values)

---

## Summary

✅ **Placement, Position, and Size fields ARE implemented**
✅ **They appear when Type = "Banner" is selected**
✅ **This is working as designed**

If you want these fields to appear for ALL campaign types (SponsoredProduct and SponsoredBrand too), I can modify the code to remove the conditional rendering.

**Do you want me to:**
1. **Keep it as is** (only show for Banner type) ← Current behavior
2. **Show for all types** (always visible regardless of campaign type)
3. **Something else?**

Let me know what you prefer!
