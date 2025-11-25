# Critical Fixes Guide - E-Commerce Platform

## Priority Fixes for Test Failures

Based on comprehensive testing, here are the prioritized fixes to improve test pass rates.

---

## ✅ COMPLETED FIXES

### 1. Playwright Setup ✅
- Installed and configured Playwright
- Converted all 55 E2E tests from Cypress
- Fixed test credentials to match database
- Added proper navigation waits

### 2. ProductCard Component ✅
- Added `data-testid="product-card"` attribute
- Added `data-cy="product-card"` attribute for Cypress compatibility

---

## 🔴 CRITICAL BACKEND FIXES (Required for E-Commerce Functionality)

### Fix 1: Configure Payment Integration

**Issue**: Payment endpoints returning 500 errors because API keys are empty

**Location**: `shop/apps/api/.env`

**Current**:
```env
STRIPE_KEY=
STRIPE_WEBHOOK_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

**Fix Options**:

#### Option A: Use Test/Development Mode (Recommended for Testing)

Add these to `shop/apps/api/.env`:
```env
# Stripe Test Keys (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_KEY=sk_test_your_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Razorpay Test Keys (get from https://dashboard.razorpay.com/app/website-app-settings/api-keys)
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

#### Option B: Mock Payment Service for Tests

Create `shop/apps/api/src/services/mockPaymentService.js`:
```javascript
class MockPaymentService {
  async createPaymentIntent(provider, amount, currency, metadata) {
    return {
      id: `mock_pi_${Date.now()}`,
      client_secret: `mock_secret_${Date.now()}`,
      amount,
      currency,
      status: 'requires_payment_method'
    };
  }

  async confirmPayment(provider, paymentIntentId) {
    return {
      id: paymentIntentId,
      status: 'succeeded',
      amount: 1000
    };
  }

  async refund(provider, paymentId, amount) {
    return {
      id: `mock_refund_${Date.now()}`,
      status: 'succeeded',
      amount
    };
  }

  getAdapter(provider) {
    return this;
  }
}

module.exports = new MockPaymentService();
```

Then update `shop/apps/api/src/services/paymentService.js`:
```javascript
const env = require('../config/env');

// Use mock service in development if no keys configured
if (env.NODE_ENV === 'development' && !env.STRIPE_KEY && !env.RAZORPAY_KEY_ID) {
  module.exports = require('./mockPaymentService');
} else {
  // ... existing code
}
```

**After Fix**: Restart backend server
```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\api
npm run dev
```

---

### Fix 2: Fix Order Cancellation Endpoint

**Issue**: `/api/orders/:orderId/cancel` returning 500 error

**Location**: Check `shop/apps/api/src/controllers/orderController.js`

**Likely Issues**:
1. AuditLog model not properly configured
2. Missing error handling
3. Order status validation failing

**Quick Fix**: Add error logging to see exact issue

```javascript
exports.cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: 'Order not found' }
      });
    }

    // Check if cancellation is allowed
    if (!['placed', 'paid', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: { message: `Cannot cancel order with status: ${order.status}` }
      });
    }

    order.status = 'cancelled';
    order.cancellationReason = reason ||  'Customer requested cancellation';
    order.cancelledAt = new Date();

    await order.save();

    // Try audit log, but don't fail if it errors
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'order_cancelled',
        userId: req.user._id,
        entity: 'Order',
        entityId: order._id,
        changes: { status: 'cancelled', reason }
      });
    } catch (auditError) {
      console.error('Audit log failed:', auditError.message);
      // Continue anyway
    }

    res.json({
      success: true,
      data: order,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    next(error);
  }
};
```

---

### Fix 3: Fix Shipping Update Endpoints

**Issue**: Shipping endpoints returning 500 errors

**Location**: `shop/apps/api/src/controllers/shippingController.js` or `orderController.js`

**Quick Fix**: Add null checks and better error handling

```javascript
exports.setCarrierAndAWB = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { carrier, awb } = req.body;

    if (!carrier || !awb) {
      return res.status(400).json({
        success: false,
        error: { message: 'Carrier and AWB are required' }
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: 'Order not found' }
      });
    }

    // Initialize shipment object if it doesn't exist
    if (!order.shipment) {
      order.shipment = {};
    }

    order.shipment.carrier = carrier;
    order.shipment.awb = awb;
    order.shipment.updatedAt = new Date();

    await order.save();

    res.json({
      success: true,
      data: { shipment: order.shipment },
      message: 'Shipping details updated'
    });
  } catch (error) {
    console.error('Set carrier/AWB error:', error);
    next(error);
  }
};

exports.markAsShipped = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: 'Order not found' }
      });
    }

    if (order.status !== 'processing' && order.status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: { message: `Cannot ship order with status: ${order.status}` }
      });
    }

    order.status = 'shipped';
    if (!order.shipment) {
      order.shipment = {};
    }
    order.shipment.shippedAt = new Date();

    await order.save();

    res.json({
      success: true,
      data: order,
      message: 'Order marked as shipped'
    });
  } catch (error) {
    console.error('Mark as shipped error:', error);
    next(error);
  }
};
```

---

### Fix 4: Fix Checkout Endpoints

**Issue**: Checkout endpoints failing

**Location**: `shop/apps/api/src/controllers/checkoutController.js`

**Quick Fix**: Ensure all required fields are handled properly

```javascript
exports.initiateCheckout = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { shippingAddress, billingAddress } = req.body;

    // Get user's cart
    const Cart = require('../models/Cart');
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cart is empty' }
      });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of cart.items) {
      if (!item.productId) continue;
      subtotal += item.productId.price * item.quantity;
    }

    const shipping = 0; // Calculate based on address
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + shipping + tax;

    res.json({
      success: true,
      data: {
        cart: cart.items,
        subtotal,
        shipping,
        tax,
        total,
        shippingAddress,
        billingAddress
      }
    });
  } catch (error) {
    console.error('Initiate checkout error:', error);
    next(error);
  }
};
```

---

## 🟡 HIGH PRIORITY FRONTEND FIXES (Improve E2E Test Pass Rate)

### Fix 5: Add Test Attributes to Cart Components

**Location**: Find cart component files

```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\web\src
# Find cart components
find . -name "*Cart*.jsx" -o -name "*cart*.jsx"
```

**Add to Cart Button/Link**:
```jsx
<Link to="/cart" data-testid="cart-button" data-cy="cart-button">
  <ShoppingCart />
  <span data-testid="cart-count" data-cy="cart-count">
    {itemCount}
  </span>
</Link>
```

**Cart Item Component**:
```jsx
<div className="cart-item" data-testid="cart-item" data-cy="cart-item">
  <img src={item.image} data-testid="item-image" />
  <h3 data-testid="item-name">{item.name}</h3>
  <span data-testid="item-price">${item.price}</span>
  <input
    type="number"
    name="qty"
    data-testid="item-quantity"
    value={item.quantity}
  />
  <button
    data-testid="remove-item-btn"
    onClick={handleRemove}
  >
    Remove
  </button>
</div>
```

---

### Fix 6: Add Test Attributes to Forms

**Registration Form**:
```jsx
<form onSubmit={handleRegister} data-testid="register-form">
  <input
    name="name"
    data-testid="register-name"
    placeholder="Full Name"
  />
  <input
    name="email"
    type="email"
    data-testid="register-email"
    placeholder="Email"
  />
  <input
    name="password"
    type="password"
    data-testid="register-password"
    placeholder="Password"
  />
  <input
    name="confirmPassword"
    type="password"
    data-testid="register-confirm-password"
    placeholder="Confirm Password"
  />
  <button
    type="submit"
    data-testid="register-submit"
  >
    Sign Up
  </button>
</form>
```

**Login Form**: (Should already be working, but verify attributes exist)

---

### Fix 7: Update Test Selectors to Match Actual UI

Since tests are timing out looking for elements, update the tests to use actual class names from your UI.

**Quick Check**: Run tests in headed mode to see what's on the page
```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\web
npm run test:playwright:headed
```

Watch what elements appear and update selectors accordingly.

---

## 📝 VERIFICATION STEPS

### After Backend Fixes:

```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\api
npm test

# Expected: 55/58 tests passing (95%)
```

### After Frontend Fixes:

```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\web
npm run test:playwright

# Expected: 35-45/55 tests passing (70-80%)
```

---

## 🎯 QUICK WINS (30-Minute Fixes)

1. **Add Mock Payment Service** (15 min)
   - Create mockPaymentService.js
   - Update paymentService.js to use it in development
   - Restart backend

2. **Add Test Attributes to 5 Key Components** (15 min)
   - ProductCard ✅ (already done)
   - Cart button/link
   - Cart item
   - Register form
   - Login form (verify)

**Expected Result**: Jump from 7.3% to ~50% E2E pass rate

---

## 📊 SUCCESS METRICS

**Current**:
- Backend: 79.3% (46/58)
- Frontend: 7.3% (4/55)
- Overall: 44.2% (50/113)

**After Quick Wins**:
- Backend: 90% (52/58) - with mock payment
- Frontend: 50% (27/55) - with test attributes
- Overall: 70% (79/113)

**After Full Fixes**:
- Backend: 95% (55/58)
- Frontend: 80% (44/55)
- Overall: 88% (99/113)

---

## 🔧 IMPLEMENTATION ORDER

### Day 1 (2 hours):
1. Add mock payment service (30 min)
2. Fix order cancellation (30 min)
3. Add test attributes to 5 components (1 hour)

### Day 2 (2 hours):
1. Fix shipping endpoints (1 hour)
2. Fix checkout endpoints (1 hour)

### Day 3 (2 hours):
1. Update remaining test selectors (1 hour)
2. Run full test suite and fix remaining issues (1 hour)

---

## 📞 SUPPORT

If you need help with any fixes:

1. **Payment Setup**:
   - Stripe: https://stripe.com/docs/keys
   - Razorpay: https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/

2. **Test Debugging**:
   ```bash
   # Run in debug mode
   npm run test:playwright:debug

   # Run in UI mode
   npm run test:playwright:ui
   ```

3. **View Error Details**:
   ```bash
   # Backend logs
   cd E:\Project-4\Ecommerce_patched_v2\shop\apps\api
   npm run dev
   # Check console for errors

   # Frontend test report
   cd E:\Project-4\Ecommerce_patched_v2\shop\apps\web
   npx playwright show-report
   ```

---

**Created**: 2025-11-03
**Priority**: CRITICAL for production readiness
**Estimated Time**: 6 hours total implementation

