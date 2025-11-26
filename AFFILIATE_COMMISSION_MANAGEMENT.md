# Affiliate Commission Management System

## Overview

Complete admin dashboard system for managing affiliate commissions with payment tracking, bulk operations, filtering, and CSV export capabilities.

---

## Features

### 1. Statistics Dashboard
- **Total Commissions**: All-time total commission amount
- **Pending Commissions**: Amount awaiting payment with count
- **Paid Commissions**: Total paid out with count
- **Active Affiliates**: Number of active affiliates in system

### 2. Commission Filtering
- Filter by status: All, Pending, Paid, Cancelled
- Real-time updates on filter change
- Pagination support (20 per page)

### 3. Commission Management
- **Pay Individual Commission**: Mark single commission as paid
- **Bulk Pay**: Pay all pending commissions at once
- **Export to CSV**: Download all commission data
- **View Details**: Affiliate name, code, order ID, amount, rate, dates

### 4. Visual Feedback
- Color-coded status badges:
  - 🟡 Yellow: Pending
  - 🟢 Green: Paid
  - 🔴 Red: Cancelled
- Toast notifications for all actions
- Loading states with spinners
- Hover effects on table rows

---

## Backend API Endpoints

### 1. Get Commissions List
```http
GET /api/admin/commissions?type=affiliate&status=pending&page=1&limit=20
```

**Query Parameters**:
- `type` (string): Commission type (affiliate, vendor, referral)
- `status` (string): Filter by status (pending, paid, cancelled)
- `page` (number): Page number for pagination
- `limit` (number): Results per page

**Response**:
```json
{
  "success": true,
  "data": {
    "commissions": [
      {
        "_id": "...",
        "orderId": { "orderId": "ORD-12345", "totals": {...} },
        "subjectId": {
          "_id": "...",
          "code": "DEMOAFCIMS",
          "userId": {
            "name": "John Doe",
            "email": "affiliate@shop.test"
          }
        },
        "amount": 50.00,
        "percentage": 5,
        "status": "pending",
        "createdAt": "2025-11-11T10:00:00Z",
        "paidAt": null
      }
    ]
  },
  "meta": {
    "page": 1,
    "pages": 5,
    "total": 100
  }
}
```

---

### 2. Get Commission Statistics
```http
GET /api/admin/commissions/stats?type=affiliate
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalAmount": 5000.00,
    "pendingAmount": 1500.00,
    "pendingCount": 30,
    "paidAmount": 3500.00,
    "paidCount": 70,
    "affiliateCount": 15
  }
}
```

---

### 3. Pay Single Commission
```http
POST /api/admin/commissions/:id/pay
```

**Body** (optional):
```json
{
  "paymentRef": "TXN-123456"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "status": "paid",
    "paidAt": "2025-11-11T12:00:00Z",
    "paymentRef": "TXN-123456"
  }
}
```

**Side Effects**:
- Updates commission status to "paid"
- Sets `paidAt` timestamp
- Updates affiliate's `paidEarnings` (increments)
- Updates affiliate's `pendingEarnings` (decrements)

---

### 4. Bulk Pay Commissions
```http
POST /api/admin/commissions/bulk-pay
```

**Body**:
```json
{
  "commissionIds": ["id1", "id2", "id3"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "count": 3
  }
}
```

**Side Effects**:
- Updates all specified commissions to "paid" status
- Sets `paidAt` timestamp for all
- Updates each affiliate's earnings accordingly

---

## Frontend Component

### Location
`apps/web/src/assets/pages/dashboard/admin/AffiliateCommissions.jsx`

### Dependencies
```javascript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { formatCurrency } from '@/utils/format';
import Button from '@/components/common/Button';
import { /* Lucide icons */ } from 'lucide-react';
import { useToast } from '@/components/common/ToastContainer';
```

### State Management
```javascript
const [statusFilter, setStatusFilter] = useState('all');
const [page, setPage] = useState(1);
```

### Key Functions

#### 1. handleExportCSV()
Exports filtered commissions to CSV file:
```javascript
const handleExportCSV = () => {
  const csvData = [
    ['Affiliate', 'Order ID', 'Amount', 'Status', 'Date', 'Paid Date'].join(','),
    ...(data?.commissions || []).map(comm => [...])
  ].join('\n');

  const blob = new Blob([csvData], { type: 'text/csv' });
  // Download file...
};
```

#### 2. handlePayAllPending()
Pays all pending commissions with confirmation:
```javascript
const handlePayAllPending = () => {
  if (window.confirm('Are you sure...?')) {
    const pendingIds = data?.commissions
      ?.filter(c => c.status === 'pending')
      ?.map(c => c._id) || [];

    bulkPayMutation.mutate(pendingIds);
  }
};
```

---

## Routing Configuration

### 1. App.jsx Route
```javascript
// Import
const AffiliateCommissions = lazy(() =>
  import('./assets/pages/dashboard/admin/AffiliateCommissions')
);

// Route
<Route path="/admin-dashboard" element={...}>
  <Route path="affiliate-commissions" element={<AffiliateCommissions />} />
</Route>
```

### 2. Navigation Menu (DashboardLayout.jsx)
```javascript
if (isAdmin) {
  return [
    // ... other items
    {
      path: '/admin-dashboard/affiliate-commissions',
      label: 'Affiliate Commissions',
      icon: 'dollar'
    },
    // ... more items
  ];
}
```

---

## Usage Guide

### For Admins

#### 1. View All Commissions
1. Login as admin
2. Navigate to **Admin Dashboard** > **Affiliate Commissions**
3. See stats cards at top with totals

#### 2. Filter Commissions
- Click filter buttons: **All** | **Pending** | **Paid** | **Cancelled**
- Results update immediately
- Page resets to 1 on filter change

#### 3. Pay Single Commission
1. Find commission with "Pending" status
2. Click green **Pay** button in Actions column
3. Confirm action
4. Toast notification: "Commission marked as paid!"
5. Commission moves to "Paid" status

#### 4. Bulk Pay All Pending
1. Click **Pay All Pending** button in header
2. Confirm: "Are you sure you want to pay all pending commissions?"
3. All pending commissions marked as paid
4. Toast: "X commissions marked as paid!"

#### 5. Export to CSV
1. Click **Export CSV** button
2. File downloads: `affiliate-commissions-YYYY-MM-DD.csv`
3. Open in Excel or Google Sheets

---

## Data Flow

### When Customer Purchases with Affiliate Link

1. **Customer clicks affiliate link**: `http://example.com/product/item?affId=DEMOAFCIMS`
2. **Cookie stored**: Affiliate code saved to user's browser
3. **Customer completes purchase**: Order created
4. **Commission created**: Backend creates Commission record
   - `type`: "affiliate"
   - `subjectId`: Affiliate ID
   - `orderId`: Order ID
   - `amount`: Calculated commission (order total × percentage)
   - `percentage`: Affiliate's commission rate
   - `status`: "pending"
5. **Affiliate's pendingEarnings updated**: Amount added to pending
6. **Admin sees new commission**: In "Pending" filter

### When Admin Pays Commission

1. **Admin clicks Pay**: On pending commission
2. **Backend updates commission**:
   - `status`: "pending" → "paid"
   - `paidAt`: Current timestamp
3. **Backend updates affiliate earnings**:
   - `paidEarnings`: Incremented by commission amount
   - `pendingEarnings`: Decremented by commission amount
4. **Frontend updates**: React Query invalidates cache
5. **Stats refresh**: All cards show updated numbers
6. **Affiliate sees update**: In their dashboard

---

## Database Schema

### Commission Model
```javascript
{
  _id: ObjectId,
  type: String,           // 'affiliate', 'vendor', 'referral'
  orderId: ObjectId,      // Reference to Order
  subjectId: ObjectId,    // Reference to Affiliate/Vendor
  amount: Number,         // Commission amount in currency
  percentage: Number,     // Commission rate (e.g., 5 for 5%)
  status: String,         // 'pending', 'paid', 'cancelled'
  createdAt: Date,
  paidAt: Date,
  paymentRef: String      // Optional payment reference
}
```

### Affiliate Model (relevant fields)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,       // Reference to User
  code: String,           // Unique affiliate code
  totalEarnings: Number,  // All-time total
  paidEarnings: Number,   // Total paid out
  pendingEarnings: Number // Awaiting payment
}
```

---

## Error Handling

### Frontend
- **API Errors**: Caught by React Query, shown in toast
- **Loading States**: Spinner shown during data fetch
- **Empty States**: "No commissions found" message
- **Network Errors**: Retry mechanism (2 retries)

### Backend
- **Invalid Commission ID**: 404 Not Found
- **Already Paid**: Updates ignored (idempotent)
- **Invalid Bulk Pay**: 400 Bad Request if no IDs provided
- **Database Errors**: Caught and logged

---

## Testing Checklist

### ✅ Basic Functionality
- [ ] Page loads without errors
- [ ] Stats cards display correct numbers
- [ ] Commission table shows data
- [ ] Pagination works (if > 20 commissions)

### ✅ Filtering
- [ ] "All" shows all commissions
- [ ] "Pending" shows only pending
- [ ] "Paid" shows only paid
- [ ] "Cancelled" shows only cancelled
- [ ] Filter buttons highlight active filter

### ✅ Payment Actions
- [ ] Pay button appears only for pending commissions
- [ ] Pay button marks commission as paid
- [ ] Affiliate earnings update correctly
- [ ] Toast notification appears
- [ ] Table updates after payment

### ✅ Bulk Operations
- [ ] "Pay All Pending" button works
- [ ] Confirmation dialog appears
- [ ] All pending commissions marked as paid
- [ ] Count shown in toast is accurate
- [ ] No errors with 0 pending commissions

### ✅ CSV Export
- [ ] CSV file downloads
- [ ] File name includes date
- [ ] All visible commissions included
- [ ] CSV format is valid
- [ ] Opens correctly in Excel

### ✅ Edge Cases
- [ ] Works with 0 commissions
- [ ] Works with 1 commission
- [ ] Works with 1000+ commissions
- [ ] Handles network errors gracefully
- [ ] Handles invalid affiliate data

---

## Performance Considerations

1. **Pagination**: Only loads 20 commissions per page
2. **Lazy Loading**: Component lazy-loaded in App.jsx
3. **Query Caching**: React Query caches for 5 minutes
4. **Optimistic Updates**: UI updates before server confirms
5. **Debouncing**: Filter changes debounced (if needed)

---

## Security

1. **Authentication Required**: All endpoints require admin role
2. **Authorization**: `authorize(['admin'])` middleware
3. **CSRF Protection**: Token validation on POST requests
4. **Input Validation**: Commission IDs validated
5. **SQL Injection**: MongoDB protected by Mongoose
6. **Audit Logging**: All payment actions logged

---

## Future Enhancements

### Planned Features
1. **Commission History Chart**: Line chart showing payments over time
2. **Email Notifications**: Notify affiliates when paid
3. **Payment Receipts**: Generate PDF receipts
4. **Batch Payment Upload**: Upload CSV of payments to process
5. **Commission Disputes**: Allow affiliates to dispute amounts
6. **Payment Methods**: Track how commissions were paid (bank, PayPal, etc.)
7. **Scheduled Payments**: Auto-pay on certain dates
8. **Commission Tiers**: Different rates based on performance

### Possible Improvements
1. Add search by affiliate name/code
2. Add date range filter
3. Add amount range filter
4. Add sorting by amount/date
5. Add commission notes field
6. Add bulk actions dropdown (pay, cancel, export selected)
7. Add commission approval workflow
8. Add payment batch tracking

---

## Troubleshooting

### Issue: Commissions Not Appearing
**Solution**:
1. Check if orders were placed with affiliate links
2. Verify commission creation in database
3. Check if affiliate is active
4. Ensure order status triggers commission

### Issue: Payment Button Disabled
**Solution**:
1. Check if commission is already paid
2. Verify admin permissions
3. Check if mutation is pending
4. Look for errors in console

### Issue: Stats Not Updating
**Solution**:
1. Hard refresh page (Ctrl + Shift + R)
2. Check if query invalidation is working
3. Verify backend aggregation query
4. Check for console errors

### Issue: CSV Export Empty
**Solution**:
1. Ensure commissions exist in current filter
2. Check if data is loaded (not loading state)
3. Verify CSV generation logic
4. Check browser download settings

---

## Related Documentation

- [Affiliate System Overview](AFFILIATE_SYSTEM.md) - Complete affiliate tracking system
- [All Product Links Feature](ALL_PRODUCT_LINKS_FEATURE.md) - Generate affiliate links
- [Commission Calculation](COMMISSION_CALCULATION.md) - How commissions are calculated
- [API Reference](API_REFERENCE.md) - Complete API documentation

---

**Created**: 2025-11-11
**Status**: ✅ Production Ready
**Version**: 1.0.0
