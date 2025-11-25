# INR Currency Setup Guide

This guide explains how to complete the INR (Indian Rupee) currency setup for your e-commerce platform.

## ✅ Changes Already Applied

The following changes have been made to your codebase:

### 1. Frontend Currency Formatting
- **File**: `apps/web/src/assets/utils/format.js`
- Default currency: USD → **INR**
- Locale: en-US → **en-IN**
- All prices now display with ₹ symbol

### 2. Database Settings
- **File**: `apps/api/src/seed/seedSettings.js`
- Currency: **INR**
- Timezone: **Asia/Kolkata (IST)**
- COD Max: **₹40,000**
- Free Shipping Threshold: **₹8,000**
- Standard Shipping: **₹499**
- Express Shipping: **₹1,299**
- Razorpay: **Enabled**

### 3. Tax Configuration
- Tax rate updated from 10% to **18% GST**
- Updated in:
  - `checkoutController.js`
  - `orderService.js`
  - `Cart.js` model

### 4. Shipping Costs (INR)
- Free: ₹0
- Standard: ₹499
- Priority: ₹799
- Express: ₹1,199
- Two-Day: ₹1,599
- Overnight: ₹2,399
- Same-Day: ₹3,199

### 5. Payment Gateways
- Default currency changed to INR in:
  - `paymentController.js`
  - `checkoutController.js`
- Razorpay enabled (ideal for Indian market)
- Stripe also supports INR

## 🚀 Setup Instructions

### Step 1: Run the INR Setup Script

This master script will:
- Update all settings to INR
- Convert existing product prices from USD to INR
- Setup Indian GST tax rates for all states

```bash
cd apps/api
node src/seed/setupINRCurrency.js
```

**OR** run the scripts individually:

```bash
# 1. Update settings
node src/seed/seedSettings.js

# 2. Convert product prices (only if you have existing products)
node src/seed/convertPricesToINR.js

# 3. Setup Indian GST rates
node src/seed/seedIndianGST.js
```

### Step 2: Configure Razorpay

Razorpay is the preferred payment gateway for India as it supports:
- UPI (Google Pay, PhonePe, Paytm, etc.)
- Net Banking
- Credit/Debit Cards
- Wallets (PayTM, Mobikwik, etc.)
- EMI options
- Cash on Delivery

**Get Razorpay API Keys:**

1. Sign up at [https://razorpay.com](https://razorpay.com)
2. Go to Dashboard → Settings → API Keys
3. Generate Test/Live keys

**Add to your `.env` file:**

```env
# Payment Gateways
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxx

# Optional: Keep Stripe for international payments
STRIPE_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

### Step 3: Update Phone Number Format

Update the support phone in your `.env` to Indian format:

```env
SUPPORT_PHONE=+91-1234567890
```

### Step 4: Restart Your Application

```bash
# Stop the current server (Ctrl+C)

# Restart API server
cd apps/api
npm run dev

# Restart Web server (in another terminal)
cd apps/web
npm run dev
```

## 📊 GST Configuration

The setup script configures GST for all Indian states and union territories:

### GST Structure
- **Standard Rate**: 18% (configurable per product category)
- **CGST**: 9% (Central GST)
- **SGST**: 9% (State GST) - for intra-state sales
- **UTGST**: 9% (Union Territory GST) - for UT sales
- **IGST**: 18% (Integrated GST) - for inter-state sales

### Common GST Rates in India
You can customize these per product category:
- **0%**: Essential items (books, fresh produce)
- **5%**: Daily necessities (sugar, tea, coffee)
- **12%**: Processed foods, computers
- **18%**: Most goods and services (default)
- **28%**: Luxury items (cars, tobacco, etc.)

### Covered States & UTs
All 28 states and 8 union territories are configured with appropriate GST rates.

## 💰 Price Conversion

The conversion script uses a rate of **1 USD = 83 INR** (you can adjust in `convertPricesToINR.js`).

**What gets converted:**
- Product prices
- Compare-at prices (for discounts)
- Cost prices
- Variant prices

**All prices are rounded to the nearest rupee.**

## 🧪 Testing Checklist

After setup, test the following:

- [ ] Product prices display in ₹ (Rupees)
- [ ] Cart shows correct GST (18%)
- [ ] Shipping costs are in INR
- [ ] Checkout calculates totals correctly
- [ ] COD limit is ₹40,000
- [ ] Free shipping works above ₹8,000
- [ ] Razorpay payment integration works
- [ ] Order confirmation emails show ₹
- [ ] Admin dashboard shows ₹

## 🔧 Advanced Configuration

### Customize GST Rates per Category

Edit the Tax model or create category-specific rules:

```javascript
// Example: 5% GST for groceries
const groceryTax = {
  category: 'groceries',
  rate: 0.05,
  cgst: 0.025,
  sgst: 0.025,
};
```

### Add More Shipping Options

Edit `checkoutController.js` to add region-specific shipping:

```javascript
// Example: Metro city same-day delivery
{
  id: 'metro-same-day',
  name: 'Metro Same Day',
  description: 'Same day delivery in metro cities',
  cost: 2499,
  estimatedDays: 0,
  availableFor: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad'],
}
```

### Configure State-Specific Rules

The Tax model supports state-specific configurations. You can add:
- Different rates for different states
- Tax exemptions
- Special economic zone handling

## 📱 Razorpay Features to Enable

Once Razorpay is configured, you can enable:

1. **UPI AutoPay**: Recurring payments
2. **Payment Links**: Share payment links via WhatsApp/SMS
3. **Smart Collect**: Virtual accounts for vendors
4. **Route**: Split payments to vendors automatically
5. **Subscriptions**: For membership/subscription products

## 🌍 Multi-Currency Support (Future)

Your platform is now optimized for INR, but the architecture supports multiple currencies:

```javascript
// You can add more currencies in settings
{
  key: 'site.currencies',
  value: ['INR', 'USD', 'EUR'],
  type: 'array',
}
```

## 📞 Support

If you encounter issues:

1. Check MongoDB is running
2. Verify .env configuration
3. Check logs in `apps/api/logs/`
4. Ensure all npm packages are installed

## 🎉 Congratulations!

Your e-commerce platform is now fully configured for the Indian market with INR currency, GST compliance, and Razorpay integration!

---

**Need Help?** Check the main README.md or raise an issue in the project repository.
