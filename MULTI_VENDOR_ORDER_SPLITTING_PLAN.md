# Multi-Vendor Order Splitting Implementation Plan

**Date:** November 21, 2025
**Status:** 🔄 IN PROGRESS
**User Request:** Sequential order numbers for each vendor in multi-vendor orders

---

## 🎯 Objective

When a customer places ONE order with products from MULTIPLE vendors:
- Create SEPARATE orders for EACH vendor
- Each vendor order gets a UNIQUE, SEQUENTIAL order ID
- Each vendor receives notification with their specific order ID
- Admin receives notifications with vendor-specific order IDs
- Customer sees ALL order IDs in confirmation

---

## 📊 Current vs New Behavior

### Current Behavior:
```
Customer Order: Products from Vendor A + Vendor B + Vendor C

Creates: 1 Order
- Order #ORD-123 (contains all products)

Emails Sent:
1. Customer → Order #ORD-123 (all products)
2. Vendor A → Order #ORD-123 (only their products shown)
3. Admin → Order #ORD-123 (Vendor A products)
4. Vendor B → Order #ORD-123 (only their products shown)
5. Admin → Order #ORD-123 (Vendor B products)
6. Vendor C → Order #ORD-123 (only their products shown)
7. Admin → Order #ORD-123 (Vendor C products)
```

### New Behavior:
```
Customer Order: Products from Vendor A + Vendor B + Vendor C

Creates: 4 Orders
- Order #ORD-123 (parent order - all products, for customer reference)
- Order #ORD-124 (Vendor A products only)
- Order #ORD-125 (Vendor B products only)
- Order #ORD-126 (Vendor C products only)

Emails Sent:
1. Customer → Orders #ORD-124, #ORD-125, #ORD-126 (all products)
2. Vendor A → Order #ORD-124 (their products)
3. Admin → Order #ORD-124 (Vendor A products)
4. Vendor B → Order #ORD-125 (their products)
5. Admin → Order #ORD-125 (Vendor B products)
6. Vendor C → Order #ORD-126 (their products)
7. Admin → Order #ORD-126 (Vendor C products)
```

---

## 🗄️ Database Changes

### Order Model Updates (COMPLETED ✅):
```javascript
{
  // ... existing fields ...

  // NEW FIELDS:
  parentOrderId: ObjectId,  // Links child orders to parent
  childOrderIds: [ObjectId],  // Parent tracks all children
  isVendorOrder: Boolean,     // True for vendor-specific orders
}
```

### Order Types:
1. **Parent Order**: Customer-facing order containing all items from all vendors
   - Used for customer order history
   - `isVendorOrder: false`
   - `childOrderIds: [...]` contains all vendor order IDs

2. **Vendor Orders (Children)**: Individual orders per vendor
   - Used by vendors and admin for fulfillment
   - `isVendorOrder: true`
   - `parentOrderId: <parent_id>`
   - Contains only that vendor's products

---

## 🔄 Order Creation Flow (NEW)

### Step 1: Group Items by Vendor
```javascript
const vendorGroups = {};
for (const item of orderItems) {
  if (!vendorGroups[item.vendorId]) {
    vendorGroups[item.vendorId] = [];
  }
  vendorGroups[item.vendorId].push(item);
}
```

### Step 2: Create Parent Order (Optional - for customer reference)
```javascript
const parentOrder = await Order.create({
  orderId: generateOrderId(),
  userId: req.user?._id,
  guestEmail: isGuest ? guestEmail : undefined,
  isGuest: isGuest,
  items: orderItems, // ALL items
  totals: { subtotal, tax, shipping, discount, total },
  shipTo,
  status: 'placed',
  isVendorOrder: false,
  childOrderIds: [], // Will be populated with vendor order IDs
  // ... rest of fields
});
```

### Step 3: Create Vendor Orders (One per vendor)
```javascript
const vendorOrders = [];

for (const [vendorId, items] of Object.entries(vendorGroups)) {
  // Calculate vendor-specific totals
  const vendorSubtotal = items.reduce((sum, item) =>
    sum + (item.priceSnapshot * item.qty), 0);
  const vendorTax = vendorSubtotal * 0.1;
  const vendorShipping = shipping / Object.keys(vendorGroups).length; // Split shipping
  const vendorTotal = vendorSubtotal + vendorTax + vendorShipping;

  // Create vendor-specific order
  const vendorOrder = await Order.create({
    orderId: generateOrderId(), // SEQUENTIAL ORDER ID
    userId: req.user?._id,
    guestEmail: isGuest ? guestEmail : undefined,
    isGuest: isGuest,
    items: items, // ONLY THIS VENDOR'S ITEMS
    totals: {
      subtotal: vendorSubtotal,
      tax: vendorTax,
      shipping: vendorShipping,
      discount: 0,
      total: vendorTotal
    },
    shipTo,
    status: 'placed',
    isVendorOrder: true,
    parentOrderId: parentOrder._id,
    // ... rest of fields
  });

  vendorOrders.push(vendorOrder);

  // Update parent with child ID
  parentOrder.childOrderIds.push(vendorOrder._id);
}

await parentOrder.save();
```

### Step 4: Stock Deduction (per vendor order)
- Deduct stock for items in each vendor order
- Same logic as before, but applied per vendor order

### Step 5: Commission Creation (per vendor order)
- Create commissions based on vendor orders
- Link commissions to vendor order IDs, not parent

---

## 📧 Notification Changes

### Customer Email:
**OLD**: Show single order ID
**NEW**: Show all vendor order IDs

```javascript
// Customer receives list of all vendor orders
await notificationService.sendOrderConfirmation(userInfo, {
  ...order,
  vendorOrders: vendorOrders // Pass all vendor orders
});
```

**Email Content**:
```
Your order has been split by vendor:

Order #ORD-124 - TechStore Products (₹2,500)
Order #ORD-125 - FashionHub Products (₹1,500)
Order #ORD-126 - BookWorld Products (₹1,000)

Total: ₹5,000

You can track each order separately in your account.
```

### Vendor Email:
**OLD**: Vendor gets parent order ID
**NEW**: Vendor gets their specific vendor order ID

```javascript
// Each vendor gets their own order ID
await notificationService.sendVendorOrderNotification(vendor, vendorOrder, items);
```

**Email Content**:
```
Subject: New Order #ORD-124 - Action Required

Order #ORD-124 (YOUR order ID)
[Your products only]
```

### Admin Email:
**OLD**: Admin gets parent order ID
**NEW**: Admin gets vendor-specific order IDs

```javascript
// Admin receives vendor order ID
await notificationService.sendAdminOrderNotification(vendorOrder, items, vendor);
```

**Email Content**:
```
Subject: New Order #ORD-124 - TechStore Products

Order #ORD-124
Vendor: TechStore
[Vendor products only]
```

---

## 🔍 Impact Analysis

### Affected Components:

1. **Order Controller** (`orderController.js`)
   - ✅ Modify `createOrder` to split orders by vendor
   - ⚠️ Update stock deduction logic
   - ⚠️ Update commission creation logic
   - ⚠️ Update notification logic

2. **Notification Service** (`notificationService.js`)
   - ⚠️ Update `sendOrderConfirmation` to show multiple order IDs
   - ✅ `sendVendorOrderNotification` already accepts order object
   - ✅ `sendAdminOrderNotification` already accepts order object

3. **Order Model** (`Order.js`)
   - ✅ Add parent/child relationship fields (COMPLETED)
   - ✅ Add indexes (COMPLETED)

4. **Frontend Components** (Will need updates later)
   - Order detail pages
   - Order tracking
   - Vendor dashboard
   - Admin dashboard

---

## 🚨 Critical Considerations

### 1. Payment Handling:
- **Question**: Should payment be tracked on parent or vendor orders?
- **Decision**: Track on parent order, reference from vendor orders
- **Reason**: Customer makes ONE payment for entire order

### 2. Order Status:
- Parent order status = aggregate of child orders
- Vendor orders have independent statuses
- If Vendor A ships → Order #ORD-124 status = 'shipped'
- Parent updates only when ALL vendors ship

### 3. Cancellations:
- Customer can cancel entire parent order (cancels all children)
- Vendor can only cancel their own vendor order
- Partial cancellation affects parent order status

### 4. Commission Tracking:
- Link commissions to vendor orders, NOT parent
- Each vendor order has its own commission records

### 5. Shipment Tracking:
- Each vendor order has separate tracking number
- Parent order shows multiple tracking numbers

---

## ⚠️ Breaking Changes

### API Response Changes:
**OLD**:
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-123",
    "items": [...]
  }
}
```

**NEW**:
```json
{
  "success": true,
  "data": {
    "parentOrder": {
      "orderId": "ORD-123",
      "childOrderIds": [...]
    },
    "vendorOrders": [
      { "orderId": "ORD-124", "vendorId": "...", "items": [...] },
      { "orderId": "ORD-125", "vendorId": "...", "items": [...] }
    ]
  }
}
```

### Frontend Impact:
- Order confirmation page needs update
- Order tracking needs to support multiple order IDs
- Vendor dashboard already filters by vendorId (should work)
- Admin dashboard needs to show vendor-specific orders

---

## 📝 Implementation Steps

### Phase 1: Backend (Current)
- [x] Update Order model with parent/child fields
- [ ] Modify order creation to split by vendor
- [ ] Update notification service
- [ ] Test order splitting

### Phase 2: Frontend (Later)
- [ ] Update order confirmation UI
- [ ] Update order tracking
- [ ] Update vendor dashboard (if needed)
- [ ] Update admin dashboard (if needed)

---

## 🧪 Test Scenarios

### Test 1: Single Vendor Order
**Input**: 2 products from Vendor A
**Expected**:
- 1 parent order (ORD-123)
- 1 vendor order (ORD-124)
- Customer email shows ORD-124
- Vendor A email shows ORD-124
- Admin email shows ORD-124

### Test 2: Multi-Vendor Order (2 vendors)
**Input**: 2 products from Vendor A, 1 product from Vendor B
**Expected**:
- 1 parent order (ORD-123)
- 2 vendor orders (ORD-124, ORD-125)
- Customer email shows ORD-124 & ORD-125
- Vendor A email shows ORD-124
- Admin email #1 shows ORD-124
- Vendor B email shows ORD-125
- Admin email #2 shows ORD-125

### Test 3: Multi-Vendor Order (3 vendors)
**Input**: Products from 3 different vendors
**Expected**:
- 1 parent order (ORD-123)
- 3 vendor orders (ORD-124, ORD-125, ORD-126)
- Customer sees all 3 order IDs
- Each vendor sees only their order ID
- Admin receives 3 separate emails with different order IDs

---

## 🔒 Backwards Compatibility

### Option 1: Keep Old Behavior Available
Add a feature flag to enable/disable order splitting:
```env
SPLIT_ORDERS_BY_VENDOR=true
```

### Option 2: Migrate Existing Orders
Create migration script to add parent/child relationships to existing orders (if needed)

---

## ✅ Success Criteria

- [x] Order model supports parent/child relationships
- [ ] Orders are split by vendor on creation
- [ ] Each vendor order has unique sequential ID
- [ ] Notifications use vendor-specific order IDs
- [ ] Stock deduction works correctly
- [ ] Commissions link to vendor orders
- [ ] Customer sees all order IDs in confirmation
- [ ] No breaking bugs in order creation

---

## 📊 Current Progress

**Completed:**
- ✅ Order model updated with parent/child fields
- ✅ Indexes added for new fields

**In Progress:**
- 🔄 Modifying order creation logic

**Pending:**
- ⏳ Update notification service
- ⏳ Testing
- ⏳ Frontend updates (separate task)

---

**Last Updated:** November 21, 2025
