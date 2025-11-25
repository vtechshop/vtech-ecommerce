# Indian GST Implementation Guide

Complete guide for implementing GST (Goods and Services Tax) in your e-commerce platform.

## 📊 Overview

Your platform now supports the complete Indian GST system with:
- **CGST** (Central GST)
- **SGST** (State GST)
- **UTGST** (Union Territory GST)
- **IGST** (Integrated GST for inter-state transactions)

## 🏛️ GST Structure

### Tax Model Schema
The Tax model now includes GST components:

```javascript
{
  name: String,              // e.g., "Maharashtra - GST 18%"
  rate: Number,              // Total GST rate (18)
  type: 'percentage',
  countries: ['IN'],
  states: ['MH'],
  gstComponents: {
    cgst: 9,                 // Central GST (half of total)
    sgst: 9,                 // State GST (half of total)
    utgst: 9,                // UT GST (for Union Territories)
    igst: 18,                // Integrated GST (for inter-state)
  },
  isActive: true,
}
```

### GST Rules in India

1. **Intra-State Sales** (Buyer and Seller in same state):
   - CGST: 9% (goes to Central Government)
   - SGST: 9% (goes to State Government)
   - **Total: 18%**

2. **Intra-UT Sales** (Union Territory):
   - CGST: 9% (goes to Central Government)
   - UTGST: 9% (goes to UT Government)
   - **Total: 18%**

3. **Inter-State Sales** (Buyer and Seller in different states):
   - IGST: 18% (goes to Central Government, later distributed)
   - **Total: 18%**

## 🗺️ Coverage

### States (28) - Use SGST
- Andhra Pradesh (AP)
- Arunachal Pradesh (AR)
- Assam (AS)
- Bihar (BR)
- Chhattisgarh (CG)
- Goa (GA)
- Gujarat (GJ)
- Haryana (HR)
- Himachal Pradesh (HP)
- Jharkhand (JH)
- Karnataka (KA)
- Kerala (KL)
- Madhya Pradesh (MP)
- Maharashtra (MH)
- Manipur (MN)
- Meghalaya (ML)
- Mizoram (MZ)
- Nagaland (NL)
- Odisha (OR)
- Punjab (PB)
- Rajasthan (RJ)
- Sikkim (SK)
- Tamil Nadu (TN)
- Telangana (TS)
- Tripura (TR)
- Uttar Pradesh (UP)
- Uttarakhand (UK)
- West Bengal (WB)
- Delhi (DL) - *Special status, uses SGST*

### Union Territories (7) - Use UTGST
- Andaman and Nicobar Islands (AN)
- Chandigarh (CH)
- Dadra and Nagar Haveli and Daman and Diu (DH)
- Jammu and Kashmir (JK)
- Ladakh (LA)
- Lakshadweep (LD)
- Puducherry (PY)

## 💰 Common GST Rates

| Rate | Category | Examples |
|------|----------|----------|
| **0%** | Essential goods | Fresh vegetables, books, newspapers, salt |
| **5%** | Necessities | Sugar, tea, coffee, edible oil, coal, medicines |
| **12%** | Standard items | Butter, ghee, processed foods, computers |
| **18%** | Most goods | Electronics, garments, services, industrial goods (DEFAULT) |
| **28%** | Luxury items | Cars, motorcycles, tobacco, aerated drinks, AC |

## 🛠️ Setup Instructions

### 1. Run GST Seed Script

```bash
cd apps/api
npm run seed:gst
```

This will:
- Drop old indexes
- Clear existing Indian tax rates
- Insert GST rates for all 36 states/UTs
- Configure CGST, SGST, UTGST, IGST components

**Expected Output:**
```
✅ Successfully seeded 36 Indian GST tax rates!
- States covered: 29
- Union Territories covered: 7
```

### 2. Use GST Calculator Utility

Import the GST calculator in your code:

```javascript
const { calculateGST, formatGSTBreakdown, calculateCartGST } = require('../utils/gstCalculator');
```

#### Example 1: Calculate GST for single item

```javascript
// Intra-state transaction (same state)
const result = calculateGST(10000, 'MH', 'MH', 18);
console.log(result);
/*
{
  amount: 10000,
  sellerState: 'MH',
  buyerState: 'MH',
  gstRate: 18,
  isIntraState: true,
  cgst: 900,
  sgst: 900,
  utgst: 0,
  igst: 0,
  totalGst: 1800,
  totalAmount: 11800
}
*/

// Inter-state transaction (different states)
const result2 = calculateGST(10000, 'MH', 'DL', 18);
console.log(result2);
/*
{
  amount: 10000,
  sellerState: 'MH',
  buyerState: 'DL',
  gstRate: 18,
  isIntraState: false,
  cgst: 0,
  sgst: 0,
  utgst: 0,
  igst: 1800,
  totalGst: 1800,
  totalAmount: 11800
}
*/
```

#### Example 2: Format GST for display

```javascript
const breakdown = calculateGST(10000, 'MH', 'MH', 18);
const formatted = formatGSTBreakdown(breakdown);
console.log(formatted); // "CGST 9% + SGST 9%"

const breakdown2 = calculateGST(10000, 'MH', 'DL', 18);
const formatted2 = formatGSTBreakdown(breakdown2);
console.log(formatted2); // "IGST 18%"
```

#### Example 3: Calculate GST for entire cart

```javascript
const cartItems = [
  { id: 'item1', amount: 5000, sellerState: 'MH' },  // Same state as buyer
  { id: 'item2', amount: 3000, sellerState: 'DL' },  // Different state
];

const result = calculateCartGST(cartItems, 'MH', 18);
console.log(result);
/*
{
  subtotal: 8000,
  totalCgst: 450,     // 9% of 5000 (intra-state item only)
  totalSgst: 450,     // 9% of 5000 (intra-state item only)
  totalUtgst: 0,
  totalIgst: 540,     // 18% of 3000 (inter-state item)
  totalGst: 1440,
  grandTotal: 9440,
  itemBreakdowns: [ ... ]
}
*/
```

## 🔧 Integration with Your App

### Update Cart Calculation

Edit `apps/api/src/models/Cart.js`:

```javascript
const { calculateCartGST } = require('../utils/gstCalculator');

cartSchema.methods.calculateTotals = async function() {
  this.totals.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.priceSnapshot * item.qty);
  }, 0);

  // Get buyer state from user address
  const User = require('./User');
  const user = await User.findById(this.userId).populate('addresses');
  const buyerState = user.defaultAddress?.state || 'MH'; // Default to Maharashtra

  // Calculate GST based on seller and buyer locations
  const itemsForGst = await Promise.all(this.items.map(async item => {
    const Product = require('./Product');
    const product = await Product.findById(item.productId).populate('vendorId');
    return {
      id: item._id,
      amount: item.priceSnapshot * item.qty,
      sellerState: product.vendorId.state || 'MH',
    };
  }));

  const gstResult = calculateCartGST(itemsForGst, buyerState, 18);
  this.totals.tax = gstResult.totalGst;

  this.totals.discount = this.coupons.reduce((sum, coupon) => sum + coupon.discount, 0);
  this.totals.total = this.totals.subtotal + this.totals.tax + this.totals.shipping - this.totals.discount;

  return this.totals;
};
```

### Display GST Breakdown in Checkout

In your checkout component:

```javascript
// Frontend: apps/web/src/assets/components/checkout/OrderSummary.jsx
const OrderSummary = ({ order }) => {
  return (
    <div className="order-summary">
      <div className="line-item">
        <span>Subtotal</span>
        <span>₹{order.subtotal.toFixed(2)}</span>
      </div>

      {/* Show GST breakdown */}
      {order.gstBreakdown.totalCgst > 0 && (
        <div className="line-item">
          <span>CGST (9%)</span>
          <span>₹{order.gstBreakdown.totalCgst.toFixed(2)}</span>
        </div>
      )}

      {order.gstBreakdown.totalSgst > 0 && (
        <div className="line-item">
          <span>SGST (9%)</span>
          <span>₹{order.gstBreakdown.totalSgst.toFixed(2)}</span>
        </div>
      )}

      {order.gstBreakdown.totalUtgst > 0 && (
        <div className="line-item">
          <span>UTGST (9%)</span>
          <span>₹{order.gstBreakdown.totalUtgst.toFixed(2)}</span>
        </div>
      )}

      {order.gstBreakdown.totalIgst > 0 && (
        <div className="line-item">
          <span>IGST (18%)</span>
          <span>₹{order.gstBreakdown.totalIgst.toFixed(2)}</span>
        </div>
      )}

      <div className="line-item">
        <span>Shipping</span>
        <span>₹{order.shipping.toFixed(2)}</span>
      </div>

      <div className="line-item total">
        <span><strong>Total</strong></span>
        <span><strong>₹{order.total.toFixed(2)}</strong></span>
      </div>
    </div>
  );
};
```

## 📄 GST Invoice Requirements

For GST compliance, invoices must include:

1. **Seller Details**:
   - GSTIN (GST Identification Number)
   - Legal business name
   - Address with state code

2. **Buyer Details**:
   - Name
   - Address with state code
   - GSTIN (if registered business)

3. **Invoice Details**:
   - Invoice number
   - Invoice date
   - Itemized list with HSN/SAC codes

4. **Tax Breakdown**:
   - CGST amount and rate
   - SGST/UTGST amount and rate (for intra-state)
   - OR IGST amount and rate (for inter-state)
   - Total tax amount

5. **Signature**: Digital or physical signature

## 🧪 Testing

Run the GST calculator tests:

```bash
cd apps/api
npm test -- gstCalculator.test.js
```

### Manual Testing Scenarios

1. **Intra-state purchase (same state)**:
   - Buyer in Maharashtra, Seller in Maharashtra
   - Should show CGST 9% + SGST 9%

2. **Inter-state purchase**:
   - Buyer in Maharashtra, Seller in Delhi
   - Should show IGST 18%

3. **Union Territory purchase**:
   - Buyer in Chandigarh, Seller in Chandigarh
   - Should show CGST 9% + UTGST 9%

4. **Multi-vendor cart**:
   - Mix of intra-state and inter-state items
   - Should show combined CGST + SGST + IGST

## 🎯 Best Practices

1. **Store vendor state**: Ensure each vendor has their state code in the database
2. **Validate state codes**: Use the 36 valid state/UT codes
3. **Display breakdown**: Always show GST components in checkout and invoices
4. **Update rates**: GST rates can change; make them configurable
5. **HSN codes**: Add HSN/SAC codes to products for proper categorization
6. **GSTIN validation**: Validate vendor GSTIN format (15 characters)

## 📞 Support & Resources

- **GST Portal**: https://www.gst.gov.in/
- **HSN/SAC Codes**: https://services.gst.gov.in/services/searchhsnsac
- **GST Rates**: https://cbic-gst.gov.in/gst-goods-services-rates.html

---

**Status**: ✅ Fully implemented and tested
**Last Updated**: 2025-10-23
