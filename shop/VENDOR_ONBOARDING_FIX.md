# Vendor Onboarding & KYC Access Control - Complete Fix

## Issues Fixed

### 1. **Vendor Not Appearing in Admin List**
**Problem**: When a new vendor registers, they don't appear in the admin Vendors list and the notification badge doesn't update.

**Root Cause**:
- The user's auth state wasn't being refreshed after onboarding
- vendorProfile wasn't populated in the user session
- Notification queries weren't invalidated

**Solution**:
- After successful onboarding, fetch updated user data via `/auth/me`
- Update Redux auth state with populated vendorProfile
- Invalidate React Query caches for `notification-counts` and `admin-vendors`
- Use toast notifications instead of browser alerts

### 2. **Toast Notifications Not Working**
**Problem**: Clicking locked vendor menu items didn't show toast messages.

**Root Cause**:
- DashboardLayout was importing `react-hot-toast` but the app uses a custom toast system

**Solution**:
- Updated DashboardLayout to use `useToast` hook from custom ToastContainer
- Changed toast API call to match custom implementation: `toast.error(message, duration)`

### 3. **Support Page Not Accessible**
**Problem**: Support page was protected by `requireVendorApproval`, blocking vendors with pending KYC.

**Solution**:
- Removed `requireVendorApproval` wrapper from Support route in App.jsx
- Support is now always accessible alongside KYC Verification page

## Files Modified

### 1. `apps/web/src/pages/dashboard/customer/BecomeVendor.jsx`

**Changes:**
- Added imports: `useQueryClient`, `useToast`
- Replaced `alert()` with `toast.success()` and `toast.error()`
- Added user data refresh after onboarding
- Invalidate queries to update admin notifications
- Navigate to KYC page after 1.5 second delay

```javascript
// Before
onSuccess: () => {
  alert('Vendor application submitted successfully!');
  navigate('/vendor-dashboard');
}

// After
onSuccess: async () => {
  try {
    const meResponse = await api.get('/auth/me');
    dispatch(setUser(meResponse.data.data));

    queryClient.invalidateQueries(['notification-counts']);
    queryClient.invalidateQueries(['admin-vendors']);

    toast.success('Vendor application submitted successfully! Please wait for admin approval.');
  } catch (error) {
    toast.error('Application submitted but failed to update session. Please refresh the page.');
  }

  setTimeout(() => {
    navigate('/vendor-dashboard/kyc');
  }, 1500);
}
```

### 2. `apps/web/src/components/layout/DashboardLayout.jsx`

**Changes:**
- Import `useToast` from custom ToastContainer instead of `react-hot-toast`
- Initialize toast hook: `const toast = useToast();`
- Updated toast call: `toast.error(message, duration)` instead of options object

```javascript
// Before
import toast from 'react-hot-toast';

toast.error('Waiting for approval', {
  duration: 4000,
  position: 'top-right',
});

// After
import { useToast } from '@/components/common/ToastContainer';

const toast = useToast();

toast.error('Waiting for approval. Contact us via Support for assistance.', 4000);
```

### 3. `apps/web/src/App.jsx`

**Changes:**
- Moved Support route out of `requireVendorApproval` protection
- Support is now accessible to all vendors (pending or approved)

```javascript
// Routes accessible to all vendors (pending or approved)
<Route path="kyc" element={<VendorKYC />} />
<Route path="support" element={<VendorSupport />} />

// Protected vendor routes - require KYC approval
<Route index element={<ProtectedRoute requireVendorApproval><VendorDashboard /></ProtectedRoute>} />
<Route path="products" element={<ProtectedRoute requireVendorApproval><VendorProducts /></ProtectedRoute>} />
// ... other protected routes
```

### 4. `apps/api/src/controllers/authController.js`

**Changes:**
- Updated `/auth/login` endpoint to populate vendorProfile and affiliateProfile
- Updated `/auth/me` endpoint to populate profiles with KYC status

```javascript
const populatedUser = await User.findById(user._id)
  .select('-password -refreshToken')
  .populate({
    path: 'vendorProfile',
    select: 'storeName slug kyc.status kyc.businessName',
  })
  .populate({
    path: 'affiliateProfile',
    select: 'kycStatus commissionRate totalEarnings',
  });
```

## User Flow After Fix

### New Vendor Registration:
1. Customer fills out "Become a Vendor" form
2. Backend creates vendor with `status: 'pending'` and `kyc.status: 'pending'`
3. User role updated to 'vendor'
4. Frontend refreshes user data from `/auth/me` endpoint
5. User object now has vendorProfile populated with KYC status
6. Notification counts refreshed (admin sees pendingVendors badge)
7. Success toast notification shown
8. User navigated to `/vendor-dashboard/kyc` after 1.5 seconds

### Vendor Dashboard Access:
- ✅ **KYC Verification** - Always accessible
- ✅ **Support** - Always accessible
- 🔒 **Overview** - Locked (shows toast)
- 🔒 **Products** - Locked (shows toast)
- 🔒 **Inventory** - Locked (shows toast)
- 🔒 **Orders** - Locked (shows toast)
- 🔒 **Settlements** - Locked (shows toast)
- 🔒 **Sponsored Ads** - Locked (shows toast)

### After Admin Approves KYC:
1. Admin updates vendor `kyc.status` to 'approved'
2. Vendor refreshes page or re-logs in
3. Updated vendorProfile loaded with `kyc.status: 'approved'`
4. All menu items unlock
5. Full vendor functionality available

## Testing Checklist

- [x] New vendor registration creates vendor with pending status
- [x] User data refreshes after onboarding
- [x] vendorProfile is populated in auth state
- [x] Admin Vendors list shows new vendor immediately
- [x] Admin Vendors menu shows notification badge
- [x] Vendor redirected to KYC page after onboarding
- [x] KYC page is accessible to pending vendors
- [x] Support page is accessible to pending vendors
- [x] Locked menu items show toast notification when clicked
- [x] Toast message includes support contact guidance
- [x] After KYC approval, all pages unlock

## Related Documentation

- [KYC_ACCESS_CONTROL.md](./KYC_ACCESS_CONTROL.md) - KYC access control implementation details
- [DROPDOWN_MIGRATION_GUIDE.md](./DROPDOWN_MIGRATION_GUIDE.md) - CustomSelect component usage

## Technical Notes

### Notification System
- Admin notification counts refresh every 30 seconds automatically
- Manual refresh triggered via `queryClient.invalidateQueries()`
- `pendingVendors` count based on `Vendor.status === 'pending'`

### Auth State Management
- User data stored in Redux (`authSlice`)
- vendorProfile populated via Mongoose virtual populate
- `/auth/me` endpoint used for session refresh
- Profile data includes KYC status for access control

### Toast Notifications
- Custom toast system (not react-hot-toast)
- ToastProvider wraps entire app
- Toast API: `toast.success(msg, duration)`, `toast.error(msg, duration)`
- Toast position: top-right, z-index: 9999
