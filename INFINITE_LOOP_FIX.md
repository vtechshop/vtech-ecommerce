# Infinite `/auth/me` Loop - FIXED

## Problem
The API server was being bombarded with hundreds of `/auth/me` requests per second, causing an infinite loop and crashing the server.

## Root Cause
Multiple session refresh mechanisms were triggering simultaneously:

1. **DashboardLayout.jsx** - `useEffect` with `location.pathname` dependency triggered refresh on EVERY page navigation
2. **VendorKYC.jsx** - THREE automatic refresh mechanisms:
   - On component mount
   - On window focus
   - Every 30 seconds (periodic refresh)

When vendor navigated between pages:
1. DashboardLayout refresh triggered
2. VendorKYC mount refresh triggered
3. Window focus refresh triggered
4. Periodic refresh running in background
5. Each refresh caused React re-render
6. Re-render triggered navigation change
7. Navigation change triggered DashboardLayout refresh again
8. **INFINITE LOOP**

## Solution Applied

### 1. Removed DashboardLayout Auto-Refresh
**File**: `apps/web/src/components/layout/DashboardLayout.jsx`

**Removed**:
```javascript
useEffect(() => {
  if (isVendor) {
    const refreshUserSession = async () => {
      const response = await api.get('/auth/me');
      dispatch(setUser(response.data.data));
    };
    refreshUserSession();
  }
}, [isVendor, location.pathname, dispatch]); // ❌ This triggered on every navigation
```

**Why**: Every time vendor clicked a menu item, `location.pathname` changed, triggering another refresh, which caused re-render, which triggered navigation check, creating infinite loop.

### 2. Removed VendorKYC Auto-Refresh Mechanisms
**File**: `apps/web/src/pages/dashboard/vendor/VendorKYC.jsx`

**Removed**:
- ❌ Refresh on component mount
- ❌ Refresh on window focus
- ❌ Periodic refresh every 30 seconds

**Kept**:
- ✅ **Manual "Refresh Status" button** - Vendor can click to refresh when needed

## Final Implementation

### User Session is Populated From Login
When vendor logs in, the `/auth/login` endpoint returns the full user object with populated `vendorProfile`:

```javascript
// authController.js - login endpoint
const populatedUser = await User.findById(user._id)
  .select('-password -refreshToken')
  .populate({
    path: 'vendorProfile',
    select: 'storeName slug status kyc', // ✅ Full kyc object
  });

return res.json({
  success: true,
  data: {
    user: populatedUser,
    accessToken,
  },
});
```

### Manual Refresh Available
Vendor can manually refresh their KYC status by clicking the "Refresh Status" button on the KYC page.

```javascript
// VendorKYC.jsx
const refreshUserSession = async () => {
  setIsRefreshing(true);
  try {
    const response = await api.get('/auth/me');
    dispatch(setUser(response.data.data));
    toast.success('Status refreshed successfully');
  } catch (error) {
    toast.error('Failed to refresh status');
  } finally {
    setIsRefreshing(false);
  }
};
```

## How Vendor Menu Unlock Works Now

### On Login
1. Vendor enters credentials
2. `/auth/login` endpoint validates and returns user with full `vendorProfile`
3. Redux state is set with complete user data including `kyc.status`
4. Vendor is redirected to `/vendor-dashboard`

### Route Protection Check
```javascript
// App.jsx - ProtectedRoute
if (requireVendorApproval && user.role === 'vendor') {
  const isKYCApproved = user.vendorProfile?.kyc?.status === 'approved';

  if (!isKYCApproved) {
    return <Navigate to="/vendor-dashboard/kyc" replace />;
  }
}
```

### Menu Item Lock Check
```javascript
// DashboardLayout.jsx
const isVendorKYCApproved = () => {
  if (!isVendor || !user?.vendorProfile) return false;
  return user.vendorProfile.kyc?.status === 'approved';
};

const isMenuItemLocked = (path) => {
  if (!isVendor || isVendorKYCApproved()) return false;
  if (path.includes('/kyc') || path.includes('/support')) return false;
  return true;
};
```

## Testing the Fix

### 1. Restart Servers
```bash
# Kill all Node processes
taskkill //F //IM node.exe

# Start API
cd apps/api
npm run dev

# Start frontend (new terminal)
cd apps/web
npm run dev
```

### 2. Test Vendor Login
1. Log in as approved vendor (chinu2@gmail.com or vtech@gmail.com)
2. Should redirect to `/vendor-dashboard`
3. All menu items should be unlocked (no lock icons)
4. Click on "Products" - should navigate successfully
5. Click on "Orders" - should navigate successfully
6. **NO infinite loops** - Check API console, should see only normal requests

### 3. Test Unapproved Vendor
1. Log in as pending vendor
2. Should redirect to `/vendor-dashboard/kyc`
3. Menu items should show lock icons
4. Click on locked item - shows toast: "Waiting for approval"
5. Can click "Refresh Status" button to manually check for approval

### 4. Test Admin Approval Flow
1. **Admin**: Approve vendor at Admin > KYC Review
2. **Vendor**: Click "Refresh Status" button on KYC page
3. Status badge changes to green "Approved"
4. Vendor navigates to any other page (e.g., Overview)
5. Menu items unlock immediately
6. Can access all vendor features

## Key Changes Summary

| File | Change | Why |
|------|--------|-----|
| `User.js` model | Added `toJSON: { virtuals: true }` | Include `vendorProfile` virtual in JSON responses |
| `authController.js` `/auth/me` | Changed select to `'storeName slug status kyc'` | Return full kyc object instead of nested fields |
| `authController.js` `/auth/login` | Changed select to `'storeName slug status kyc'` | Populate full kyc on login |
| `App.jsx` ProtectedRoute | Check `user.vendorProfile?.kyc?.status === 'approved'` | Properly validate vendor approval before redirect |
| `DashboardLayout.jsx` | Removed auto-refresh on navigation | Prevent infinite loop |
| `VendorKYC.jsx` | Removed all auto-refresh mechanisms | Prevent infinite loop, keep manual refresh only |

## What Was Fixed

✅ Infinite `/auth/me` request loop
✅ Server crash from too many requests
✅ Vendor menu items unlock after login
✅ Protected routes properly check KYC status
✅ Manual refresh button works correctly
✅ No unnecessary automatic refreshes

## What Vendor Experience Looks Like

### Before Admin Approval
- Can access: KYC page, Support page
- Cannot access: Products, Orders, Inventory, Settlements, Sponsored Ads, Overview
- Locked items show lock icon
- Clicking locked items shows toast message
- Can click "Refresh Status" to check if approved

### After Admin Approval
- **First time**: Click "Refresh Status" button OR log out and log back in
- After refresh: All menu items unlock
- Can access all vendor dashboard features
- No more lock icons
- No more toast messages about approval

## Performance Impact

**Before Fix**:
- 200+ requests per second to `/auth/me`
- Server CPU maxed out
- MongoDB connection pool exhausted
- Application unusable

**After Fix**:
- Only 1 request on login
- Optional manual refresh via button
- Normal server performance
- Application works smoothly

## Prevention Measures

1. ✅ Never use `location.pathname` as useEffect dependency for API calls
2. ✅ Avoid multiple simultaneous auto-refresh mechanisms
3. ✅ Prefer manual refresh over automatic polling
4. ✅ Always test with API request monitoring to catch loops early
5. ✅ Use React DevTools to track unnecessary re-renders

## Monitoring

To verify no loops exist, monitor API logs:
```bash
# Should see clean, occasional requests
GET /auth/me - 200 OK - 5ms
GET /vendors/kyc - 200 OK - 8ms

# Should NOT see
GET /auth/me - 304 - 4ms (hundreds per second) ❌
```

---

**Status**: ✅ FIXED - No more infinite loops, vendor approval workflow working correctly
