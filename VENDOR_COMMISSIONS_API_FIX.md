# Vendor Commissions API Fix

## Problem

When clicking the "Approve" button on the Vendor Commissions page, it showed a "Route not found" error and didn't work.

## Root Cause

The frontend component was using **POST** requests while the backend API expected **PUT** requests for commission operations. Additionally, some endpoints were missing:
- `/admin/commissions/:id/reject` endpoint didn't exist
- `/admin/commissions/bulk-approve` endpoint didn't exist

## Fixes Applied

### 1. Frontend HTTP Method Fixes

**File:** [VendorCommissions.jsx](Ecommerce/shop/apps/web/src/assets/pages/dashboard/admin/VendorCommissions.jsx)

Changed HTTP methods from POST to PUT to match backend API:

```javascript
// BEFORE (POST - incorrect)
const response = await api.post(`/admin/commissions/${commissionId}/approve`);

// AFTER (PUT - correct)
const response = await api.put(`/admin/commissions/${commissionId}/approve`);
```

**Changes Made:**
- Line 51: `approveCommission` - Changed from POST to PUT
- Line 67: `payCommission` - Changed from POST to PUT
- Line 83: `rejectCommission` - Changed from POST to PUT

### 2. Backend - Added Missing Controller Functions

**File:** [adminController.js](Ecommerce/shop/apps/api/src/controllers/adminController.js)

**Added `rejectCommission` function** (lines 868-879):
```javascript
exports.rejectCommission = async (req, res, next) => {
  try {
    const row = await Commission.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', rejectedAt: new Date() },
      { new: true }
    );
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Commission not found' } });
    logger.info(`Commission rejected: ${row._id}`);
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
};
```

**Added `bulkApproveCommissions` function** (lines 881-907):
```javascript
exports.bulkApproveCommissions = async (req, res, next) => {
  try {
    const { commissionIds } = req.body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'commissionIds must be a non-empty array' }
      });
    }

    const approvedAt = new Date();
    const result = await Commission.updateMany(
      { _id: { $in: commissionIds }, status: 'pending' },
      { status: 'approved', approvedAt }
    );

    logger.info(`Bulk approved ${result.modifiedCount} commissions`);
    res.json({
      success: true,
      data: {
        count: result.modifiedCount,
        message: `${result.modifiedCount} commission(s) approved`
      }
    });
  } catch (error) { next(error); }
};
```

### 3. Backend - Added Missing Routes

**File:** [admin.js](Ecommerce/shop/apps/api/src/routes/admin.js)

Added two new routes:

```javascript
// Line 58: Added reject route
router.put('/commissions/:id/reject', admin.rejectCommission);

// Line 60: Added bulk approve route
router.post('/commissions/bulk-approve', admin.bulkApproveCommissions);
```

**Complete Commission Routes (lines 54-61):**
```javascript
// Commissions / Payouts
router.get('/commissions', admin.getCommissions);
router.get('/commissions/stats', admin.getCommissionStats);
router.put('/commissions/:id/approve', admin.approveCommission);      // Existing
router.put('/commissions/:id/reject', admin.rejectCommission);        // NEW
router.put('/commissions/:id/pay', admin.payCommission);             // Existing
router.post('/commissions/bulk-approve', admin.bulkApproveCommissions); // NEW
router.post('/commissions/bulk-pay', admin.bulkPayCommissions);      // Existing
```

### 4. API Server Restart

Killed and restarted the API server (PID 32816) to load the new routes and controller functions.

## API Endpoints Summary

### Commission Management Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|---------|
| GET | `/admin/commissions` | Get all commissions with filters | ✅ Existing |
| GET | `/admin/commissions/stats` | Get commission statistics | ✅ Existing |
| PUT | `/admin/commissions/:id/approve` | Approve a commission | ✅ Existing |
| PUT | `/admin/commissions/:id/reject` | Reject a commission | 🆕 NEW |
| PUT | `/admin/commissions/:id/pay` | Mark commission as paid | ✅ Existing |
| POST | `/admin/commissions/bulk-approve` | Bulk approve commissions | 🆕 NEW |
| POST | `/admin/commissions/bulk-pay` | Bulk pay commissions | ✅ Existing |

## Files Modified

1. **Frontend:**
   - [VendorCommissions.jsx](Ecommerce/shop/apps/web/src/assets/pages/dashboard/admin/VendorCommissions.jsx) - Fixed HTTP methods

2. **Backend:**
   - [adminController.js](Ecommerce/shop/apps/api/src/controllers/adminController.js) - Added `rejectCommission` and `bulkApproveCommissions`
   - [admin.js](Ecommerce/shop/apps/api/src/routes/admin.js) - Added routes for reject and bulk-approve

## Testing

### Actions Now Working:

✅ **Approve Button** - Approves individual commission (changes status from pending → approved)
✅ **Reject Button** - Rejects individual commission (changes status from pending → cancelled)
✅ **Pay Button** - Marks approved commission as paid (changes status from approved → paid)
✅ **Approve All Pending** - Bulk approves all pending commissions

### Status Flow:

```
PENDING → [Approve] → APPROVED → [Pay] → PAID
   ↓
[Reject]
   ↓
CANCELLED
```

## Related Documentation

- [VENDOR_COMMISSIONS_MENU_ADDED.md](VENDOR_COMMISSIONS_MENU_ADDED.md) - How the menu item was added
- [VENDOR_COMMISSIONS_COMPREHENSIVE_VIEW.md](VENDOR_COMMISSIONS_COMPREHENSIVE_VIEW.md) - Full feature documentation

---

**Date:** November 19, 2025
**Issue:** "Route not found" error when clicking Approve button
**Status:** ✅ Fixed
**API Server:** http://localhost:8080/
**Frontend:** http://localhost:5175/admin-dashboard/vendor-commissions
