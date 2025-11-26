# Role Switching Scenarios Analysis

**Date:** November 19, 2025
**Analysis Type:** Role Upgrade & Switching Capabilities
**Platform:** V-Tech E-commerce Multi-Role System

---

## 🎯 Overview

This document analyzes the **role switching scenarios** in the V-Tech E-commerce platform, specifically focusing on:
1. **Customer → Affiliate** switching
2. **Customer → Vendor** switching
3. **Affiliate → Admin** promotion (or any role → Admin)
4. **Multi-role scenarios** (e.g., user being both Vendor AND Affiliate)

---

## 📊 Current Implementation Status

### ✅ **Implemented Role Switches:**

#### 1. Customer → Vendor ✅
**Route:** `/dashboard/become-vendor`
**Component:** `BecomeVendor.jsx`
**Status:** **FULLY IMPLEMENTED**

**How it works:**
- Customer fills out vendor application form
- Provides business details, GST, bank info
- Admin reviews and approves
- User role switches to "vendor"
- Gains access to vendor dashboard

**Access:** Available from customer dashboard

---

#### 2. Customer → Affiliate ✅
**Route:** `/dashboard/become-affiliate`
**Component:** `BecomeAffiliate.jsx`
**Status:** **FULLY IMPLEMENTED**

**How it works:**
- Customer fills out affiliate application form
- Provides payment details (Bank/UPI/PayPal)
- Submits application via `/affiliates/apply` API
- Admin approval required
- User role switches to "affiliate"
- Gains access to affiliate dashboard

**Access:** Available from customer dashboard

**Benefits shown:**
- Earn up to 10% commission (should be 5-8% based on tiers)
- 30-day cookie tracking
- Real-time dashboard
- Monthly payouts

---

### ❌ **NOT Implemented:**

#### 3. Any Role → Admin ❌
**Status:** **NO IMPLEMENTATION FOUND**

**Current Situation:**
- No "Become Admin" page exists
- No application flow for admin role
- Admin role can only be set:
  - Manually in database
  - Via seed script
  - Through direct user manipulation

**Why this makes sense:**
- Admin is a **platform management role**, not a public role
- Admins are **hired employees**, not applicants
- Security risk if anyone can apply to be admin

**Recommendation:** ✅ **Keep as-is** - Admin should NOT be available for public application

---

#### 4. Multi-Role Support ❓
**Status:** **UNCLEAR - NEEDS INVESTIGATION**

**Question:** Can a user be BOTH Vendor AND Affiliate simultaneously?

**Current Model Analysis:**
```javascript
// User schema has single role field
{
  role: {
    type: String,
    enum: ['customer', 'vendor', 'affiliate', 'support', 'admin'],
    default: 'customer'
  }
}
```

**Observation:** User can only have **ONE role** at a time

**Potential Scenarios:**
1. **Vendor wants to also be Affiliate:**
   - Currently: NOT POSSIBLE (single role field)
   - Real-world: Vendor might want to promote OTHER vendors' products as affiliate

2. **Affiliate wants to also sell as Vendor:**
   - Currently: NOT POSSIBLE
   - Would need to choose one role or the other

**Impact:** Users must choose between being Vendor OR Affiliate (cannot be both)

---

## 🔍 Detailed Analysis by Scenario

### Scenario 1: Affiliate → Vendor Switching

**Current State:** ❌ NOT EXPLICITLY SUPPORTED

**What happens if Affiliate applies to become Vendor?**

**Analysis:**
```javascript
// BecomeVendor.jsx makes API call to /vendors/apply
// BecomeAffiliate.jsx makes API call to /affiliates/apply

// If an affiliate user visits /dashboard/become-vendor:
// - Can access the page (no role restriction)
// - Fills out vendor application
// - Submits application
// - Role would switch from "affiliate" to "vendor"
// - LOSES access to affiliate dashboard
// - LOSES all affiliate commissions/tracking
```

**Issue:** User loses their affiliate status completely

**User expectation:** "I want to be BOTH vendor and affiliate"

**Reality:** Platform only supports single role

---

### Scenario 2: Vendor → Affiliate Switching

**Current State:** ❌ NOT EXPLICITLY SUPPORTED

**What happens if Vendor applies to become Affiliate?**

**Same issue as above:**
- Vendor can access `/dashboard/become-affiliate`
- Can submit affiliate application
- Role switches to "affiliate"
- **LOSES all vendor data:**
  - Product listings
  - Order history
  - Settlements
  - Sponsored ads campaigns

**Critical Problem:** Destructive role change

---

### Scenario 3: Customer Wants to Be BOTH Vendor AND Affiliate

**Current State:** ❌ NOT SUPPORTED

**What customer wants:**
1. Sell own products as vendor (earn 85% of sales)
2. Promote OTHER vendors' products as affiliate (earn 5-8% commission)

**What currently happens:**
- Must choose ONE role
- Can switch between roles (but loses data from previous role)

**Business Impact:**
- Lost opportunity for power users
- Reduces platform revenue (fewer affiliates promoting products)
- Poor user experience

---

## 🚨 Critical Issues Identified

### Issue 1: Destructive Role Switching ⚠️

**Problem:**
When user switches from Vendor → Affiliate or Affiliate → Vendor, they lose access to their previous role's data and dashboard.

**Example:**
```
User Journey:
1. Customer applies to be Affiliate (approved)
2. Builds up ₹50,000 in pending commissions
3. Decides to also sell products, applies to be Vendor
4. Role switches to "vendor"
5. ❌ Can no longer access affiliate dashboard
6. ❌ Pending commissions potentially lost
7. ❌ Affiliate links stop working (user no longer affiliate role)
```

**Severity:** HIGH

---

### Issue 2: No Multi-Role Support ⚠️

**Problem:**
Platform doesn't support users having multiple roles simultaneously.

**Real-world use case:**
- Amazon sellers often promote OTHER sellers' products via Amazon Associates
- Etsy sellers can be affiliates for Etsy
- Most platforms allow vendor + affiliate roles

**Severity:** MEDIUM (feature gap, not a bug)

---

### Issue 3: No Admin Application Prevention ✅

**Status:** Actually GOOD!

Admin role has no public application path, which is correct security practice.

**Recommendation:** Keep as-is, document as intentional

---

## 💡 Recommendations

### **Option A: Implement Multi-Role System** (Recommended)

**Change user model:**
```javascript
// Instead of single role:
role: String

// Use role array:
roles: [{
  type: String,
  enum: ['customer', 'vendor', 'affiliate', 'support', 'admin']
}]

// User can have multiple roles:
roles: ['customer', 'vendor', 'affiliate']
```

**Benefits:**
- Users can be BOTH vendor AND affiliate
- No data loss when adding new role
- Matches real-world business models
- Increases platform engagement

**Effort:** HIGH (requires database migration, auth middleware changes, dashboard routing updates)

---

### **Option B: Add Role Switching Confirmation** (Quick Fix)

**Implement confirmation modal when switching roles:**

```javascript
// In BecomeVendor.jsx and BecomeAffiliate.jsx

// If user already has vendor or affiliate role:
if (currentUser.role === 'vendor') {
  showWarning(
    'You are currently a Vendor. Switching to Affiliate will disable ' +
    'your vendor account and you will lose access to your products, ' +
    'orders, and settlements. Are you sure?'
  );
}
```

**Benefits:**
- Prevents accidental data loss
- Clear user expectations
- Low implementation effort

**Effort:** LOW

---

### **Option C: Prevent Role Switching (Locked Roles)** (Simple)

**Block users from switching once they've chosen a role:**

```javascript
// In BecomeVendor.jsx
if (currentUser.role === 'affiliate') {
  return (
    <div className="alert alert-warning">
      You are already an Affiliate. To become a Vendor, please contact
      support at ledvtech@gmail.com to discuss your options.
    </div>
  );
}
```

**Benefits:**
- Prevents data loss
- Forces users to make intentional decision
- Easy to implement

**Drawbacks:**
- Poor user experience
- Requires manual admin intervention

**Effort:** LOW

---

## 📋 Implementation Priority

### **Immediate (Do Now):**

1. ✅ **Add Warning to Become Vendor/Affiliate Pages**
   - Show alert if user already has vendor/affiliate role
   - Explain consequences of role switching
   - Require explicit confirmation

2. ✅ **Update FAQ with Role Switching Info**
   - Add question: "Can I be both a Vendor and Affiliate?"
   - Answer: "Currently, you can only have one role. Choose carefully..."

3. ✅ **Document Admin Role in Quick Reference**
   - Clarify admin is NOT a public role
   - Explain admin accounts are created by platform owners only

---

### **Short Term (Next Sprint):**

4. **Add Role Switching API Validation**
   - Backend check: "User is vendor, applying for affiliate"
   - Require `confirmRoleSwitch: true` parameter
   - Return warning message if role switch detected

5. **Create Role Switch Confirmation Modal**
   - Reusable component
   - Shows what will be lost
   - Requires checkbox confirmation + button click

---

### **Long Term (Future Enhancement):**

6. **Implement Multi-Role System**
   - Database migration: `role` → `roles[]`
   - Update auth middleware to check array
   - Update dashboard routing to show all role dashboards
   - Create role switcher in header (like Gmail account switcher)

---

## 🎨 UI/UX Recommendations

### **Scenario: User Already Has Role**

**Current Experience:**
- User clicks "Become Vendor" from affiliate dashboard
- Sees vendor application form
- Fills it out
- ❌ No warning about losing affiliate status

**Recommended Experience:**

**Step 1:** Show warning banner at top of form
```jsx
{currentUser.role === 'affiliate' && (
  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
      <div>
        <h3 className="font-bold text-yellow-900 mb-2">
          ⚠️ Important: Role Switching Warning
        </h3>
        <p className="text-yellow-800 mb-3">
          You are currently an <strong>Affiliate</strong>. Applying to become
          a Vendor will <strong>replace your Affiliate role</strong> and you will:
        </p>
        <ul className="space-y-1 text-yellow-800 text-sm">
          <li>❌ Lose access to your Affiliate Dashboard</li>
          <li>❌ Lose all pending affiliate commissions</li>
          <li>❌ Have all your affiliate links deactivated</li>
          <li>❌ Lose your affiliate performance history</li>
        </ul>
        <p className="text-yellow-900 font-semibold mt-3">
          Please contact support at ledvtech@gmail.com if you want to be
          BOTH a Vendor and an Affiliate.
        </p>
      </div>
    </div>
  </div>
)}
```

**Step 2:** Add confirmation checkbox before submit
```jsx
{currentUser.role === 'affiliate' && (
  <div className="bg-red-50 border border-red-300 rounded p-4 mb-4">
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={confirmRoleSwitch}
        onChange={(e) => setConfirmRoleSwitch(e.target.checked)}
        className="mt-1"
        required
      />
      <span className="text-sm text-red-900">
        I understand that I will <strong>lose my Affiliate role</strong> and
        all associated data if I proceed with this Vendor application.
      </span>
    </label>
  </div>
)}

<Button
  type="submit"
  disabled={currentUser.role === 'affiliate' && !confirmRoleSwitch}
>
  Submit Vendor Application
</Button>
```

---

## 📊 Role Matrix: Current vs Recommended

| From Role | To Role | Current Support | Recommended | Notes |
|-----------|---------|----------------|-------------|-------|
| **Customer** → Vendor | ✅ Yes | ✅ Yes | Keep as-is | Working well |
| **Customer** → Affiliate | ✅ Yes | ✅ Yes | Keep as-is | Working well |
| **Customer** → Admin | ❌ No | ❌ No | Admin = employees only |
| **Vendor** → Affiliate | ⚠️ Destructive | ⚠️ Add warning | Loses vendor data |
| **Affiliate** → Vendor | ⚠️ Destructive | ⚠️ Add warning | Loses affiliate data |
| **Vendor** + Affiliate | ❌ Not possible | ✅ Future feature | Multi-role support |
| **Any Role** → Admin | ❌ No | ❌ No | Security: Admin = manual only |

---

## 🔧 Code Changes Required (Immediate)

### 1. Update BecomeVendor.jsx

Add role switching warning:

```jsx
// After imports
import { AlertTriangle } from 'lucide-react';
import { useSelector } from 'react-redux';

// In component
const { user } = useSelector(state => state.auth);
const [confirmRoleSwitch, setConfirmRoleSwitch] = useState(false);

// Before the form benefits section, add:
{(user.role === 'affiliate' || user.role === 'support') && (
  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
    {/* Warning content from UI recommendations above */}
  </div>
)}

// Before submit button, add:
{(user.role === 'affiliate' || user.role === 'support') && (
  <div className="bg-red-50 border border-red-300 rounded p-4 mb-4">
    {/* Confirmation checkbox from above */}
  </div>
)}

// Update submit button:
<Button
  type="submit"
  variant="primary"
  loading={applyMutation.isPending}
  disabled={(user.role === 'affiliate' || user.role === 'support') && !confirmRoleSwitch}
>
  Submit Vendor Application
</Button>
```

---

### 2. Update BecomeAffiliate.jsx

Same warning system for users switching FROM vendor TO affiliate.

---

### 3. Update FAQ.jsx

Add new question in "Vendor & Affiliate" category:

```jsx
{
  q: 'Can I be both a Vendor and an Affiliate?',
  a: 'Currently, you can only have one role at a time (either Vendor OR Affiliate). If you switch roles, you will lose access to your previous role\'s dashboard and data. We recommend choosing the role that best fits your business model. Contact support at ledvtech@gmail.com if you need both roles simultaneously.'
},
{
  q: 'What happens if I switch from Affiliate to Vendor (or vice versa)?',
  a: 'Switching roles will replace your current role completely. For example, if you\'re an Affiliate and apply to become a Vendor, you will lose access to your Affiliate Dashboard, pending commissions, and affiliate links. The platform currently supports one role per user. Please contact support before switching roles to discuss your options.'
},
```

---

### 4. Add to Admin Quick Reference

In the "User Management" section:

```jsx
<div className="bg-orange-50 border border-orange-200 rounded-lg p-5 mt-4">
  <h4 className="font-semibold text-orange-900 mb-2">Role Switching</h4>
  <ul className="space-y-2 text-sm text-orange-800">
    <li>• Users can only have ONE role at a time</li>
    <li>• Switching roles is DESTRUCTIVE (loses previous role data)</li>
    <li>• If user wants multiple roles, must be manually configured</li>
    <li>• Admin role should NEVER be granted via application</li>
    <li>• Contact dev team for multi-role requests</li>
  </ul>
</div>
```

---

## 🎯 Success Criteria

### Immediate Implementation Success:
- ✅ No user accidentally loses data due to role switching
- ✅ Clear warnings shown before role switch
- ✅ Confirmation required for destructive actions
- ✅ FAQ addresses role switching questions

### Future Enhancement Success:
- ✅ Users can be both Vendor AND Affiliate
- ✅ Role switcher in dashboard header
- ✅ Seamless navigation between role dashboards
- ✅ No data loss when adding new role

---

## 🚀 Next Steps

### **Phase 1: Immediate Protection** (This Session)
1. Add role switching warnings to BecomeVendor.jsx
2. Add role switching warnings to BecomeAffiliate.jsx
3. Update FAQ with role switching questions
4. Update Admin Quick Reference with role switching notes

### **Phase 2: Backend Validation** (Next Sprint)
1. Add API validation for role switching
2. Require explicit confirmation parameter
3. Log all role switches for audit

### **Phase 3: Multi-Role Support** (Future)
1. Database migration plan
2. Auth middleware updates
3. Dashboard routing changes
4. Role switcher UI component

---

## 📞 Support Information

**For users asking about role switching:**
- Email: ledvtech@gmail.com
- Phone: +91 99445 56683
- Response: "We currently support one role per user. Let's discuss your specific needs."

**For developers implementing multi-role:**
- Review auth middleware: `apps/api/src/middleware/auth.js`
- Update User model: `apps/api/src/models/User.js`
- Update dashboard routing: `apps/web/src/App.jsx`

---

## 📝 Conclusion

**Current State:**
- ✅ Customer → Vendor works
- ✅ Customer → Affiliate works
- ❌ Multi-role NOT supported
- ⚠️ Role switching is destructive (data loss)

**Recommended Actions:**
1. **Immediate:** Add warnings to prevent accidental data loss
2. **Short-term:** Add backend validation and confirmation flow
3. **Long-term:** Implement multi-role system for power users

**Security Note:**
- Admin role should NEVER be publicly available
- Current implementation (no admin application) is correct
- Document this as intentional design decision

---

**Analysis Date:** November 19, 2025
**Analyzed By:** Claude (AI Assistant)
**Status:** ⚠️ CRITICAL ISSUES IDENTIFIED - Immediate Action Required
**Priority:** HIGH

---

*End of Role Switching Analysis*
