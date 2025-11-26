# Vendor Menu Unlock After Approval - Complete Fix

## Problem
After admin approved vendor KYC, vendor's dashboard menu items remained locked even after page refresh, showing "Waiting for approval" message.

## Root Causes

### 1. **Incomplete vendorProfile Population in `/auth/me` Endpoint**
The `/auth/me` endpoint was only selecting specific nested fields:
```javascript
.populate({
  path: 'vendorProfile',
  select: 'storeName slug kyc.status kyc.businessName',
})
```

This caused the populated `vendorProfile` object to not have the full `kyc` object structure properly accessible.

### 2. **No Automatic Session Refresh**
When admin approved vendor, the database was updated but the vendor's Redux state still had stale data. There was no mechanism to automatically refresh the session.

## Fixes Applied

### Fix 1: Enhanced `/auth/me` Endpoint Population
**File**: `apps/api/src/controllers/authController.js` (line 357-373)

**Changed**:
```javascript
.populate({
  path: 'vendorProfile',
  select: 'storeName slug status kyc',  // ✅ Now returns full kyc object
})
```

This ensures the entire `kyc` object is returned, making `user.vendorProfile.kyc.status` properly accessible in the frontend.

### Fix 2: Multiple Session Refresh Mechanisms
**File**: `apps/web/src/pages/dashboard/vendor/VendorKYC.jsx` (lines 16-55)

Added **THREE** refresh mechanisms:

#### a) Refresh on Component Mount
```javascript
useEffect(() => {
  refreshUserSession();
}, [dispatch]);
```

#### b) Refresh on Window Focus
```javascript
useEffect(() => {
  const handleFocus = () => {
    console.log('🔄 Window focused, refreshing user session...');
    refreshUserSession();
  };
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [dispatch]);
```

When vendor switches back to the browser tab, session refreshes automatically.

#### c) Periodic Refresh Every 30 Seconds
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    console.log('⏰ Periodic refresh (30s)...');
    refreshUserSession();
  }, 30000);
  return () => clearInterval(interval);
}, [dispatch]);
```

Checks for approval status every 30 seconds automatically.

#### d) Manual Refresh Button
Added a "Refresh Status" button in the KYC page header that vendors can click to manually refresh their approval status.

```javascript
<button
  onClick={() => refreshUserSession(true)}
  disabled={isRefreshing}
  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
  title="Refresh approval status"
>
  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
  Refresh Status
</button>
```

### Fix 3: Enhanced Session Refresh Function
```javascript
const refreshUserSession = async (showToast = false) => {
  if (showToast) setIsRefreshing(true);
  try {
    const response = await api.get('/auth/me');
    dispatch(setUser(response.data.data));
    console.log('✅ User session refreshed, KYC status:', response.data.data?.vendorProfile?.kyc?.status);
    if (showToast) {
      toast.success('Status refreshed successfully');
    }
  } catch (error) {
    console.error('❌ Failed to refresh user session:', error);
    if (showToast) {
      toast.error('Failed to refresh status');
    }
  } finally {
    if (showToast) setIsRefreshing(false);
  }
};
```

## How Menu Lock Detection Works

**File**: `apps/web/src/components/layout/DashboardLayout.jsx` (lines 88-102)

```javascript
// Check if vendor's KYC is approved
const isVendorKYCApproved = () => {
  if (!isVendor || !user?.vendorProfile) return false;
  return user.vendorProfile.kyc?.status === 'approved';  // ← This now works properly
};

// Check if a menu item should be locked for vendors with pending KYC
const isMenuItemLocked = (path) => {
  if (!isVendor || isVendorKYCApproved()) return false;

  // KYC and Support are always accessible
  if (path.includes('/kyc') || path.includes('/support')) return false;

  // All other vendor pages are locked until KYC is approved
  return true;
};
```

## Testing the Fix

### Prerequisites
1. **Restart API server** (to load the updated authController.js)
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Clear browser cache** or open in Incognito/Private mode

### Test Scenario 1: Admin Approves Vendor
1. **Admin**: Log in as admin
2. **Admin**: Go to Admin Dashboard > KYC Review
3. **Admin**: Find vendor "chinu2@gmail.com" or "vtech@gmail.com"
4. **Admin**: Click "Approve" button

5. **Vendor**: Vendor can now unlock menus in 4 ways:
   - **Option A**: Click "Refresh Status" button on KYC page
   - **Option B**: Switch to another tab and back (window focus triggers refresh)
   - **Option C**: Wait 30 seconds (automatic periodic refresh)
   - **Option D**: Manually refresh the page (F5)

6. **Verify**: Check browser console for refresh logs:
   ```
   ✅ User session refreshed, KYC status: approved
   ```

7. **Verify**: All vendor menu items should now be unlocked and clickable

### Test Scenario 2: Real-Time Detection
1. Have vendor logged in with KYC page open
2. Admin approves vendor in another window
3. Within 30 seconds, vendor's session will auto-refresh
4. Menu items will automatically unlock without any manual action

### Test Scenario 3: Manual Refresh
1. Vendor has pending KYC
2. Admin approves
3. Vendor clicks "Refresh Status" button on KYC page
4. Status badge changes to "Approved" (green)
5. All menu items unlock immediately

## Debugging

### Check if Session Refresh is Working
Open browser console on vendor KYC page. You should see:
```
✅ User session refreshed, KYC status: approved
```

### Check if vendorProfile is Populated
In browser console:
```javascript
// Get Redux state
JSON.parse(localStorage.getItem('persist:root'))

// Or check directly in React DevTools > Redux tab
state.auth.user.vendorProfile.kyc.status  // Should be 'approved'
```

### Check Backend Response
Make direct API call:
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Cookie: refreshToken=YOUR_REFRESH_TOKEN"
```

Should return:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Chinu",
    "email": "chinu2@gmail.com",
    "role": "vendor",
    "vendorProfile": {
      "_id": "...",
      "storeName": "Chinu's Store",
      "slug": "chinu-store",
      "status": "active",
      "kyc": {
        "status": "approved",
        "businessName": "Chinu Business",
        "businessType": "sole_proprietorship",
        // ... full kyc object
      }
    }
  }
}
```

## Expected Behavior After Fix

### For Vendors with Pending KYC
- ✅ Can access KYC page
- ✅ Can access Support page
- ❌ Cannot access Products, Orders, Analytics, etc.
- ✅ See "Refresh Status" button
- ✅ Status badge shows "Pending Review" (yellow)
- ✅ Click on locked items shows: "Waiting for approval. Contact us via Support for assistance."

### For Vendors with Approved KYC
- ✅ Can access ALL vendor dashboard pages
- ✅ Status badge shows "Approved" (green)
- ✅ No menu items are locked
- ✅ No toast messages about waiting for approval

### For Vendors with Rejected KYC
- ✅ Can access KYC page (to resubmit)
- ✅ Can access Support page
- ❌ Cannot access other vendor pages
- ✅ Status badge shows "Rejected" (red)
- ✅ Rejection reason displayed on KYC page

## Console Logs for Monitoring

The fix includes comprehensive console logging:

```javascript
// On component mount
"✅ User session refreshed, KYC status: approved"

// On window focus
"🔄 Window focused, refreshing user session..."
"✅ User session refreshed, KYC status: approved"

// On periodic refresh (every 30s)
"⏰ Periodic refresh (30s)..."
"✅ User session refreshed, KYC status: approved"

// On error
"❌ Failed to refresh user session: [error details]"
```

## Files Changed

1. ✅ **apps/api/src/controllers/authController.js**
   - Enhanced vendorProfile population in `/auth/me` endpoint

2. ✅ **apps/web/src/pages/dashboard/vendor/VendorKYC.jsx**
   - Added session refresh mechanisms (mount, focus, periodic)
   - Added manual "Refresh Status" button
   - Added loading states and toast notifications

## Rollback Plan

If issues occur, revert these changes:

```bash
git checkout HEAD -- apps/api/src/controllers/authController.js
git checkout HEAD -- apps/web/src/pages/dashboard/vendor/VendorKYC.jsx
```

## Future Enhancements

Consider adding:
1. **WebSocket notifications** for real-time approval updates
2. **Email notifications** when vendor is approved/rejected
3. **In-app notification bell** showing approval status change
4. **Banner message** on dashboard: "Your KYC has been approved! You can now access all features."

## Summary

This fix ensures vendor menu items automatically unlock after admin approval through:
1. ✅ Proper vendorProfile population in backend
2. ✅ Multiple session refresh mechanisms in frontend
3. ✅ Manual refresh button for immediate updates
4. ✅ Comprehensive logging for debugging
5. ✅ User-friendly loading states and feedback

Vendors no longer need to log out and log back in. The system automatically detects approval within 30 seconds or immediately when they click "Refresh Status" button.
