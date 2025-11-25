# Understanding Your Two Ad Systems

Your e-commerce platform has **TWO SEPARATE AD SYSTEMS** that work together:

---

## 1. **SPONSORED ADS** (Campaign Management System)

**Where:** Admin/Vendor Dashboard → Sponsored Ads / Ad Campaigns

**Purpose:** Create and manage actual ad campaigns

**Who uses it:**
- **Vendors** - Create ads to promote their products
- **Advertisers** - Run marketing campaigns
- **Admin** - Oversee all ad campaigns

**What it does:**
- Create ad campaigns with budgets
- Set targeting (placements, dates)
- Track clicks, impressions, conversions
- Manage ad wallet and billing
- Pause/resume campaigns

**Files:**
- `apps/web/src/assets/pages/dashboard/vendor/Ads.jsx` - Vendor campaign management
- `apps/web/src/assets/pages/dashboard/admin/Ads.jsx` - Admin campaign oversight
- `apps/api/src/controllers/adController.js` - Campaign CRUD operations

**API Endpoints:**
- `POST /ads/auction` - Get ads for a placement (used by homepage)
- `GET /ads/campaigns` - List all campaigns
- `POST /ads/campaigns` - Create new campaign
- `PUT /ads/campaigns/:id` - Update campaign
- `POST /ads/events` - Track impressions/clicks

---

## 2. **AD PLACEMENT SETTINGS** (Enable/Disable Controls)

**Where:** Admin Dashboard → Settings → Ads

**Purpose:** Control WHERE ads can appear on the website

**Who uses it:**
- **Admin only** - Site-wide ad controls

**What it does:**
- Master toggle to disable ALL ads globally
- Enable/disable specific ad placements (homepage banner, sidebars, etc.)
- Control ad refresh intervals
- Set placement priorities

**Files:**
- `apps/web/src/assets/pages/dashboard/admin/Settings.jsx` - Settings UI
- `apps/api/src/models/Setting.js` - Settings storage
- `apps/api/src/scripts/initAdSettings.js` - Initialize ad settings

**Settings Available:**
- `ads.global.enabled` - Master on/off switch
- `ads.placement.homepage_banner.enabled` - Homepage center banner
- `ads.placement.homepage_sidebar_left.enabled` - Left sidebar
- `ads.placement.homepage_sidebar_right.enabled` - Right sidebar
- `ads.placement.top_banner.enabled` - Top banner (all pages)
- Plus 17 more placement settings...

---

## How They Work Together

```
┌─────────────────────────────────────────────────────────────┐
│  HOMEPAGE LOADS                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Check Settings → Ads                                    │
│     "Is ads.global.enabled = true?"                         │
│     "Is ads.placement.homepage_banner.enabled = true?"      │
└─────────────────────────────────────────────────────────────┘
                          ↓
                         YES → Continue
                         NO → Show nothing
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Fetch Sponsored Ad Campaign                             │
│     POST /ads/auction { placement: 'homepage_banner' }      │
│     Returns active campaign if exists                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
                   Campaign exists?
                          ↓
                    YES → Show ad
                    NO → Show nothing
```

---

## Examples

### Scenario 1: Everything Enabled, Campaign Exists
```
Settings → Ads:
  ✅ ads.global.enabled = true
  ✅ ads.placement.homepage_banner.enabled = true

Sponsored Ads:
  ✅ Active campaign exists for "homepage_banner"

Result: AD SHOWS ✓
```

### Scenario 2: Settings Enabled, No Campaign
```
Settings → Ads:
  ✅ ads.global.enabled = true
  ✅ ads.placement.homepage_banner.enabled = true

Sponsored Ads:
  ❌ No active campaigns

Result: NO AD (nothing shows) ✓
```

### Scenario 3: Settings Disabled, Campaign Exists
```
Settings → Ads:
  ❌ ads.global.enabled = false

Sponsored Ads:
  ✅ Active campaign exists

Result: NO AD (settings block it) ✓
```

### Scenario 4: Specific Placement Disabled
```
Settings → Ads:
  ✅ ads.global.enabled = true
  ❌ ads.placement.homepage_banner.enabled = false
  ✅ ads.placement.homepage_sidebar_left.enabled = true

Result:
  ❌ Center banner: Hidden (disabled in settings)
  ✅ Left sidebar: Shows (if campaign exists)
```

---

## Current Issue You're Experiencing

### Problem:
When you **enable ads in Settings → Ads**, they don't appear immediately.

### Why:
The homepage caches ad settings for 5 minutes. React Query is caching the settings response.

### Solution:
After enabling ads in settings, you need to:

1. **Hard refresh the homepage:**
   - Windows: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **Or clear React Query cache:**
   - Open DevTools (F12)
   - Go to Application → Local Storage
   - Clear site data
   - Refresh

3. **Or wait 5 minutes:**
   - Settings cache expires after 5 minutes
   - Next page load will fetch fresh settings

---

## How to See Ads on Your Homepage

### Step 1: Enable Placement in Settings
1. Go to **Admin → Settings → Ads**
2. Find `ads.global.enabled`
3. Set to **Enabled**
4. Click **Save**

### Step 2: Create a Campaign in Sponsored Ads
1. Go to **Vendor Dashboard → Ads** (or Admin → Ad Campaigns)
2. Click **Create Campaign**
3. Fill in:
   - **Title:** "Test Ad"
   - **Placement:** Select `homepage_banner`
   - **Start Date:** Today
   - **End Date:** Next week
   - **Status:** Active
   - **Budget:** 1000 (or any amount)
4. Click **Create**

### Step 3: Refresh Homepage
1. Hard refresh: `Ctrl + Shift + R`
2. You should see the ad!

---

## Testing the System

### Test 1: Disable All Ads
```bash
1. Settings → Ads → ads.global.enabled = Disabled
2. Save
3. Refresh homepage (Ctrl+Shift+R)
4. Result: NO ads anywhere ✓
```

### Test 2: Enable Only Left Sidebar
```bash
1. Settings → Ads:
   - ads.global.enabled = Enabled
   - ads.placement.homepage_banner.enabled = Disabled
   - ads.placement.homepage_sidebar_left.enabled = Enabled
   - ads.placement.homepage_sidebar_right.enabled = Disabled

2. Create campaign for "homepage_sidebar_left"
3. Refresh homepage
4. Result: Only left sidebar ad shows ✓
```

---

## Summary

| System | Purpose | Who Manages | Controls |
|--------|---------|-------------|----------|
| **Sponsored Ads** | Create ad campaigns | Vendors, Advertisers | Campaign content, budget, targeting |
| **Ad Placement Settings** | Enable/disable placements | Admin only | Where ads CAN appear |

**Both must be enabled for ads to show:**
1. Settings → Ads (placement enabled)
2. Sponsored Ads (active campaign exists)

If ads aren't showing:
- ✓ Check Settings → Ads (is placement enabled?)
- ✓ Check Sponsored Ads (is there an active campaign?)
- ✓ Hard refresh browser (Ctrl+Shift+R)
- ✓ Clear cache if needed

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Ads don't show after enabling | Hard refresh (Ctrl+Shift+R) |
| Ads still don't show | Check if campaign exists in Sponsored Ads |
| Ads show when disabled | Clear browser cache completely |
| Layout doesn't adjust | Hard refresh (layout updates automatically) |

---

**Both systems are working correctly!** The issue is just that settings are cached. After enabling, do a hard refresh and the ads will appear (if campaigns exist).
