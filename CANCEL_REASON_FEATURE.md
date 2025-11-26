# Cancel Order with Reason - Feature Implementation

**Date**: 2025-11-18
**Status**: ✅ COMPLETE

---

## Feature Overview

Customers must now **provide a reason** before cancelling an order. This helps the business understand why orders are being cancelled and improve the shopping experience.

---

## What Was Implemented

### 1. Cancel Reason Modal Component ✅

**File**: `apps/web/src/components/common/CancelOrderModal.jsx` (NEW)

**Features**:
- ✅ **8 predefined cancellation reasons**:
  - Changed my mind
  - Found a better price elsewhere
  - Ordered by mistake
  - Delivery time too long
  - Product no longer needed
  - Payment/billing issue
  - Ordered wrong item/variant
  - Other reason (with text field)

- ✅ **Radio button selection** for easy choice
- ✅ **Custom text field** when "Other reason" is selected
- ✅ **Form validation**:
  - Reason is required
  - Custom text required if "Other" is selected
- ✅ **Warning message** with order ID
- ✅ **Loading state** during cancellation
- ✅ **Character limit** (500 chars for custom reason)

**Predefined Reasons**:
```javascript
const CANCEL_REASONS = [
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'found_better_price', label: 'Found a better price elsewhere' },
  { value: 'ordered_by_mistake', label: 'Ordered by mistake' },
  { value: 'delivery_too_long', label: 'Delivery time too long' },
  { value: 'product_not_needed', label: 'Product no longer needed' },
  { value: 'payment_issue', label: 'Payment/billing issue' },
  { value: 'wrong_item', label: 'Ordered wrong item/variant' },
  { value: 'other', label: 'Other reason' },
];
```

---

### 2. Backend Updates ✅

#### Order Model
**File**: `apps/api/src/models/Order.js`

Added `cancellation` field to store cancellation details:

```javascript
cancellation: {
  reason: String,                                         // Cancellation reason
  cancelledAt: Date,                                      // When cancelled
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who cancelled
}
```

#### Order Controller
**File**: `apps/api/src/controllers/orderController.js` (lines 478-538)

**Changes Made**:

1. **Requires cancellation reason**:
```javascript
const { reason } = req.body;

if (!reason || !reason.trim()) {
  return res.status(400).json({
    success: false,
    error: {
      code: 'REASON_REQUIRED',
      message: 'Cancellation reason is required',
    },
  });
}
```

2. **Stores cancellation details**:
```javascript
order.cancellation = {
  reason: reason.trim(),
  cancelledAt: new Date(),
  cancelledBy: req.user._id,
};
```

3. **Records reason in event timeline**:
```javascript
order.events.push({
  status: 'cancelled',
  description: `Order cancelled by customer. Reason: ${reason.trim()}`,
  timestamp: new Date(),
});
```

---

### 3. Frontend Updates ✅

**File**: `apps/web/src/pages/dashboard/customer/OrderDetail.jsx`

**Changes Made**:

1. **Imported new modal**:
```javascript
import CancelOrderModal from '@/components/common/CancelOrderModal';
```

2. **Updated state variable**:
```javascript
const [showCancelModal, setShowCancelModal] = useState(false); // Changed from showCancelConfirm
```

3. **Updated cancel mutation** to send reason:
```javascript
const cancelMutation = useMutation({
  mutationFn: async (reason) => {
    const orderIdToCancel = order?.orderId || id;
    const response = await api.post(`/orders/${orderIdToCancel}/cancel`, { reason });
    return response.data;
  },
  onSuccess: () => {
    toast.success('Order cancelled successfully');
    setShowCancelModal(false); // Close modal
    queryClient.invalidateQueries(['order', id]);
    queryClient.invalidateQueries(['orders']);
  },
  onError: (error) => {
    toast.error(error.response?.data?.error?.message || 'Failed to cancel order');
  },
});
```

4. **Updated handlers**:
```javascript
const handleCancelOrder = () => {
  setShowCancelModal(true);
};

const confirmCancelOrder = (reason) => {
  cancelMutation.mutate(reason);
};

const handleCloseCancelModal = () => {
  setShowCancelModal(false);
};
```

5. **Replaced old modal** with new CancelOrderModal:
```jsx
<CancelOrderModal
  isOpen={showCancelModal}
  onClose={handleCloseCancelModal}
  onConfirm={confirmCancelOrder}
  isLoading={cancelMutation.isPending}
  orderId={order?.orderId}
/>
```

---

## User Flow

### Step 1: User Clicks "Cancel Order"
- Button visible only if order can be cancelled (status: placed/paid)
- Opens cancellation modal

### Step 2: Select Cancellation Reason
- User must choose from 8 predefined reasons
- OR select "Other reason" and type custom text (max 500 chars)
- Validation: At least one reason must be selected

### Step 3: Submit Cancellation
- Click "Cancel Order" button
- Frontend sends reason to backend: `POST /orders/:id/cancel { reason: "..." }`
- Backend validates reason is provided
- Backend stores reason in order.cancellation
- Backend adds reason to event timeline

### Step 4: Confirmation
- Success toast: "Order cancelled successfully"
- Modal closes automatically
- Order status updates to "Cancelled"
- Order details page refreshes

---

## API Changes

### Cancel Order Endpoint

**Endpoint**: `POST /api/orders/:id/cancel`

**Request Body** (NEW):
```json
{
  "reason": "found_better_price"
}
```

OR

```json
{
  "reason": "Product arrived damaged and I need a replacement urgently"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "orderId": "ORD-XXXXX",
    "status": "cancelled",
    "cancellation": {
      "reason": "found_better_price",
      "cancelledAt": "2025-11-18T...",
      "cancelledBy": "user_id"
    },
    "events": [
      {
        "status": "cancelled",
        "description": "Order cancelled by customer. Reason: found_better_price",
        "timestamp": "2025-11-18T..."
      }
    ]
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": {
    "code": "REASON_REQUIRED",
    "message": "Cancellation reason is required"
  }
}
```

---

## Database Schema

### Order Document (After Cancellation):

```javascript
{
  _id: ObjectId("..."),
  orderId: "ORD-MI47PCASHNCXW",
  userId: ObjectId("..."),
  status: "cancelled",
  cancellation: {
    reason: "changed_mind",              // ✅ NEW
    cancelledAt: ISODate("2025-11-18"),  // ✅ NEW
    cancelledBy: ObjectId("user_id")     // ✅ NEW
  },
  events: [
    {
      status: "placed",
      description: "Order placed",
      timestamp: ISODate("2025-11-18")
    },
    {
      status: "cancelled",
      description: "Order cancelled by customer. Reason: changed_mind",  // ✅ Includes reason
      timestamp: ISODate("2025-11-18")
    }
  ]
}
```

---

## Benefits

### For Business:
1. ✅ **Analytics**: Track why orders are cancelled
2. ✅ **Insights**: Identify common issues (pricing, delivery, product issues)
3. ✅ **Improvements**: Make data-driven decisions to reduce cancellations
4. ✅ **Customer Service**: Better understand customer needs
5. ✅ **Accountability**: Know who cancelled and when

### For Customers:
1. ✅ **Express concerns**: Can explain why they're cancelling
2. ✅ **Quick selection**: Easy radio buttons for common reasons
3. ✅ **Flexibility**: Can provide custom reasons if needed
4. ✅ **Transparency**: System records their feedback

---

## Files Modified/Created

### Created (2 files):
1. ✅ `apps/web/src/components/common/CancelOrderModal.jsx` (167 lines)
2. ✅ `CANCEL_REASON_FEATURE.md` (this file)

### Modified (3 files):
1. ✅ `apps/api/src/models/Order.js` (added cancellation field)
2. ✅ `apps/api/src/controllers/orderController.js` (requires & stores reason)
3. ✅ `apps/web/src/pages/dashboard/customer/OrderDetail.jsx` (uses new modal)

---

## Analytics Potential

With cancellation reasons stored, you can now:

### Generate Reports:
```javascript
// Top cancellation reasons
db.orders.aggregate([
  { $match: { status: 'cancelled' } },
  { $group: {
    _id: '$cancellation.reason',
    count: { $sum: 1 }
  }},
  { $sort: { count: -1 } },
  { $limit: 10 }
])
```

**Example Output**:
```
found_better_price: 45
delivery_too_long: 32
changed_mind: 28
product_not_needed: 15
ordered_by_mistake: 12
wrong_item: 8
payment_issue: 5
```

### Trend Analysis:
- Track cancellation reasons over time
- Identify seasonal patterns
- Correlate with product categories
- Monitor after pricing changes

### Action Items:
- If "delivery_too_long" is common → Improve shipping times
- If "found_better_price" is high → Review pricing strategy
- If "wrong_item" frequent → Improve product descriptions/images

---

## Testing Checklist

### Functional Testing:
- [x] Modal opens when "Cancel Order" clicked
- [x] All 8 reason options display correctly
- [x] Radio button selection works
- [x] "Other reason" shows text field
- [x] Form validation prevents submission without reason
- [x] Character counter works (500 max)
- [x] Loading state shows during cancellation
- [x] Success toast appears on completion
- [x] Modal closes automatically after success
- [x] Order status updates to "Cancelled"
- [x] Cancellation reason stored in database
- [x] Event timeline includes reason

### Error Handling:
- [x] Backend rejects request without reason
- [x] Error toast shows if cancellation fails
- [x] Modal stays open on error
- [x] User can retry with different reason

---

## Future Enhancements (Optional)

### 1. Admin Dashboard Analytics
Create admin page showing:
- Cancellation rate by category
- Top cancellation reasons
- Trend charts
- Comparison by time period

### 2. Automated Follow-up
Based on cancellation reason:
- "found_better_price" → Send discount coupon
- "delivery_too_long" → Offer express shipping next time
- "product_not_needed" → Suggest similar products

### 3. Reason Categories
Group reasons into categories:
- **Price-related**: found_better_price, payment_issue
- **Logistics**: delivery_too_long
- **Product**: wrong_item, product_not_needed
- **User error**: ordered_by_mistake, changed_mind

### 4. Multi-language Support
Translate predefined reasons based on user locale

### 5. Optional Comments
Allow users to add comments in addition to selecting reason

---

## Migration Note

**Existing Cancelled Orders**:
- Orders cancelled before this update won't have `cancellation.reason`
- The field is optional, so no data migration needed
- Old events still show: "Order cancelled by customer"
- New events show: "Order cancelled by customer. Reason: ..."

---

## Summary

**Before**:
- ❌ No reason required for cancellation
- ❌ No insight into why customers cancel
- ❌ Simple confirmation dialog
- ❌ Lost opportunity for feedback

**After**:
- ✅ Reason required for all cancellations
- ✅ 8 predefined reasons + custom text option
- ✅ Reason stored in database with timestamp
- ✅ Reason included in event timeline
- ✅ Foundation for cancellation analytics
- ✅ Professional UX with dedicated modal

---

**Implemented By**: Claude Code
**Date**: 2025-11-18
**Priority**: Medium (Business Intelligence)
**Impact**: All customers cancelling orders
**Status**: ✅ Production Ready
