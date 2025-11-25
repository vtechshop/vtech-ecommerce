# KYC Access Control Implementation

## Overview
Implemented vendor access control based on KYC verification status. New vendors with pending/rejected KYC can only access KYC Verification and Support pages. All other dashboard pages are locked until KYC is approved.

## Features

### 1. **Menu Item Locking**
- Vendors with `kyc.status !== 'approved'` see locked menu items
- Visual indicators:
  - Grayed out text (opacity: 60%)
  - Lock icon next to menu label
  - Cursor: not-allowed
- Clicking locked items shows toast: "Waiting for approval"

### 2. **Always Accessible Pages**
- **KYC Verification** (`/vendor-dashboard/kyc`)
- **Support** (`/vendor-dashboard/support`)

### 3. **Locked Pages (until KYC approved)**
- Overview
- Products
- Inventory
- Orders
- Settlements
- Sponsored Ads

## Technical Implementation

### Backend Changes

#### 1. Auth Controller (`apps/api/src/controllers/authController.js`)

**Login Endpoint** - Now populates vendor and affiliate profiles:
```javascript
// Populate vendor and affiliate profiles for role-based access control
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

return res.json({
  success: true,
  data: {
    user: populatedUser,
    accessToken,
  },
});
```

**Me Endpoint** - Also populates profiles:
```javascript
const user = await User.findById(req.user._id)
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

### Frontend Changes

#### 1. Dashboard Layout (`apps/web/src/components/layout/DashboardLayout.jsx`)

**Added Functions:**
```javascript
// Check if vendor's KYC is approved
const isVendorKYCApproved = () => {
  if (!isVendor || !user?.vendorProfile) return false;
  return user.vendorProfile.kyc?.status === 'approved';
};

// Check if a menu item should be locked
const isMenuItemLocked = (path) => {
  if (!isVendor || isVendorKYCApproved()) return false;

  // KYC and Support are always accessible
  if (path.includes('/kyc') || path.includes('/support')) return false;

  // All other vendor pages are locked
  return true;
};

// Handle click on locked menu item
const handleNavItemClick = (e, item) => {
  if (isMenuItemLocked(item.path)) {
    e.preventDefault();
    toast.error('Waiting for approval', {
      duration: 3000,
      position: 'top-right',
    });
  }
};
```

**Updated Navigation Rendering:**
```javascript
{navItems.map((item) => {
  const notificationCount = getNotificationCount(item.path);
  const isLocked = isMenuItemLocked(item.path);
  return (
    <Link
      key={item.path}
      to={item.path}
      onClick={(e) => handleNavItemClick(e, item)}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative ${
        location.pathname === item.path
          ? 'bg-primary-600 text-white shadow-lg'
          : isLocked
            ? 'text-gray-500 hover:bg-dark-400 hover:text-gray-400 cursor-not-allowed opacity-60'
            : 'text-gray-300 hover:bg-dark-400 hover:text-white'
      }`}
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {getIcon(item.icon)}
      </svg>
      {sidebarOpen && (
        <span className="font-medium flex items-center gap-2">
          {item.label}
          {isLocked && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </span>
      )}
      {!isLocked && notificationCount > 0 && (
        <NotificationBadge
          count={notificationCount}
          variant="red"
          className={sidebarOpen ? 'ml-auto' : 'absolute -top-1 -right-1'}
        />
      )}
    </Link>
  );
})}
```

## Data Model

### Vendor Model (`apps/api/src/models/Vendor.js`)

KYC status field:
```javascript
kyc: {
  // ... other fields
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
}
```

## User Flow

### New Vendor Registration
1. User registers as vendor → `kyc.status = 'pending'`
2. Vendor logs in → receives populated `vendorProfile` with `kyc.status`
3. Dashboard loads → only KYC and Support accessible
4. Clicking other menu items → "Waiting for approval" toast

### After KYC Approval
1. Admin approves KYC → `kyc.status = 'approved'`
2. Vendor refreshes/re-logs in → updated status loaded
3. Dashboard loads → all menu items unlocked
4. Full vendor functionality available

## Testing

### Manual Testing Steps
1. Create a new vendor account
2. Log in and verify only KYC and Support are accessible
3. Click on Products, Orders, etc. → Should show toast
4. Complete KYC verification form
5. As admin, approve the KYC
6. Re-login as vendor
7. Verify all menu items are now accessible

### Edge Cases Covered
- ✅ Vendor with no vendorProfile (returns false from isVendorKYCApproved)
- ✅ Vendor with undefined kyc object
- ✅ Vendor with null kyc.status
- ✅ Non-vendor users (customers, affiliates, admin) - no restrictions
- ✅ Sidebar collapsed state - lock icon hidden, functionality preserved

## Security Notes

- Access control is enforced on both frontend (UX) and should be on backend (API routes)
- Frontend blocking prevents navigation, but backend should also verify KYC status
- Consider adding middleware to protect vendor routes: `requireApprovedKYC`

## Future Enhancements

1. **Backend Route Protection**
   ```javascript
   // Middleware example
   const requireApprovedKYC = async (req, res, next) => {
     const vendor = await Vendor.findOne({ userId: req.user._id });
     if (vendor?.kyc?.status !== 'approved') {
       return res.status(403).json({
         success: false,
         error: { code: 'KYC_NOT_APPROVED', message: 'KYC verification required' }
       });
     }
     next();
   };
   ```

2. **Progressive Disclosure**
   - Show KYC progress percentage in locked menu items
   - Add tooltip explaining why items are locked

3. **Notification System**
   - Email vendor when KYC is approved/rejected
   - In-app notification badge on KYC menu item

## Files Modified

1. `apps/api/src/controllers/authController.js` - Login and Me endpoints
2. `apps/web/src/components/layout/DashboardLayout.jsx` - Menu locking logic
3. `apps/web/src/assets/pages/dashboard/vendor/VendorKYC.jsx` - Business Type dropdown migrated to CustomSelect

## Related Documentation
- [DROPDOWN_MIGRATION_GUIDE.md](./DROPDOWN_MIGRATION_GUIDE.md) - CustomSelect component usage
- Vendor model schema in `apps/api/src/models/Vendor.js`
