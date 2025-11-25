# Upgrade Button Display Fix

## Issue
The "Become a Vendor" and "Become an Affiliate" buttons were showing to ALL users, including admins, vendors, and affiliates who shouldn't see them.

## Solution Implemented

### 1. Customer Dashboard - Only Show for Customers ✅

**File:** `shop/apps/web/src/assets/pages/dashboard/customer/CustomerDashboard.jsx`

**Change:** Added role check to only show upgrade buttons for customers:

```javascript
{/* Only show for customers, not for admin/vendor/affiliate */}
{user?.role === 'customer' && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    {/* Become Vendor Button */}
    {/* Become Affiliate Button */}
  </div>
)}
```

**Result:**
- ✅ **Customer users** → See both upgrade buttons
- ❌ **Admin users** → Don't see upgrade buttons
- ❌ **Vendor users** → Don't see upgrade buttons (they already are vendors)
- ❌ **Affiliate users** → Don't see upgrade buttons (they already are affiliates)

---

### 2. Header - Only Show for Non-Logged-In Users ✅

**File:** `shop/apps/web/src/assets/components/layout/Header.jsx`

**Change:** Added authentication check to only show buttons for visitors who are NOT logged in:

```javascript
{/* Only show Become Vendor/Affiliate for non-logged in users */}
{!isAuthenticated && (
  <div className="ml-auto flex items-center gap-4">
    <Link to="/register?role=vendor">Become a Vendor</Link>
    <Link to="/register?role=affiliate">Become an Affiliate</Link>
  </div>
)}
```

**Applied to:**
- Desktop navigation menu
- Mobile navigation menu

**Result:**
- ✅ **Not logged in (visitors)** → See "Become Vendor" and "Become Affiliate" buttons in header
- ❌ **Logged in users (any role)** → Don't see these buttons in header

---

## User Flow Summary

### For New Visitors (Not Logged In)
1. Visit website → See "Become Vendor" and "Become Affiliate" in header
2. Click button → Go to registration page with role pre-selected
3. Register as Vendor or Affiliate → Account created with that role

### For Existing Customers
1. Login as customer → Header buttons disappear
2. Go to customer dashboard → See upgrade option cards
3. Click "Become Vendor" or "Become Affiliate"
4. Fill out application form
5. Submit → Profile created, awaiting admin approval

### For Admins/Vendors/Affiliates
1. Login → No upgrade buttons anywhere
2. Go to respective dashboards
3. No upgrade options shown (already have elevated roles)

---

## Files Modified

1. **CustomerDashboard.jsx** - Added role check for upgrade buttons
2. **Header.jsx** - Added authentication check for upgrade buttons (desktop + mobile)

---

## Testing

### Test Case 1: Customer User
- Login as `demo@example.com` / `Password123`
- ✅ Dashboard shows "Become Vendor" and "Become Affiliate" cards
- ✅ Header does NOT show these buttons

### Test Case 2: Admin User
- Login as `admin@example.com` / `Password123`
- ✅ Dashboard does NOT show upgrade cards
- ✅ Header does NOT show these buttons

### Test Case 3: Non-Logged-In Visitor
- Visit homepage without logging in
- ✅ Header shows "Become Vendor" and "Become Affiliate" buttons

---

## Additional Notes

- Vendor and affiliate users can access their respective dashboards
- The upgrade application pages still exist at:
  - `/dashboard/become-vendor`
  - `/dashboard/become-affiliate`
- These pages are protected routes (require login)
- Direct navigation attempts by admins/vendors/affiliates will show the form, but the backend API will reject duplicate applications
