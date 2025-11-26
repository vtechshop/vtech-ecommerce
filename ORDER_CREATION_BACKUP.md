# Order Creation Function - Backup

**Date:** November 21, 2025
**Status:** Backup before major modification

## Original Behavior

- Creates ONE order with all items
- All vendors share same order ID
- Notifications sent with same order ID

## File Being Modified

`shop/apps/api/src/controllers/orderController.js`
Function: `exports.createOrder` (lines 88-455)

## Reason for Backup

About to implement order splitting by vendor.
Each vendor will get separate order with unique sequential ID.

---

**If rollback needed:** Restore from git history or this documentation.

