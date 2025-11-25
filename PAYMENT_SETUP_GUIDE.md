# Payment & Vendor Payout System Setup Guide

## Overview

Your e-commerce platform now has a complete payment and vendor payout system. Here's how money flows:

### Money Flow:
1. **Customer pays** → Money goes to **Admin's Stripe account** (100%)
2. **System tracks vendor commissions** → Automatically created when order is placed
3. **Order delivered** → Commissions auto-approved
4. **Admin processes payout** → Vendor receives their commission

---

## Step 1: Set Up Stripe Account

### 1.1 Create Stripe Account
1. Go to: https://dashboard.stripe.com/register
2. Sign up with your business email
3. Complete business verification

### 1.2 Get API Keys
1. Log in to Stripe Dashboard
2. Click **Developers** → **API keys**
3. Copy these keys:
   - **Secret key** (starts with `sk_test_...` for testing, `sk_live_...` for production)
   - **Publishable key** (starts with `pk_test_...` for testing, `pk_live_...` for production)

### 1.3 Configure Webhook
1. In Stripe Dashboard: **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: `https://your-domain.com/api/webhooks/stripe`
4. **Events to send**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Click **Add endpoint**
6. Copy the **Webhook signing secret** (starts with `whsec_...`)

---

## Step 2: Update Environment Variables

Open: `shop/apps/api/.env`

```env
# Payment Configuration
STRIPE_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Optional: Razorpay (for India-specific payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

**Important:** Replace `sk_test_...` and `whsec_...` with your actual keys from Stripe.

---

## Step 3: Frontend Stripe Configuration

Open: `shop/apps/web/.env`

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

---

## Step 4: Restart Servers

After updating `.env` files:

```bash
# Stop servers (Ctrl+C if running)

# Restart API server
cd shop/apps/api
npm start

# Restart Web server
cd shop/apps/web
npm run dev
```

---

## How the Payout System Works

### Automatic Commission Tracking

When a customer places an order:

```
Order Total: ₹1000
├─ Admin Platform Fee: ₹850 (85%)
└─ Vendor Commission: ₹150 (15%)
```

**Commission Percentage Priority:**
1. Product-level commission (if set on product)
2. Vendor default commission (set in vendor profile)
3. System default: **15%**

### Commission Lifecycle

```
Order Placed → Commission Created (status: pending)
     ↓
Order Delivered → Auto-Approved (status: approved)
     ↓
Admin Processes → Payout Sent (status: paid)
```

---

## Admin: How to Process Vendor Payouts

### Method 1: Via Admin Dashboard (Recommended)

1. **Log in as Admin**
2. Go to **Admin Dashboard** → **Vendor Payouts**
3. View pending payouts for all vendors
4. Click **Process Payout** next to vendor name
5. Review commission details
6. Click **Confirm Payout**

### Method 2: Batch Payout (Pay All Commissions)

1. In **Vendor Payouts** page
2. Click **Batch Pay All** for a vendor
3. System automatically pays all approved commissions

### Manual vs Automatic Payouts

#### Without Stripe Connect (Current - Manual):
- Admin clicks "Process Payout"
- System marks commissions as "paid"
- **Admin must manually transfer money** to vendor's bank account
- System shows vendor bank details for transfer

#### With Stripe Connect (Future - Automatic):
- Admin clicks "Process Payout"
- Stripe automatically transfers money to vendor's connected account
- No manual bank transfer needed

---

## Vendor: How to View Earnings

### Vendor Dashboard:

1. **Log in as Vendor**
2. Go to **Vendor Dashboard** → **Settlements**
3. View:
   - **Pending commissions** (orders not yet delivered)
   - **Approved commissions** (ready for payout)
   - **Paid commissions** (payout history)

### Bank Account Setup:

Vendors must add bank account details:
1. **Vendor Dashboard** → **KYC**
2. Fill in:
   - Account Holder Name
   - Account Number
   - Bank Name
   - IFSC Code (for India)
3. Submit for verification

---

## API Endpoints

### Admin Endpoints:

```javascript
// Get pending payouts
GET /api/admin/payouts/pending

// Process single payout
POST /api/admin/payouts/process
Body: { vendorId, amount, commissionIds }

// Batch payout (all approved commissions)
POST /api/admin/payouts/vendor/:vendorId/batch

// Get payout history
GET /api/admin/payouts/history?type=vendor&subjectId=<vendorId>

// Approve commission manually
PUT /api/admin/commissions/:id/approve

// Get all commissions
GET /api/admin/commissions?type=vendor&status=approved
```

### Vendor Endpoints:

```javascript
// Get vendor settlements
GET /api/vendors/settlements?status=approved

// Get vendor stats
GET /api/vendors/dashboard/stats
```

---

## Setting Custom Commission Rates

### Per-Product Commission:

```javascript
// When creating/updating product
{
  "title": "Product Name",
  "price": 1000,
  "vendorCommissionPercentage": 20, // 20% commission for this product
  "affiliateCommissionPercentage": 5 // 5% for affiliates
}
```

### Per-Vendor Default Commission:

```javascript
// Update vendor
PUT /api/admin/vendors/:id
{
  "defaultCommissionPercentage": 18 // All vendor's products default to 18%
}
```

---

## Testing the Payment Flow

### Test Mode (Using Stripe Test Keys):

1. **Place Test Order**:
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

2. **Check Commission Created**:
   ```bash
   # In MongoDB
   db.commissions.find({ orderId: ObjectId("...") })
   ```

3. **Mark Order as Delivered**:
   - Admin Dashboard → Orders → Update Status → "delivered"
   - Commission auto-approved

4. **Process Payout**:
   - Admin Dashboard → Vendor Payouts → Process Payout

---

## Stripe Connect Setup (Optional - For Automatic Payouts)

### What is Stripe Connect?

Stripe Connect allows you to automatically split payments and pay vendors directly through Stripe.

### Setup Steps:

1. **Enable Stripe Connect** in your Stripe Dashboard
2. **Create vendor onboarding flow**:
   - Vendors connect their Stripe account
   - System stores `stripeAccountId`
3. **Automatic payouts**:
   - System uses `stripe.transfers.create()`
   - Money automatically sent to vendor's Stripe account

### Code Changes Needed:

```javascript
// Create connected account for vendor
const account = await stripe.accounts.create({
  type: 'express',
  country: 'IN',
  email: vendor.email,
  capabilities: {
    transfers: { requested: true },
  },
});

// Save account ID
vendor.stripeAccountId = account.id;
await vendor.save();

// Create account link for vendor to complete onboarding
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'https://your-domain.com/vendor/kyc/refresh',
  return_url: 'https://your-domain.com/vendor/kyc/complete',
  type: 'account_onboarding',
});
```

---

## Commission Reports

### Admin Can View:

- Total revenue
- Total vendor commissions paid
- Total platform fees earned
- Commission breakdown by vendor
- Commission breakdown by product category

### Generate Report:

```javascript
GET /api/admin/reports/commissions?startDate=2025-01-01&endDate=2025-01-31

Response:
{
  "totalRevenue": 50000,
  "totalCommissions": 7500,
  "platformFees": 42500,
  "vendorBreakdown": [
    { "vendorName": "Vendor A", "commission": 3000 },
    { "vendorName": "Vendor B", "commission": 4500 }
  ]
}
```

---

## Troubleshooting

### Commissions Not Being Created

**Issue:** Order placed but no commission created

**Solution:**
- Check if product has `vendorId` set
- Verify vendor status is 'active'
- Check logs: `shop/apps/api/logs/`

### Commissions Not Auto-Approved

**Issue:** Order delivered but commission still pending

**Solution:**
- Check if order status is exactly 'delivered'
- Verify auto-approve is enabled in orderController
- Manually approve: `PUT /api/admin/commissions/:id/approve`

### Payout Failed

**Issue:** Error when processing payout

**Solution:**
- Check vendor has bank account details
- Verify Stripe keys are correct
- Check API logs for specific error
- If Stripe Connect: verify vendor's connected account is active

### Stripe Webhook Not Working

**Issue:** Payment succeeded but order not updated

**Solution:**
1. Check webhook URL is correct in Stripe Dashboard
2. Verify webhook secret matches `.env`
3. Test webhook with Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:8080/api/webhooks/stripe
   ```

---

## Production Checklist

Before going live:

- [ ] Replace Stripe test keys with live keys
- [ ] Update webhook URL to production domain
- [ ] Test complete payment flow with real card
- [ ] Verify vendor can see commissions
- [ ] Test payout processing
- [ ] Set up automated backup for commission data
- [ ] Configure payout schedule (daily/weekly/monthly)
- [ ] Add email notifications for payouts
- [ ] Set minimum payout threshold (e.g., ₹500)
- [ ] Enable fraud detection
- [ ] Add 2FA for admin payout processing

---

## Support

For issues or questions:
- Check logs: `shop/apps/api/logs/combined.log`
- Stripe Dashboard: https://dashboard.stripe.com
- Contact: ledvtech@gmail.com
