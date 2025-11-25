# Dropdown Migration Guide

## Issue
Native HTML `<select>` elements have very limited styling capabilities. Browsers don't allow full control over the dropdown menu appearance, especially the highlighted/selected option colors.

## Solution
Use the **CustomSelect** component for all dropdowns.

## Already Migrated ✅
- Blog.jsx - Category & Type filters
- Support Tickets - Priority filter
- Contact Submissions (already using CustomSelect)

## Files That Still Need Migration

Based on grep search, these files contain `<select>` elements:

### Checkout & Forms
- `components/checkout/AddressStep.jsx`
- `components/checkout/ShippingForm.jsx`
- `pages/Checkout.jsx` (2 selects)

### Admin Dashboard
- `pages/dashboard/admin/AdsManagement.jsx` (8 selects)
- `pages/dashboard/admin/BlogManagement.jsx` (5+ selects)
- `pages/dashboard/admin/Categories.jsx`
- `pages/dashboard/admin/CMSManagement.jsx`
- `pages/dashboard/admin/CRMTickets.jsx`
- `pages/dashboard/admin/Orders.jsx`
- `pages/dashboard/admin/Products.jsx` (3 selects)
- `pages/dashboard/admin/Settings.jsx` (3 selects)
- `pages/dashboard/admin/Users.jsx`

### Vendor Dashboard
- `pages/dashboard/vendor/Products.jsx` - Schema Type selector

### Affiliate Dashboard
- `pages/dashboard/affiliate/AffiliateKYC.jsx`
- `pages/dashboard/affiliate/AllProductLinks.jsx`
- `pages/dashboard/affiliate/Support.jsx`

### Customer Dashboard
- `pages/dashboard/customer/BecomeAffiliate.jsx`
- `pages/dashboard/customer/BecomeVendor.jsx`

## How to Migrate

### 1. Import CustomSelect
```jsx
import CustomSelect from '@/components/common/CustomSelect';
```

### 2. Convert native select to CustomSelect

**Before:**
```jsx
<select
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  className="input w-full"
>
  <option value="">All Categories</option>
  <option value="tech">Tech News</option>
  <option value="reviews">Product Reviews</option>
</select>
```

**After:**
```jsx
<CustomSelect
  value={category}
  onChange={(value) => setCategory(value)}
  options={[
    { value: '', label: 'All Categories' },
    { value: 'tech', label: 'Tech News' },
    { value: 'reviews', label: 'Product Reviews' }
  ]}
  placeholder="All Categories"
  className="w-full"
/>
```

### 3. Key Differences
- `onChange` receives the value directly (not an event object)
- Options are passed as an array of objects with `value` and `label`
- Optional props: `size`, `disabled`, `error`

## Benefits of CustomSelect
✅ Full styling control
✅ Professional appearance
✅ Checkmark for selected item
✅ Smooth animations
✅ Consistent across all browsers
✅ Better accessibility
✅ Blue theme (modern look)

## Temporary Workaround
The global CSS in `index.css` attempts to style native selects with:
- White backgrounds (removing yellow/amber)
- Blue text for selected items
- Better hover states

But this has **limited browser support**. For the best UX, migrate to CustomSelect.
