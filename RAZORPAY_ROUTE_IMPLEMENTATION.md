# Razorpay Route Implementation Guide

## Overview

This document describes the implementation of **Razorpay Route** (also known as Razorpay Marketplace) for automatic payment splitting and commission distribution to vendors and affiliates in the V-Tech E-commerce platform.

## What is Razorpay Route?

Razorpay Route is a marketplace solution that enables automatic payment splitting when a customer makes a purchase. Instead of manually calculating and transferring commissions, the platform automatically distributes funds to:

- **Vendors**: Receive their share (default 85%) of product sales
- **Affiliates**: Receive commission (default 5%) for referred sales
- **Platform**: Retains the platform fee automatically

## Key Features

✅ **Automatic Payment Splitting**: Funds are split instantly when payment is captured
✅ **Zero Manual Work**: No need for manual payouts or commission calculations
✅ **Instant Settlements**: Vendors/affiliates receive funds in real-time (configurable)
✅ **Commission Tracking**: Full audit trail of all transfers and commissions
✅ **Webhook Integration**: Automatic status updates for all transfers
✅ **Refund Support**: Automatic reversal of transfers when orders are refunded

## Architecture

### Flow Diagram

```
Customer Payment (₹1000)
         ↓
  Razorpay Capture
         ↓
  ┌──────────────────┐
  │ Payment Verified │
  └──────────────────┘
         ↓
  Automatic Transfers
         ↓
  ┌─────────────┬─────────────┬──────────────┐
  ↓             ↓             ↓              ↓
Vendor        Affiliate    Platform      Shipping
₹850 (85%)    ₹50 (5%)     ₹100 (10%)   (separate)
```

### Database Schema Changes

#### Vendor Model
```javascript
razorpay: {
  accountId: String,              // Razorpay Linked Account ID (acc_XXXXX)
  accountStatus: String,          // 'not_connected' | 'created' | 'activated' | 'suspended'
  accountEmail: String,
  accountPhone: String,
  kycStatus: String,              // 'pending' | 'verified' | 'rejected'
  settlementPercentage: Number,   // Default: 85
  settlementSchedule: String,     // 'instant' | 'daily' | 'weekly' | 'monthly'
  connectedAt: Date,
  lastSettlementAt: Date,
}
```

#### Affiliate Model
```javascript
razorpay: {
  accountId: String,
  accountStatus: String,
  accountEmail: String,
  accountPhone: String,
  settlementSchedule: String,     // Default: 'weekly'
  connectedAt: Date,
  lastSettlementAt: Date,
}
```

#### Commission Model
```javascript
transfer: {
  transferId: String,             // Razorpay transfer ID (trf_XXXXX)
  status: String,                 // 'pending' | 'processed' | 'reversed' | 'failed'
  processedAt: Date,
  failureReason: String,
  linkedAccountId: String,
}
```

## Implementation Details

### 1. Razorpay Utility Functions

**File**: `shop/apps/api/src/utils/razorpay.js`

New functions added:
- `createLinkedAccount(accountData)` - Create Razorpay linked account for vendor/affiliate
- `fetchLinkedAccount(accountId)` - Get linked account details
- `createTransfers(paymentId, transfers)` - Split payment to multiple accounts
- `fetchTransfer(transferId)` - Get transfer details
- `reverseTransfer(transferId, amount)` - Reverse a transfer (for refunds)

### 2. Payment Verification Flow

**File**: `shop/apps/api/src/controllers/razorpayController.js`

When payment is verified:
1. Order status updated to 'confirmed'
2. `processAutomaticTransfers()` called asynchronously
3. Transfers created for each vendor/affiliate
4. Commission records created with transfer details
5. Earnings updated in vendor/affiliate profiles

**Function**: `processAutomaticTransfers(order, razorpayPaymentId)`

### 3. Webhook Handlers

**Endpoint**: `POST /api/payment/razorpay/webhook`

Handles these events:
- `transfer.processed` - Transfer successfully completed
- `transfer.failed` - Transfer failed (updates commission status)
- `transfer.reversed` - Transfer reversed due to refund

### 4. Account Management APIs

#### Vendor Routes
**Base**: `/api/vendors`

- `POST /razorpay/connect` - Connect vendor's Razorpay account
- `GET /razorpay/status` - Get connection and earnings status

#### Affiliate Routes
**Base**: `/api/affiliates`

- `POST /razorpay/connect` - Connect affiliate's Razorpay account
- `GET /razorpay/status` - Get connection and earnings status

## Setup Instructions

### Step 1: Enable Razorpay Route

1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Navigate to **Account & Settings** → **Product Configuration**
3. Enable **Route** (Marketplace product)
4. Complete business KYC verification
5. Note: This may require contacting Razorpay support for activation

### Step 2: Configure Webhook

1. Go to **Settings** → **Webhooks**
2. Create webhook URL: `https://your-domain.com/api/payment/razorpay/webhook`
3. Enable these events:
   - `payment.captured`
   - `payment.failed`
   - `refund.created`
   - `transfer.processed` ⭐
   - `transfer.failed` ⭐
   - `transfer.reversed` ⭐
4. Set webhook secret in `.env`: `RAZORPAY_WEBHOOK_SECRET=your_secret`

### Step 3: Vendor Onboarding

#### For Vendors to Connect Their Razorpay Account:

1. Vendor must have **approved KYC** status
2. Vendor calls API endpoint:
   ```bash
   POST /api/vendors/razorpay/connect
   Authorization: Bearer <vendor_token>

   {
     "email": "vendor@example.com",
     "phone": "+919876543210",
     "contactName": "John Doe"
   }
   ```
3. System creates Razorpay linked account
4. Vendor receives account ID and status
5. Razorpay performs KYC verification (may take 24-48 hours)
6. Once activated, vendor receives automatic settlements

#### Check Connection Status:
```bash
GET /api/vendors/razorpay/status
Authorization: Bearer <vendor_token>
```

Response:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "accountId": "acc_XXXXXXXXXXXXX",
    "accountStatus": "activated",
    "kycStatus": "verified",
    "settlementPercentage": 85,
    "totalEarnings": 50000,
    "pendingEarnings": 5000
  }
}
```

### Step 4: Affiliate Onboarding

Same process as vendors, using `/api/affiliates` endpoints.

## Commission Calculation

### Example Scenario

**Order Details:**
- Product Price: ₹10,000
- Shipping: ₹500 (handled separately)
- Vendor: ABC Electronics
- Affiliate: REF-XYZ123

**Automatic Split:**

```javascript
Order Subtotal: ₹10,000

Vendor (85%):     ₹8,500  → Transfer to vendor's Razorpay account
Affiliate (5%):   ₹500    → Transfer to affiliate's Razorpay account
Platform (10%):   ₹1,000  → Remains in platform account
```

**Database Records Created:**

1. Commission record for vendor
   ```javascript
   {
     type: 'vendor',
     subjectId: vendorId,
     amount: 8500,
     percentage: 85,
     status: 'approved',
     transfer: {
       transferId: 'trf_XXXXX',
       status: 'processed',
       linkedAccountId: 'acc_VENDOR'
     }
   }
   ```

2. Commission record for affiliate
   ```javascript
   {
     type: 'affiliate',
     subjectId: affiliateId,
     amount: 500,
     percentage: 5,
     status: 'approved',
     transfer: {
       transferId: 'trf_YYYYY',
       status: 'processed',
       linkedAccountId: 'acc_AFFILIATE'
     }
   }
   ```

## Transfer Timing

### Settlement Schedules

**Vendors** (default: `instant`):
- `instant` - Funds transferred immediately after payment capture
- `daily` - Batch transfer at end of day
- `weekly` - Transfer every Monday
- `monthly` - Transfer on 1st of month

**Affiliates** (default: `weekly`):
- Helps prevent fraud by allowing time for order verification
- Can be changed to `instant` for trusted affiliates

### On-Hold Transfers

For high-risk orders, transfers can be held:

```javascript
{
  on_hold: true,
  on_hold_until: 1640995200  // Unix timestamp (release after 7 days)
}
```

This allows time to verify order before releasing funds.

## Error Handling

### Transfer Failures

If a transfer fails:
1. Webhook event `transfer.failed` received
2. Commission status set to `pending`
3. Admin notified for manual review
4. Can be retried manually via admin panel

Common failure reasons:
- Linked account not activated
- KYC pending/rejected
- Invalid bank details
- Account suspended

### Refund Scenarios

When an order is refunded:
1. Platform initiates refund to customer
2. System automatically reverses transfers via `reverseTransfer()`
3. Webhook event `transfer.reversed` received
4. Vendor/affiliate earnings adjusted
5. Commission record marked as `cancelled`

## Testing

### Test Mode

1. Use Razorpay test keys in `.env`:
   ```bash
   RAZORPAY_KEY_ID=rzp_test_XXXXX
   RAZORPAY_KEY_SECRET=test_XXXXXXXX
   ```

2. Create test linked accounts (will be auto-created in test mode)

3. Use test payment methods:
   - Card: 4111 1111 1111 1111
   - CVV: Any 3 digits
   - Expiry: Any future date

4. Check transfers in Razorpay test dashboard

### Manual Testing Checklist

- [ ] Vendor connects Razorpay account successfully
- [ ] Affiliate connects Razorpay account successfully
- [ ] Payment captured and transfers created
- [ ] Commission records created with transfer IDs
- [ ] Vendor earnings updated correctly
- [ ] Affiliate earnings updated correctly
- [ ] Webhook events received and processed
- [ ] Transfer status updates correctly
- [ ] Refund reverses transfers properly
- [ ] Failed transfers handled gracefully

## Monitoring

### Logs to Monitor

```javascript
// Successful transfer
logger.info(`Successfully created 2 transfer(s)`);
logger.info(`Commission records created and earnings updated`);

// Failed transfer
logger.error(`Transfer creation failed: ${error}`);
logger.error(`Failed transfers: [...]`);

// Webhook processing
logger.info(`Transfer processed webhook: trf_XXXXX for order ORD-123`);
logger.info(`Commission 67890 marked as paid, earnings updated`);
```

### Admin Dashboard Metrics

Recommended metrics to display:
- Total transfers processed today/week/month
- Failed transfers requiring attention
- Pending commission approvals
- Vendor/affiliate settlement summary
- Platform revenue breakdown

## Security Considerations

### Webhook Signature Verification

```javascript
const signature = req.headers['x-razorpay-signature'];
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature !== expectedSignature) {
  return res.status(400).json({ error: 'Invalid signature' });
}
```

### KYC Requirements

- Vendors must complete KYC before connecting Razorpay
- Razorpay performs additional KYC on linked accounts
- Only activated accounts receive transfers
- Regular compliance checks recommended

### Fraud Prevention

1. **Hold Transfers**: Set `on_hold: true` for new vendors
2. **Minimum Thresholds**: Don't transfer amounts < ₹100
3. **Velocity Checks**: Flag unusual transfer patterns
4. **Affiliate Verification**: Require minimum conversion before activation

## Troubleshooting

### Issue: Transfer Not Created

**Symptoms**: Payment succeeded but no transfer record

**Debug Steps**:
1. Check logs for `processAutomaticTransfers` errors
2. Verify vendor has `razorpay.accountId` and status is `activated`
3. Check commission records created but without transfer ID
4. Manually retry transfer via admin panel

### Issue: Webhook Not Received

**Symptoms**: Transfer created but status not updating

**Debug Steps**:
1. Check Razorpay dashboard → Webhooks → Event Logs
2. Verify webhook URL is correct and accessible
3. Check webhook secret matches `.env` value
4. Test webhook manually using Razorpay dashboard

### Issue: Transfer Failed

**Symptoms**: Webhook shows transfer.failed event

**Debug Steps**:
1. Check failure reason in webhook payload
2. Common issues:
   - Account not activated: Wait for KYC approval
   - Invalid bank details: Vendor must update in Razorpay dashboard
   - Account suspended: Contact Razorpay support
3. Mark commission as `pending` for manual review

## Best Practices

1. **Always verify payment before creating transfers**
   - Current implementation: ✅ Waits for payment.captured

2. **Use asynchronous transfer processing**
   - Current implementation: ✅ Non-blocking transfer creation

3. **Handle partial transfer failures gracefully**
   - Current implementation: ✅ Uses `Promise.allSettled()`

4. **Maintain audit trail**
   - Current implementation: ✅ Commission records with transfer details

5. **Regular reconciliation**
   - Recommended: Daily job to match transfers with commissions

6. **Notify stakeholders**
   - TODO: Add email notifications for transfer success/failure

## Cost Considerations

### Razorpay Route Pricing

- **Transaction Fee**: 2% + GST (standard Razorpay fee)
- **Transfer Fee**: ₹3 - ₹5 per transfer (waived for some plans)
- **Settlement Fee**: Usually free for instant settlements

**Example Cost for ₹10,000 order:**
- Razorpay fee (2%): ₹200
- Transfer fee (2 transfers): ₹10
- **Total platform cost**: ₹210

**Tip**: Negotiate transfer fee waiver with Razorpay for volume discounts

## Future Enhancements

1. **Multi-currency Support**: Handle international transactions
2. **Dynamic Commission Rules**: Category-based commission percentages
3. **Scheduled Payouts**: Batch transfers to reduce fees
4. **Withdrawal Requests**: Allow vendors to request early payout
5. **Tax Deductions**: Automatic TDS/tax deductions before transfer
6. **Analytics Dashboard**: Real-time transfer and earnings visualization

## Support

### Razorpay Support
- Email: support@razorpay.com
- Phone: +91-80-6802 4020
- Documentation: https://razorpay.com/docs/route

### Internal Support
- Technical issues: Check logs in `shop/apps/api/src/controllers/razorpayController.js`
- Business queries: Review commission records in MongoDB
- Integration help: Refer to this documentation

## Conclusion

Razorpay Route implementation provides fully automated commission distribution with:
- ✅ Zero manual intervention required
- ✅ Instant settlements for vendors/affiliates
- ✅ Complete audit trail and reconciliation
- ✅ Webhook-based status tracking
- ✅ Automatic refund handling

This eliminates the need for manual payout processing and reduces administrative overhead significantly.

---

**Last Updated**: 2025-12-19
**Version**: 1.0.0
**Author**: V-Tech Development Team
