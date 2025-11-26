# Affiliate Commission Flow - Complete Scenario

## ✅ YES - The System Automatically Creates Affiliate Commissions

When a customer clicks an affiliate link and buys a product, **the admin does NOT need to manually give commission to the affiliate**. The system **automatically creates a commission record** when the order is placed.

---

## How It Works - Step by Step

### 1. **Customer Clicks Affiliate Link**

When a customer clicks an affiliate link (e.g., `https://yoursite.com?ref=JOHN123`), the frontend stores the affiliate code in a cookie:

**Cookie Name:** `affiliate`
**Cookie Value:** The affiliate code (e.g., `JOHN123`)
**Duration:** Typically 30-90 days (cookie expiration)

### 2. **Customer Browses and Adds Products to Cart**

The affiliate cookie persists while the customer:
- Browses products
- Adds items to cart
- Views different pages
- Logs in or checks out as guest

### 3. **Customer Completes Purchase**

When the order is created, the backend checks for the affiliate cookie:

**Location:** [orderController.js:277-314](Ecommerce/shop/apps/api/src/controllers/orderController.js:277-314)

```javascript
// Track affiliate conversion (if applicable)
const affiliateCookie = req.cookies?.affiliate;
if (affiliateCookie) {
  const Affiliate = require('../models/Affiliate');
  const affiliate = await Affiliate.findOne({ code: affiliateCookie });

  if (affiliate) {
    // Calculate affiliate commission based on product-level settings
    let totalAffiliateCommission = 0;

    for (const item of orderItems) {
      const product = await Product.findById(item.productId);

      // Priority: Product-level commission > Affiliate default commission > System default (5%)
      const commissionPercentage = product.affiliateCommissionPercentage !== undefined && product.affiliateCommissionPercentage !== null
        ? product.affiliateCommissionPercentage
        : (affiliate.commissionPercentage || 5);

      const itemTotal = item.priceSnapshot * item.qty;
      const itemCommission = (itemTotal * commissionPercentage) / 100;
      totalAffiliateCommission += itemCommission;
    }

    await Commission.create({
      type: 'affiliate',
      subjectId: affiliate._id,
      subjectModel: 'Affiliate',
      orderId: order._id,
      amount: totalAffiliateCommission,
      percentage: affiliate.commissionPercentage,
      status: 'pending',
    });

    affiliate.totalConversions += 1;
    affiliate.pendingEarnings += totalAffiliateCommission;
    await affiliate.save();
  }
}
```

### 4. **Commission Record Created Automatically**

A `Commission` record is created with:
- **Type:** `affiliate`
- **SubjectId:** The affiliate's ID
- **OrderId:** The order ID
- **Amount:** Calculated commission amount
- **Percentage:** Commission rate used
- **Status:** `pending` (waiting for admin approval)

### 5. **Affiliate Stats Updated**

The affiliate's stats are automatically updated:
- **totalConversions:** Incremented by 1
- **pendingEarnings:** Increased by commission amount

---

## Commission Calculation Priority

The system uses this priority for calculating commission percentage:

1. **Product-Level Commission** (highest priority)
   - Set in `product.affiliateCommissionPercentage`
   - Example: A specific product can have 10% affiliate commission

2. **Affiliate Default Commission** (medium priority)
   - Set in `affiliate.commissionPercentage`
   - Example: An affiliate might have a custom 7% rate

3. **System Default Commission** (lowest priority)
   - **5%** if no other rate is set

### Example Calculation:

**Scenario:**
- Customer buys 2 products
- Product A: Price ₹1,000, Qty: 1, Affiliate commission: 10% (product-level)
- Product B: Price ₹500, Qty: 2, No product-level commission set

**Affiliate Details:**
- Default commission: 7%

**Calculation:**
- Product A commission: ₹1,000 × 10% = ₹100
- Product B commission: ₹500 × 2 × 7% = ₹70
- **Total affiliate commission: ₹170**

---

## Admin's Role - Approval Workflow

### What the Admin DOES:

1. **Review Commission** - Admin can see pending commissions in the Affiliate Commissions page
2. **Approve/Reject** - Admin can approve or reject the commission
3. **Pay Commission** - After approval, admin marks it as paid when payment is transferred

### What the Admin DOES NOT Need to Do:

❌ Manually create commission records
❌ Manually calculate commission amounts
❌ Track which orders came from affiliates

---

## Commission Status Flow

```
PENDING → [Admin Reviews] → APPROVED/REJECTED

If APPROVED:
  → [Admin Processes Payment] → PAID
```

### Status Meanings:

1. **pending** - Automatically created when order is placed, waiting for admin review
2. **approved** - Admin approved the commission, ready for payment (Note: Currently the system creates commissions in 'pending' status, not 'approved')
3. **paid** - Admin marked as paid, money transferred to affiliate
4. **cancelled** - Admin rejected the commission

---

## Where Admin Manages Commissions

### Admin Dashboard → Affiliate Commissions

**URL:** `/admin-dashboard/affiliate-commissions`

**Features:**
- View all affiliate commissions
- Filter by status (all/pending/paid/cancelled)
- See statistics (total, pending, paid amounts)
- Approve/pay individual commissions
- Pay all pending commissions in bulk
- Export to CSV

---

## Current Implementation Status

### ✅ What's Working:

1. **Automatic Commission Creation** - System creates commission when order is placed
2. **Cookie Tracking** - Affiliate code stored in cookie
3. **Commission Calculation** - Smart calculation with product/affiliate/system priority
4. **Affiliate Stats** - Automatic updates to conversions and earnings
5. **Admin Interface** - Full commission management UI

### ⚠️ Important Notes:

**Commission Status:** Currently, affiliate commissions are created with **`pending`** status and need admin approval before payment. This is different from vendor commissions which might have a different workflow.

**Payment Processing:** The system marks commissions as "paid" but doesn't automatically transfer money. Admin must:
1. Review pending commissions
2. Approve them (or they might start as approved)
3. Transfer money externally (bank transfer, PayPal, etc.)
4. Mark as paid in the system

---

## Example Real-World Scenario

### Scenario: John is an affiliate marketer

**Day 1 - 10:00 AM:**
- John shares his affiliate link: `https://vtech.com?ref=JOHN123`
- Sarah clicks the link
- Browser stores cookie: `affiliate=JOHN123`

**Day 1 - 10:30 AM:**
- Sarah browses products
- Adds "Banana Slicer" (₹22,000) to cart
- Cookie still active

**Day 1 - 11:00 AM:**
- Sarah completes checkout
- Order #ORD-12345 created

**What Happens Automatically:**

1. ✅ System reads cookie `affiliate=JOHN123`
2. ✅ Finds John's affiliate account
3. ✅ Calculates commission: ₹22,000 × 5% = ₹1,100
4. ✅ Creates commission record:
   ```javascript
   {
     type: 'affiliate',
     subjectId: John's ID,
     orderId: ORD-12345,
     amount: 1100,
     percentage: 5,
     status: 'pending'
   }
   ```
5. ✅ Updates John's stats:
   - totalConversions: +1
   - pendingEarnings: +₹1,100

**Admin's Task:**
1. Go to Affiliate Commissions page
2. See pending commission for ₹1,100
3. Review and approve
4. Transfer ₹1,100 to John's bank account
5. Mark as paid in system

**John Sees:**
- In affiliate dashboard: ₹1,100 pending earnings
- After admin approval: ₹1,100 in total earnings

---

## Database Schema

### Commission Model

```javascript
{
  type: 'affiliate',           // Commission type
  subjectId: ObjectId,         // Affiliate ID
  subjectModel: 'Affiliate',   // Model reference
  orderId: ObjectId,           // Order reference
  productId: ObjectId,         // Product reference (for vendor commissions)
  amount: Number,              // Commission amount
  percentage: Number,          // Commission percentage used
  status: 'pending',           // pending/approved/paid/cancelled
  createdAt: Date,             // Auto-created when order placed
  paidAt: Date                 // Set when admin marks as paid
}
```

### Order Model (Affiliate Tracking)

```javascript
{
  orderId: String,
  userId: ObjectId,
  items: [...],
  affiliateId: ObjectId,  // Links to affiliate if order came from affiliate link
  total: Number,
  createdAt: Date
}
```

---

## Cookie Implementation

### Frontend (When User Clicks Affiliate Link)

The affiliate link tracking should work like this:

**URL:** `https://vtech.com?ref=AFFILIATE_CODE`

**Code Example:**
```javascript
// Extract affiliate code from URL
const urlParams = new URLSearchParams(window.location.search);
const affiliateCode = urlParams.get('ref');

if (affiliateCode) {
  // Store in cookie for 30 days
  document.cookie = `affiliate=${affiliateCode}; max-age=${30 * 24 * 60 * 60}; path=/`;
}
```

### Backend (When Order is Created)

**Code Example:**
```javascript
// Read affiliate cookie from request
const affiliateCookie = req.cookies?.affiliate;

if (affiliateCookie) {
  // Find affiliate and create commission
  const affiliate = await Affiliate.findOne({ code: affiliateCookie });
  if (affiliate) {
    // Create commission automatically
    await Commission.create({...});
  }
}
```

---

## Summary

### The Answer to Your Question:

**Q: When customer clicks affiliate link and buys product, does admin need to give commission to affiliate?**

**A: NO - The system automatically creates the commission record when the order is placed.**

**What Admin Does:**
1. **Review** - Check pending commissions for validity
2. **Approve** - Approve legitimate commissions (if needed)
3. **Pay** - Transfer money and mark as paid

**What Admin Does NOT Do:**
- ❌ Manually create commission records
- ❌ Calculate commission amounts
- ❌ Track which orders are from affiliates

**The entire tracking and commission creation is AUTOMATIC!** 🎉

---

## Related Files

- **Commission Creation:** [orderController.js:277-314](Ecommerce/shop/apps/api/src/controllers/orderController.js:277-314)
- **Commission Model:** [Commission.js](Ecommerce/shop/apps/api/src/models/Commission.js)
- **Order Model:** [Order.js](Ecommerce/shop/apps/api/src/models/Order.js)
- **Admin Interface:** [AffiliateCommissions.jsx](Ecommerce/shop/apps/web/src/assets/pages/dashboard/admin/AffiliateCommissions.jsx)
- **Vendor Commissions (Similar Flow):** [VendorCommissions.jsx](Ecommerce/shop/apps/web/src/assets/pages/dashboard/admin/VendorCommissions.jsx)

---

**Date:** November 20, 2025
**Status:** ✅ Fully Implemented
**Commission Creation:** Automatic on order placement
**Admin Role:** Review, Approve, and Pay only
