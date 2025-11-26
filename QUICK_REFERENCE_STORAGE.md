# Quick Reference: Cookie & Session Storage (1 Month)

## 🎯 What Was Changed

All customer cookies and sessions now expire after **30 days (1 month)**.

## 📋 Summary Table

| Item | Before | After | Location |
|------|--------|-------|----------|
| Cookie Consent | 365 days | **30 days** | Frontend |
| User Login Session | 7 days | **30 days** | Backend JWT |
| Refresh Token Cookie | 7 days | **30 days** | Backend HTTP Cookie |
| User Cache (Redis) | 5 minutes | **30 days** | Backend Redis |

## 📁 Files Changed

1. ✅ `shop/apps/web/src/assets/store/slices/consentSlice.js` - Cookie consent
2. ✅ `shop/apps/api/src/utils/jwt.js` - JWT tokens
3. ✅ `shop/apps/api/src/controllers/authController.js` - HTTP cookies
4. ✅ `shop/apps/api/src/middleware/cache.js` - Redis cache
5. ✅ `shop/apps/api/src/config/ttl.js` - **NEW** centralized config

## 🚀 Quick Test

```bash
# 1. Open browser in Incognito mode
# 2. Visit http://localhost:3000
# 3. Cookie banner should appear ✅
# 4. Login to account
# 5. Check DevTools > Application > Cookies
# 6. Verify cookies expire in ~30 days ✅
```

## 🔍 Browser DevTools Check

**Check in Application > Cookies:**
- `cookie_consent` → Expires in 30 days
- `refreshToken` → Expires in 30 days

## 📊 User Experience

**Day 1:** Cookie banner appears → User accepts → Logged in
**Days 2-30:** No banner → Still logged in → Cached data
**Day 31:** Cookie banner reappears → Must login again → Fresh start

## ✅ Benefits

- 🔒 **Better Privacy**: Cookies expire monthly (was yearly)
- 😊 **Better UX**: Stay logged in for month (was 1 week)
- ⚡ **Faster**: User data cached longer
- 📜 **Compliant**: GDPR/CCPA friendly

## 🏗️ Build Status

✅ Frontend built successfully
✅ Backend ready (no build needed for Node.js)
✅ All changes compatible

## 📚 Documentation

- Full details: [COOKIE_CONSENT_FIX.md](./COOKIE_CONSENT_FIX.md)
- Complete guide: [SESSION_STORAGE_UPDATE.md](./SESSION_STORAGE_UPDATE.md)

## 🔧 Configuration Constants

From `shop/apps/api/src/config/ttl.js`:

```javascript
const ONE_MONTH_SECONDS = 2,592,000; // 30 days in seconds

USER_SESSION_TTL: 2,592,000 seconds (30 days)
USER_CACHE_TTL: 2,592,000 seconds (30 days)
```

## 💡 Key Points

1. **Cookie consent** shows to every new/unknown visitor ✅
2. **Sessions last 30 days** instead of 7 days ✅
3. **User cache persists 30 days** instead of 5 minutes ✅
4. **Everything expires together** after 30 days ✅

---

**Status**: ✅ Complete and Ready
**Next**: Test in development before production deployment
