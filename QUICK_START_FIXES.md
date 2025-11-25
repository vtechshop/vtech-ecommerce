# Quick Start: Apply All Fixes

## 🚀 Fast Track Implementation (30 Minutes)

Follow these steps in order to fix all issues immediately.

---

## Step 1: Fix API Disconnection (5 minutes) ⚡ CRITICAL

### Backup Original
```bash
cd shop/apps/api/src/config
cp db.js db.backup.js
```

### Apply Fix
```bash
cp db.improved.js db.js
```

### Restart API
```bash
cd shop/apps/api
npm run dev
```

### Verify
```bash
# You should see:
# ✅ MongoDB connected: localhost
```

**Result:** API will automatically reconnect if MongoDB disconnects ✅

---

## Step 2: Add Ad Placement Selector (20 minutes)

### File to Edit
`shop/apps/web/src/assets/pages/dashboard/admin/AdsManagement.jsx`

### Changes Required

#### 2.1 Add `placements` to formData (Line 14)
```jsx
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
  placements: ['homepage_banner'], // ✅ ADD THIS LINE
});
```

#### 2.2 Add Placement Checkboxes UI (After line 545)
See `PLACEMENT_SELECTOR_IMPLEMENTATION.md` for full code.

Quick version:
```jsx
<div>
  <label>Ad Placements *</label>
  <div className="space-y-2">
    <label>
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
      />
      Homepage Banner (Center)
    </label>

    {/* Repeat for other placements */}
  </div>
</div>
```

#### 2.3 Update handleSubmit (Line 180)
```jsx
const dataToSend = {
  // ... existing fields ...
  placements: formData.placements, // ✅ ADD THIS LINE
  targeting: { ... },
};
```

#### 2.4 Update handleEdit (Line 126)
```jsx
setFormData({
  // ... existing fields ...
  placements: ad.placements || ['homepage_banner'], // ✅ ADD THIS LINE
});
```

---

## Step 3: Update Backend (5 minutes)

### File to Edit
`shop/apps/api/src/controllers/adminController.js`

### Change createAdCampaign (Line 505)
```javascript
// OLD
const placements = ['homepage_banner', 'search_grid'];

// NEW
const placements = req.body.placements && req.body.placements.length > 0
  ? req.body.placements
  : ['homepage_banner', 'search_grid'];
```

### Change updateAdCampaign (Line 541)
```javascript
// OLD
const placements = ['homepage_banner', 'search_grid'];

// NEW
const requestedPlacements = req.body.placements && req.body.placements.length > 0
  ? req.body.placements
  : ['homepage_banner', 'search_grid'];
```

### Restart API
```bash
cd shop/apps/api
npm run dev
```

---

## Step 4: Update AdCampaign Model (Optional)

### File to Edit
`shop/apps/api/src/models/AdCampaign.js`

### Add after `bannerImage` field
```javascript
placements: {
  type: [String],
  enum: [
    'homepage_banner',
    'homepage_sidebar_left',
    'homepage_sidebar_right',
    'search_grid',
    'category_grid',
  ],
  default: ['homepage_banner'],
},
```

---

## Test Everything (5 minutes)

### Test 1: API Connection
```bash
# Stop MongoDB
mongod --shutdown

# Wait 10 seconds...

# Check API logs - should see:
# ⚠️ MongoDB disconnected. Auto-reconnect will attempt...
# 🔄 Retrying connection in 5 seconds...

# Start MongoDB
mongod

# Should see:
# ✅ MongoDB reconnected successfully
```

### Test 2: Ad Placement
1. Go to Admin → Sponsored Ads → Create Campaign
2. Fill in form
3. Upload banner image
4. **Select placements:**
   - ☑ Homepage Banner
   - ☐ Left Sidebar
   - ☑ Search Results
5. Click Create
6. Visit homepage → Should see banner ✅
7. Search something → Should see ad ✅
8. Check left sidebar → Should NOT see ad ✅

---

## Verification Checklist

After applying all fixes:

### Backend
- [ ] API restarts without errors
- [ ] MongoDB connection logs show "connected"
- [ ] Can create campaigns via admin panel
- [ ] Placements are saved to database

### Frontend
- [ ] Admin panel loads without errors
- [ ] Can create new ad campaign
- [ ] Placement checkboxes appear in form
- [ ] Can select multiple placements
- [ ] Form validates at least one placement

### Functionality
- [ ] Ads display in selected placements only
- [ ] Existing ads still work
- [ ] Can edit campaign and change placements
- [ ] API auto-reconnects on MongoDB disconnect

---

## Quick Reference

### Files Modified
```
shop/apps/api/src/config/db.js                            ← DB connection fix
shop/apps/api/src/controllers/adminController.js          ← Placement support
shop/apps/api/src/models/AdCampaign.js                    ← Placement field
shop/apps/web/src/assets/pages/dashboard/admin/AdsManagement.jsx  ← UI
```

### Time Estimate
- Fix DB connection: 5 min
- Add placement UI: 20 min
- Update backend: 5 min
- Test everything: 5 min
**Total: ~35 minutes**

---

## Rollback Instructions

If something breaks:

```bash
# Restore DB config
cd shop/apps/api/src/config
cp db.backup.js db.js

# Restart API
cd shop/apps/api
npm run dev
```

For frontend, use Git:
```bash
cd shop/apps/web
git checkout -- src/assets/pages/dashboard/admin/AdsManagement.jsx
```

---

## Getting Help

### Issue: API won't start
**Check:** MongoDB is running
```bash
mongod --version
```

### Issue: Placements not saving
**Check:** Browser console for errors (F12)
**Check:** API logs for validation errors

### Issue: Ads not appearing
**Check:** Campaign dates are valid (not expired)
**Check:** Campaign status is "active"
**Check:** AdCreatives were created in database

### Debug Database
```javascript
// Check campaign
db.adcampaigns.findOne({ name: "Your Campaign" })

// Check creatives
db.adcreatives.find({ campaignId: ObjectId("...") })
```

---

## Summary

✅ **API Connection Fixed**
- Auto-reconnect with retry logic
- Increased timeouts
- Better error handling

✅ **Ad Placement Control Added**
- Admin can select where ads appear
- Clear UI with checkboxes
- Backend creates AdCreatives only for selected placements

✅ **System Stability Improved**
- No more manual restarts needed
- Better logging
- Graceful error recovery

**Next:** See `COMPLETE_BUG_ANALYSIS_AND_FIXES.md` for detailed explanations and additional improvements.
