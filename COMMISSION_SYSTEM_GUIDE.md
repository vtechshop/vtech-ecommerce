# 💰 Commission System - Complete Guide

**Project:** V-Tech E-commerce Platform
**Date:** November 19, 2025
**Version:** 1.0

---

## 📊 Overview

Your V-Tech platform implements a **dual commission system** supporting both:
1. **Vendor Commissions** - Platform fees from vendor sales
2. **Affiliate Commissions** - Rewards for referral marketing

---

## 🏗️ Commission Architecture

### **Commission Model Schema**

```javascript
{
  type: String,              // 'vendor' or 'affiliate'
  subjectId: ObjectId,       // Vendor._id or Affiliate._id
  subjectModel: String,      // 'Vendor' or 'Affiliate' (for polymorphic ref)
  orderId: ObjectId,         // Reference to Order
  orderItemId: ObjectId,     // Specific item (for vendor commissions)
  amount: Number,            // Commission amount in currency
  percentage: Number,        // Commission percentage used
  status: String,            // 'pending' | 'approved' | 'paid' | 'cancelled'
  approvedAt: Date,          // When admin approved
  paidAt: Date,              // When payment was made
  paymentRef: String,        // Payment reference/transaction ID
  notes: String,             // Admin notes
  timestamps: true           // createdAt, updatedAt
}
```

### **Vendor Model - Commission Fields**

```javascript
{
  // Commission Configuration
  defaultCommissionPercentage: { type: Number, default: 15 },  // Platform fee %
  commissionRules: [{
    categoryId: ObjectId,    // Category-specific rates
    percentage: Number
  }],

  // Earnings Tracking
  totalEarnings: Number,     // Total amount paid out
  pendingEarnings: Number,   // Approved but not paid
  totalSales: Number,        // Total sales amount

  // Payout Integration
  stripeAccountId: String,   // Stripe Connect account
  stripeAccountStatus: String,
  bank: {
    accountNumber: String,   // Bank account details
    bankName: String,
    ifscCode: String,        // For India
    // ... more fields
  }
}
```

---

## 💼 Vendor Commission System

### **How It Works:**

```
1. Customer places order
   ↓
2. Order contains products from vendor(s)
   ↓
3. Commission calculated per item
   ↓
4. Commission created with status: 'pending'
   ↓
5. Admin reviews and approves
   ↓
6. Status changes to: 'approved'
   ↓
7. Admin processes payout
   ↓
8. Status changes to: 'paid'
```

---

### **Commission Calculation**

#### **Formula:**
```javascript
// For each order item from a vendor:
commissionAmount = (itemPrice × quantity × commissionPercentage) / 100

// Example:
// Product price: ₹1000
// Quantity: 2
// Commission: 15%
// Calculation: (1000 × 2 × 15) / 100 = ₹300
```

#### **Implementation:**
```javascript
// Location: orderController.js (lines ~320-335)

for (const item of order.items) {
  if (item.vendorId) {
    const vendor = await Vendor.findById(item.vendorId);
    const product = await Product.findById(item.productId);

    // Use product-specific or vendor default commission
    const commissionPercentage = product.vendorCommissionPercentage
      ? product.vendorCommissionPercentage
      : (vendor.defaultCommissionPercentage || 15);

    const commissionAmount = (item.priceSnapshot * item.qty * commissionPercentage) / 100;

    await Commission.create({
      type: 'vendor',
      subjectId: item.vendorId,
      subjectModel: 'Vendor',
      orderId: order._id,
      orderItemId: item._id,
      amount: commissionAmount,
      percentage: commissionPercentage,
      status: 'pending',
    });
  }
}
```

---

### **Commission Rates**

#### **Default Rate:**
- **15%** of product sale price

#### **Custom Rates:**
1. **Product-Level Override:**
   ```javascript
   product.vendorCommissionPercentage = 20  // 20% for this product
   ```

2. **Category-Level Rules:**
   ```javascript
   vendor.commissionRules = [
     { categoryId: "electronics_id", percentage: 10 },
     { categoryId: "fashion_id", percentage: 20 }
   ]
   ```

3. **Vendor Default:**
   ```javascript
   vendor.defaultCommissionPercentage = 15  // Fallback rate
   ```

#### **Priority Order:**
```
1. Product-specific rate (highest priority)
   ↓
2. Category-specific rate
   ↓
3. Vendor default rate
   ↓
4. Platform default (15%)
```

---

## 🤝 Affiliate Commission System

### **How It Works:**

```
1. Customer clicks affiliate link
   ↓
2. Affiliate code stored in cookie
   ↓
3. Customer makes purchase
   ↓
4. System checks for affiliate cookie
   ↓
5. Commission calculated on entire order
   ↓
6. Affiliate commission created (status: 'pending')
   ↓
7. Affiliate's pendingEarnings updated
   ↓
8. Admin approves and pays
   ↓
9. Affiliate's paidEarnings updated
```

---

### **Commission Calculation**

#### **Formula:**
```javascript
// Calculate commission per item, then sum
for each item:
  itemTotal = itemPrice × quantity
  itemCommission = (itemTotal × affiliatePercentage) / 100

totalAffiliateCommission = sum of all itemCommissions
```

#### **Implementation:**
```javascript
// Location: orderController.js (lines ~340-365)

const affiliateCookie = req.cookies?.affiliate;
if (affiliateCookie) {
  const affiliate = await Affiliate.findOne({ code: affiliateCookie });

  if (affiliate) {
    let totalAffiliateCommission = 0;

    for (const item of order.items) {
      const product = await Product.findById(item.productId);

      // Use product-specific or affiliate default commission
      const commissionPercentage = product.affiliateCommissionPercentage
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

    // Update affiliate stats
    affiliate.totalConversions += 1;
    affiliate.pendingEarnings += totalAffiliateCommission;
    await affiliate.save();
  }
}
```

---

### **Affiliate Commission Rates**

#### **Default Rate:**
- **5%** of order total

#### **Custom Rates:**
1. **Product-Level:**
   ```javascript
   product.affiliateCommissionPercentage = 10  // 10% for this product
   ```

2. **Affiliate-Level:**
   ```javascript
   affiliate.commissionPercentage = 7  // This affiliate gets 7%
   ```

---

## 📈 Commission Lifecycle & Status

### **Status Flow:**

```
pending ──→ approved ──→ paid
   │
   └──────→ cancelled
```

### **Status Definitions:**

| Status | Description | Who Can Set | Actions Available |
|--------|-------------|-------------|-------------------|
| **pending** | Commission created, awaiting review | System (auto) | Admin: Approve, Cancel |
| **approved** | Admin reviewed and approved | Admin | Admin: Pay, Cancel |
| **paid** | Payment sent to vendor/affiliate | Admin | None (final) |
| **cancelled** | Commission invalidated | Admin | None (final) |

---

## 🔐 Admin Commission Management

### **Admin Capabilities:**

#### **1. View All Commissions**
```javascript
GET /api/admin/commissions?type=vendor&status=pending&page=1&limit=20

// Returns:
{
  commissions: [
    {
      _id: "...",
      type: "vendor",
      subjectId: { storeName: "Tech Store" },
      orderId: { orderId: "ORD-123", totals: {...} },
      amount: 300,
      percentage: 15,
      status: "pending",
      createdAt: "2025-11-19"
    }
  ],
  meta: { page: 1, limit: 20, total: 45 }
}
```

#### **2. Get Commission Statistics**
```javascript
GET /api/admin/commissions/stats?type=vendor

// Returns:
{
  totalAmount: 50000,        // All time commissions
  pendingAmount: 5000,       // Awaiting approval
  pendingCount: 15,          // Number pending
  paidAmount: 45000,         // Already paid
  paidCount: 120,            // Number paid
  affiliateCount: 25         // Active affiliates (if type=affiliate)
}
```

#### **3. Approve Commission**
```javascript
PUT /api/admin/commissions/:id/approve

// Action:
- Sets status to 'approved'
- Records approvedAt timestamp
- Logs action

// Response:
{
  success: true,
  data: { ...commission, status: 'approved', approvedAt: '2025-11-19' }
}
```

#### **4. Pay Commission**
```javascript
PUT /api/admin/commissions/:id/pay
{
  "paymentRef": "TXN-123456"  // Optional payment reference
}

// Actions:
- Sets status to 'paid'
- Records paidAt timestamp
- Stores payment reference
- Updates vendor/affiliate earnings

// For Affiliates:
- Increases paidEarnings
- Decreases pendingEarnings

// Response:
{
  success: true,
  data: { ...commission, status: 'paid', paidAt: '2025-11-19' }
}
```

#### **5. Bulk Pay Commissions**
```javascript
POST /api/admin/commissions/bulk-pay
{
  "commissionIds": ["id1", "id2", "id3"]
}

// Actions:
- Updates all specified commissions to 'paid'
- Updates all affiliate earnings
- Logs all transactions
- Returns count of updated commissions

// Response:
{
  success: true,
  data: {
    paid: 3,
    message: "3 commissions marked as paid"
  }
}
```

---

## 👨‍💼 Vendor Commission View

### **Vendor Capabilities:**

#### **View Own Commissions (Settlements)**
```javascript
GET /api/vendors/settlements?status=approved&page=1

// Security:
- Vendor can ONLY see their own commissions
- Query automatically scoped to vendor._id

// Returns:
{
  commissions: [
    {
      orderId: { orderId: "ORD-123", totals: {...} },
      amount: 300,
      percentage: 15,
      status: "approved",
      createdAt: "2025-11-19"
    }
  ],
  meta: { page: 1, limit: 20, total: 10 }
}
```

#### **Implementation (vendorController.js:398-433):**
```javascript
async function getSettlements(req, res, next) {
  // 1. Verify vendor exists
  const vendor = await Vendor.findOne({ userId: req.user._id });

  if (!vendor) {
    return res.status(403).json({
      error: { code: 'NOT_VENDOR', message: 'Vendor profile required' }
    });
  }

  // 2. Query ONLY vendor's commissions
  const query = {
    subjectId: vendor._id,  // ✅ Scoped to vendor
    type: 'vendor'
  };

  if (status) query.status = status;

  // 3. Fetch and return
  const commissions = await Commission.find(query)
    .populate('orderId', 'orderId totals createdAt')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: commissions });
}
```

---

## 📊 Dashboard Stats

### **Vendor Dashboard:**
```javascript
GET /api/vendors/dashboard/stats

// Includes:
{
  totalEarnings: 45000,      // Sum of approved commissions
  totalSales: 300000,        // Total sales amount
  totalOrders: 150,          // Number of orders
  pendingOrders: 10,         // Orders to fulfill
  totalProducts: 50,         // Products in catalog
  activeProducts: 45         // Published products
}
```

### **Admin Dashboard:**
```javascript
GET /api/admin/dashboard/stats

// Includes commission overview:
{
  totalCommissionsPending: 5000,
  totalCommissionsPaid: 45000,
  vendorCount: 25,
  affiliateCount: 15,
  // ... more stats
}
```

---

## 💸 Payout Processing

### **Manual Payout Flow:**

1. **Admin Reviews Pending Commissions**
   ```
   GET /api/admin/commissions?status=pending
   ```

2. **Admin Approves Commissions**
   ```
   PUT /api/admin/commissions/:id/approve
   ```

3. **Admin Processes Payment** (external system)
   - Bank transfer
   - PayPal
   - Stripe Connect
   - Other payment method

4. **Admin Marks as Paid**
   ```
   PUT /api/admin/commissions/:id/pay
   {
     "paymentRef": "BANK-TXN-123456"
   }
   ```

### **Bulk Payout Flow:**

1. **Admin Gets Approved Commissions**
   ```
   GET /api/admin/commissions?status=approved
   ```

2. **Admin Processes Batch Payment** (external)
   - Generate CSV for bank
   - Process via payment gateway
   - Record all transaction IDs

3. **Admin Bulk Updates**
   ```
   POST /api/admin/commissions/bulk-pay
   {
     "commissionIds": ["id1", "id2", "id3", ...]
   }
   ```

---

## 🔄 Automated Payout (Stripe Connect)

### **Setup:**
```javascript
// Vendor model includes:
vendor.stripeAccountId = "acct_xxxxx"
vendor.stripeAccountStatus = "active"
```

### **Future Enhancement:**
```javascript
// Can implement automatic payouts:
async function processAutomaticPayouts() {
  const approvedCommissions = await Commission.find({
    status: 'approved',
    type: 'vendor'
  });

  for (const commission of approvedCommissions) {
    const vendor = await Vendor.findById(commission.subjectId);

    if (vendor.stripeAccountId && vendor.stripeAccountStatus === 'active') {
      // Create Stripe transfer
      const transfer = await stripe.transfers.create({
        amount: commission.amount * 100, // Convert to cents
        currency: 'inr',
        destination: vendor.stripeAccountId,
        transfer_group: commission.orderId
      });

      // Update commission
      commission.status = 'paid';
      commission.paidAt = new Date();
      commission.paymentRef = transfer.id;
      await commission.save();

      // Update vendor earnings
      vendor.totalEarnings += commission.amount;
      vendor.pendingEarnings -= commission.amount;
      await vendor.save();
    }
  }
}
```

---

## 📊 Reporting & Analytics

### **Commission Reports Available:**

#### **1. Vendor Commission Report**
```javascript
GET /api/admin/commissions?type=vendor&startDate=2025-01-01&endDate=2025-12-31

// Can filter by:
- Date range
- Status
- Vendor
- Amount range
```

#### **2. Affiliate Performance Report**
```javascript
GET /api/admin/commissions?type=affiliate

// Shows:
- Top performing affiliates
- Conversion rates
- Total earnings
- Pending vs paid
```

#### **3. Category Commission Analysis**
```javascript
// Can aggregate commissions by product category
// Identify high-commission vs low-commission products
// Optimize commission rates
```

---

## 🔐 Security & Data Isolation

### **Vendor Commission Security:**

✅ **Read-Only Access:** Vendors can only VIEW their commissions
✅ **Data Scoping:** Automatic filtering by vendor._id
✅ **No Manipulation:** Vendors cannot approve/pay commissions
✅ **Audit Trail:** All admin actions logged

```javascript
// Every vendor commission query includes:
const query = {
  subjectId: vendor._id,  // ✅ Always scoped to vendor
  type: 'vendor'
};
```

### **Admin Security:**

✅ **Admin-Only Routes:** All commission management requires admin role
✅ **Authorization:** `authorize(['admin'])` on all routes
✅ **Audit Logging:** All approve/pay actions logged
✅ **Payment References:** Tracked for accountability

---

## 💡 Best Practices

### **For Platform Administrators:**

1. **Regular Review Cycle:**
   - Review pending commissions weekly
   - Approve legitimate sales
   - Investigate suspicious patterns

2. **Payout Schedule:**
   - Monthly payouts recommended
   - Set minimum payout threshold (e.g., ₹1000)
   - Communicate schedule to vendors

3. **Commission Adjustments:**
   - Document all rate changes
   - Notify vendors of changes
   - Apply new rates to future orders only

4. **Fraud Prevention:**
   - Monitor for unusual patterns
   - Verify high-value commissions
   - Track refund impact on commissions

### **For Vendors:**

1. **Track Earnings:**
   - Review settlements regularly
   - Match commissions to orders
   - Report discrepancies

2. **Understand Rates:**
   - Know your commission percentage
   - Optimize product pricing accordingly
   - Track profitability

3. **Payout Information:**
   - Keep bank details updated
   - Provide tax documentation
   - Track payment references

---

## 📈 Commission Formula Examples

### **Example 1: Simple Vendor Commission**
```
Product Price: ₹2,000
Quantity: 1
Commission Rate: 15%

Calculation:
commission = (2000 × 1 × 15) / 100
           = ₹300

Vendor Receives: ₹1,700 (after commission)
Platform Receives: ₹300
```

### **Example 2: Multi-Item Order**
```
Item 1: ₹1,000 × 2 @ 15% = ₹300 commission
Item 2: ₹500 × 1 @ 10% = ₹50 commission
Total Commission: ₹350
```

### **Example 3: Affiliate + Vendor Commission**
```
Order Total: ₹5,000
Vendor Commission: 15% = ₹750 (platform earns)
Affiliate Commission: 5% = ₹250 (platform pays)
Net Platform Earnings: ₹500
```

---

## 🎯 Summary

Your commission system is:

✅ **Flexible** - Multiple commission rates supported
✅ **Secure** - Proper data isolation and authorization
✅ **Transparent** - Vendors can view their earnings
✅ **Manageable** - Admin has full control
✅ **Scalable** - Supports bulk operations
✅ **Tracked** - Complete audit trail

**Commission Flow:**
```
Order Created → Commission Calculated → Status: Pending →
Admin Reviews → Status: Approved → Admin Pays →
Status: Paid → Earnings Updated
```

**Default Rates:**
- Vendor: 15%
- Affiliate: 5%

---

**Document Version:** 1.0
**Last Updated:** November 19, 2025
**Next Review:** February 19, 2026
