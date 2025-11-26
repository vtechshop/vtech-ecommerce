# 🚀 Quick Start Guide - V-Tech Ecommerce

**Last Updated:** 2025-11-07
**Phase Completed:** 1 & 2 (82% total completion)

---

## 📦 Start Development Servers

### Backend API
```bash
cd "E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api"
npm run dev
```
**Server:** http://localhost:8080

### Frontend Web
```bash
cd "E:\V-Tech  Ecommerce\Ecommerce\shop\apps\web"
npm run dev
```
**App:** http://localhost:3000

---

## 🔑 New Features Quick Reference

### 1. Checkout with Location Data
**URL:** http://localhost:3000/checkout

**Features:**
- 36 Indian states dropdown
- 60+ countries with dial codes
- Default: India (IN)

---

### 2. Review Management (Admin)
**Access:** Login as admin → any product page

**Capabilities:**
- ✏️ Edit ANY review (shows "Admin Actions" badge)
- 🗑️ Delete ANY review
- Auto-update product ratings

**API:**
```
PUT    /api/products/:productId/reviews/:reviewId
DELETE /api/products/:productId/reviews/:reviewId
```

---

### 3. Affiliate Product Links
**Access:** Login as affiliate → dashboard

**API Endpoints:**
```bash
# Generate product-specific link
POST /api/affiliates/links/generate
{
  "productId": "optional_product_id",
  "customCommissionRate": 10
}

# Get all affiliate links
GET /api/affiliates/links/product

# Deactivate link
DELETE /api/affiliates/links/:linkId
```

**Features:**
- Unique 12-character link codes
- Product-specific or store-wide
- Custom commission rates
- Click/conversion tracking
- Soft delete (preserves data)

---

### 4. Sponsored Ads (Enhanced)
**Pages:** Search, Homepage

**Debug Mode:** Automatic in development
- Shows loading state
- Displays errors
- Indicates "no ads available"

**Console Logs:**
```
[Sponsored Ads] Fetching ads for...
[Sponsored Ads] API Response: { adsCount: 2 }
[Sponsored Ads] Loaded 2 ads successfully
```

---

## 🧪 Test Commands

### Test Affiliate Links
```bash
# Generate link (replace TOKEN and PRODUCT_ID)
curl -X POST http://localhost:8080/api/affiliates/links/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID",
    "customCommissionRate": 12
  }'

# Get all links
curl http://localhost:8080/api/affiliates/links/product \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Review Admin Override
```bash
# Edit someone else's review (as admin)
curl -X PUT http://localhost:8080/api/products/PRODUCT_ID/reviews/REVIEW_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Updated by admin for quality control"
  }'
```

### Check Product Ratings
```bash
# Get product to see auto-calculated rating
curl http://localhost:8080/api/products/PRODUCT_ID
# Response includes: "rating": 4.5, "reviewCount": 10
```

---

## 📊 Database Quick Checks

### Check Products
```bash
# Using MongoDB shell
mongosh mongodb://localhost:27017/shop
db.products.countDocuments({ published: true })
```

### Check Reviews
```bash
db.reviews.find({ productId: ObjectId("PRODUCT_ID") })
```

### Check Affiliate Links
```bash
db.affiliatelinks.find({ affiliateId: ObjectId("AFFILIATE_ID") })
```

---

## 🐛 Debugging Tips

### Sponsored Ads Not Showing?
1. Check console for `[Sponsored Ads]` logs
2. Verify ad campaigns exist in database
3. Check budget not exhausted
4. Look for API errors in backend logs

### Checkout Form Issues?
1. Verify `locationData.js` is imported
2. Check state: should be 2-letter code (e.g., 'MH')
3. Check country: should be 2-letter code (e.g., 'IN')

### Review Edit Not Working?
1. Verify user is logged in
2. Check user owns review OR is admin
3. Look for 403 errors in network tab
4. Verify review ID is correct

### Affiliate Link Not Tracking?
1. Check link is active (`isActive: true`)
2. Verify `linkCode` is correct
3. Check affiliate status is 'active'
4. Look for tracking logs in backend

---

## 📁 Important Files Reference

### Backend
```
apps/api/src/
├── models/
│   ├── AffiliateLink.js      ← NEW: Link tracking
│   ├── Affiliate.js
│   ├── Product.js
│   └── Review.js
├── routes/
│   ├── products.js            ← Review CRUD with admin override
│   └── affiliates.js          ← NEW: Product link routes
├── services/
│   └── affiliateService.js    ← NEW: Link generation methods
└── controllers/
    └── affiliateController.js ← NEW: Link controllers
```

### Frontend
```
apps/web/src/
├── assets/
│   ├── pages/
│   │   ├── Checkout.jsx       ← Location dropdowns
│   │   ├── Search.jsx         ← Enhanced ads
│   │   └── Home.jsx           ← Enhanced ads
│   └── components/
│       └── product/
│           └── ProductReviews.jsx ← Admin override
└── utils/
    └── locationData.js        ← 36 states, 60+ countries
```

---

## 🎯 Feature Status at a Glance

| Feature | Status | Priority | Time |
|---------|--------|----------|------|
| Admin Auth | ✅ Complete | Critical | 0 min |
| Checkout Location | ✅ Complete | Critical | 20 min |
| Sponsored Ads Debug | ✅ Complete | Critical | 30 min |
| Review CRUD | ✅ Complete | High | 30 min |
| Product Ratings | ✅ Complete | High | 0 min |
| Affiliate Links | ✅ Complete | High | 60 min |
| Purchase History | ✅ Complete | Medium | 0 min |
| Vendor Dashboard | ✅ Complete | Medium | 45 min |
| Affiliate Data Fix | ✅ Complete | Medium | 30 min |
| Product Collapse | ❓ Needs Info | Medium | TBD |
| System Audit | ⏳ Ongoing | Low | 4-6 hrs |

**Total Complete:** 9/11 (82%)

---

## 🔗 Documentation Links

- **Implementation Status:** [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)
- **Phase 1-2 Complete Summary:** [PHASE_1_2_COMPLETE_SUMMARY.md](PHASE_1_2_COMPLETE_SUMMARY.md)
- **Critical Fixes Guide:** [CRITICAL_FIXES_REQUIRED.md](CRITICAL_FIXES_REQUIRED.md)
- **Warranty System:** [WARRANTY_SYSTEM_IMPLEMENTATION.md](WARRANTY_SYSTEM_IMPLEMENTATION.md)
- **This Guide:** [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)

---

## 🆘 Common Issues & Solutions

### Issue: "Admin dashboard opens without login"
**Status:** ✅ Fixed (already was working)
**Solution:** ProtectedRoute component is active in App.jsx:116-133

### Issue: "States dropdown not showing in checkout"
**Status:** ✅ Fixed
**Solution:** Implemented in Checkout.jsx with all 36 Indian states

### Issue: "Can't edit other users' reviews as admin"
**Status:** ✅ Fixed
**Solution:** Added admin override in products.js routes

### Issue: "Affiliate link not generating"
**Status:** ✅ Fixed
**Solution:** Complete system implemented with new model and routes

### Issue: "Sponsored ads sometimes don't appear"
**Status:** ✅ Improved
**Solution:** Added comprehensive error handling and logging

### Issue: "Vendor dashboard resets when navigating"
**Status:** ✅ Fixed
**Solution:** Implemented React Query caching and sessionStorage state persistence

### Issue: "Affiliate dashboard shows wrong data"
**Status:** ✅ Fixed
**Solution:** Backend already isolated correctly, added frontend caching and global cache clearing on logout/role change

---

## 💻 Quick Commands Reference

```bash
# Kill stuck backend process
tasklist | findstr "node"
taskkill /F /PID <PID>

# Restart backend
cd "E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api"
npm run dev

# Check MongoDB
mongosh mongodb://localhost:27017/shop

# View API logs
# (Automatic in terminal where npm run dev is running)

# Frontend production build
cd apps/web
npm run build

# Run tests
npm test
```

---

## 🎓 Next Steps

### If Continuing Development:
1. Implement Purchase History page
2. Fix Vendor Dashboard state persistence
3. Fix Affiliate Dashboard data isolation
4. Investigate product collapse issue
5. Complete system audit

### If Testing:
1. Test all new features manually
2. Verify admin override works
3. Generate test affiliate links
4. Check sponsored ads logging
5. Test checkout with different locations

### If Deploying:
1. Update environment variables
2. Set CLIENT_URL for affiliate links
3. Configure production database
4. Test all authentication flows
5. Verify ad placements work

---

**Last Session:** 2025-11-07 (Phase 3 Complete)
**Phase Completed:** Phases 1, 2 & 3 (9/11 features - 82%)
**Next Steps:** Product Collapse Investigation or System Audit
**Ready for:** Production Testing & Deployment

---

## 📞 Need Help?

Check documentation files for detailed information:
- Technical details → PHASE_1_2_COMPLETE_SUMMARY.md
- Progress tracking → IMPLEMENTATION_STATUS.md
- Critical fixes → CRITICAL_FIXES_REQUIRED.md
- Quick reference → QUICK_START_GUIDE.md (this file)
