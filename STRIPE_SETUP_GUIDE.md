# Stripe Payment Integration - Complete Setup Guide

## ✅ What's Already Installed

Your e-commerce platform already has **complete Stripe integration**! Here's what exists:

### Backend (API)
- ✅ Stripe package installed
- ✅ StripeAdapter implemented (`src/adapters/payment/StripeAdapter.js`)
- ✅ PaymentService with multi-provider support
- ✅ Payment routes (`/api/payment/intent`, `/api/payment/confirm`)
- ✅ Webhook handlers for Stripe events
- ✅ Order payment tracking

### Features Implemented
- ✅ Create payment intents
- ✅ Confirm payments
- ✅ Refunds
- ✅ Webhook handling for automatic order updates
- ✅ Payment status tracking
- ✅ Multi-currency support

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Get Stripe API Keys

1. **Sign up for Stripe** (if you haven't already)
   - Go to: https://dashboard.stripe.com/register
   - Create account
   - Verify email

2. **Get your API keys**
   - Go to: https://dashboard.stripe.com/test/apikeys
   - Copy **Publishable key** (starts with `pk_test_`)
   - Copy **Secret key** (starts with `sk_test_`)

3. **Get webhook secret** (for production)
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click "+ Add endpoint"
   - Endpoint URL: `https://yourdomain.com/api/payment/webhook/stripe`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Click "Add endpoint"
   - Copy **Signing secret** (starts with `whsec_`)

---

### Step 2: Configure Environment Variables

Edit `.env` file in `shop/apps/api/`:

```env
# Payment Configuration
STRIPE_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**For Testing (No Webhook Required):**
```env
STRIPE_KEY=sk_test_51Ab...your_key_here
STRIPE_WEBHOOK_SECRET=
```

---

### Step 3: Restart API Server

```bash
cd shop/apps/api
npm run dev
```

You should see:
```
✅ MongoDB connected
🚀 API listening on http://localhost:8080
```

---

## 💳 How to Use Stripe in Your App

### Backend API Endpoints

#### 1. Create Payment Intent
**Endpoint:** `POST /api/payment/intent`

**Request:**
```json
{
  "amount": 100,
  "currency": "USD",
  "provider": "stripe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pi_3Ab123...",
    "clientSecret": "pi_3Ab123..._secret_xyz",
    "amount": 100,
    "currency": "usd",
    "status": "requires_payment_method"
  }
}
```

#### 2. Confirm Payment
**Endpoint:** `POST /api/payment/confirm`

**Request:**
```json
{
  "paymentIntentId": "pi_3Ab123...",
  "provider": "stripe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pi_3Ab123...",
    "status": "succeeded",
    "amount": 100
  }
}
```

---

## 🎨 Frontend Integration

### Install Stripe React Components

```bash
cd shop/apps/web
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Create Checkout Component

```jsx
// components/payment/StripeCheckout.jsx
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import api from '@/utils/api';

// Load Stripe (use your publishable key)
const stripePromise = loadStripe('pk_test_your_publishable_key_here');

const CheckoutForm = ({ amount, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // Create payment intent on mount
    const createPaymentIntent = async () => {
      try {
        const response = await api.post('/payment/intent', {
          amount: amount,
          currency: 'USD',
          provider: 'stripe',
        });
        setClientSecret(response.data.data.clientSecret);
      } catch (error) {
        console.error('Failed to create payment intent:', error);
        onError?.(error);
      }
    };

    if (amount > 0) {
      createPaymentIntent();
    }
  }, [amount]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setLoading(true);

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        console.error('Payment failed:', result.error.message);
        onError?.(result.error);
      } else if (result.paymentIntent.status === 'succeeded') {
        console.log('Payment successful!', result.paymentIntent.id);
        onSuccess?.(result.paymentIntent);
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-gray-300 rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : `Pay $${amount}`}
      </button>
    </form>
  );
};

const StripeCheckout = ({ amount, onSuccess, onError }) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm amount={amount} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
};

export default StripeCheckout;
```

---

### Use in Checkout Page

```jsx
// pages/Checkout.jsx
import React, { useState } from 'react';
import StripeCheckout from '@/components/payment/StripeCheckout';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/common/ToastContainer';

const Checkout = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [totalAmount, setTotalAmount] = useState(100); // Get from cart

  const handlePaymentSuccess = (paymentIntent) => {
    toast.success('Payment successful!');
    // Create order with payment details
    // Navigate to success page
    navigate(`/order/success?payment_intent=${paymentIntent.id}`);
  };

  const handlePaymentError = (error) => {
    toast.error(error.message || 'Payment failed. Please try again.');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          {/* Show cart items */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>${totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-bold mb-4">Payment Details</h2>
          <StripeCheckout
            amount={totalAmount}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>🔒 Secure payment powered by Stripe</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
```

---

## 🧪 Testing Stripe Payments

### Test Card Numbers

Stripe provides test cards for testing different scenarios:

#### Successful Payment
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

#### Card Declined
```
Card Number: 4000 0000 0000 0002
Expiry: Any future date
CVC: Any 3 digits
```

#### Insufficient Funds
```
Card Number: 4000 0000 0000 9995
Expiry: Any future date
CVC: Any 3 digits
```

#### 3D Secure Authentication
```
Card Number: 4000 0027 6000 3184
Expiry: Any future date
CVC: Any 3 digits
```

More test cards: https://stripe.com/docs/testing

---

## 🔔 Webhook Testing (Development)

### Using Stripe CLI

1. **Install Stripe CLI**
   ```bash
   # Windows (with Scoop)
   scoop install stripe

   # Mac
   brew install stripe/stripe-cli/stripe

   # Or download from: https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe**
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**
   ```bash
   stripe listen --forward-to localhost:8080/api/payment/webhook/stripe
   ```

   You'll see:
   ```
   Ready! Your webhook signing secret is whsec_xxx...
   ```

4. **Copy webhook secret to .env**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxx...
   ```

5. **Test a payment**
   In another terminal:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

---

## 💰 Currencies Supported

Stripe supports 135+ currencies. Common ones:

| Currency | Code | Symbol |
|----------|------|--------|
| US Dollar | USD | $ |
| Euro | EUR | € |
| British Pound | GBP | £ |
| Indian Rupee | INR | ₹ |
| Canadian Dollar | CAD | C$ |
| Australian Dollar | AUD | A$ |
| Japanese Yen | JPY | ¥ |

### Change Currency

```jsx
// When creating payment intent
const response = await api.post('/payment/intent', {
  amount: 100,
  currency: 'INR', // Change to your currency
  provider: 'stripe',
});
```

---

## 🔐 Security Best Practices

### 1. Never Expose Secret Key
```jsx
// ❌ WRONG - Never expose in frontend
const stripe = require('stripe')('sk_test_...');

// ✅ CORRECT - Keep in backend .env
// Backend: process.env.STRIPE_KEY
```

### 2. Use Publishable Key in Frontend
```jsx
// ✅ CORRECT - Safe to expose
const stripePromise = loadStripe('pk_test_...');
```

### 3. Verify Webhook Signatures
```javascript
// ✅ Already implemented in paymentController.js
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 4. Use HTTPS in Production
```
❌ http://yourdomain.com (Not secure)
✅ https://yourdomain.com (Secure)
```

---

## 📊 Viewing Payments in Stripe Dashboard

### Test Mode
- URL: https://dashboard.stripe.com/test/payments
- See all test transactions
- No real money charged

### Live Mode
- URL: https://dashboard.stripe.com/payments
- Real transactions
- Real money processed

### What You Can See:
- Payment amount
- Customer details
- Payment method
- Status (Succeeded/Failed)
- Refunds
- Disputes

---

## 🔄 How Payment Flow Works

### Complete Flow Diagram

```
┌──────────────┐
│   Customer   │
│  adds items  │
│   to cart    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Checkout   │
│     Page     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Frontend: Create Payment Intent Request         │
│  POST /api/payment/intent                        │
│  { amount: 100, currency: "USD" }                │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Backend: Create Stripe Payment Intent           │
│  stripe.paymentIntents.create()                  │
│  Returns: clientSecret                           │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Frontend: Show Stripe Card Element              │
│  Customer enters card details                    │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Frontend: Confirm Card Payment                  │
│  stripe.confirmCardPayment(clientSecret)         │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Stripe: Process Payment                         │
│  - Charge card                                   │
│  - Send webhook to backend                       │
└──────┬───────────────────────────────────────────┘
       │
       ├─────────────────────┬─────────────────────┐
       │                     │                     │
       ▼                     ▼                     ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Webhook    │      │  Frontend   │      │   Order     │
│  Received   │      │  Gets       │      │   Updated   │
│             │      │  Success    │      │   to "Paid" │
└─────────────┘      └─────────────┘      └─────────────┘
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Payment adapter stripe not configured"

**Cause:** STRIPE_KEY not set in .env

**Solution:**
```env
# Add to .env
STRIPE_KEY=sk_test_your_key_here
```

Restart server:
```bash
npm run dev
```

---

### Issue 2: Webhook signature verification failed

**Cause:** Wrong webhook secret

**Solution:**
1. Get correct secret from Stripe Dashboard → Webhooks
2. Update .env:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_correct_secret_here
   ```
3. Restart server

---

### Issue 3: "Stripe is not defined" in frontend

**Cause:** Stripe.js not loaded

**Solution:**
```bash
cd shop/apps/web
npm install @stripe/stripe-js @stripe/react-stripe-js
```

---

### Issue 4: Payment works but order not updated

**Cause:** Webhook not configured or not reaching server

**Solutions:**

**Development:**
```bash
# Use Stripe CLI
stripe listen --forward-to localhost:8080/api/payment/webhook/stripe
```

**Production:**
- Add webhook endpoint in Stripe Dashboard
- URL: `https://yourdomain.com/api/payment/webhook/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

---

## 📈 Going Live (Production)

### Checklist Before Going Live

- [ ] Replace test keys with live keys
  ```env
  STRIPE_KEY=sk_live_your_live_key_here
  STRIPE_WEBHOOK_SECRET=whsec_live_webhook_secret
  ```

- [ ] Configure production webhook endpoint
  - URL: `https://yourdomain.com/api/payment/webhook/stripe`
  - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

- [ ] Update frontend publishable key
  ```javascript
  const stripePromise = loadStripe('pk_live_your_live_key_here');
  ```

- [ ] Enable HTTPS on your domain

- [ ] Test with real card (small amount)

- [ ] Set up email notifications for failed payments

- [ ] Configure refund policy in Stripe Dashboard

- [ ] Enable dispute notifications

---

## 💡 Advanced Features

### 1. Save Card for Future Use

```javascript
const paymentMethod = await stripe.createPaymentMethod({
  type: 'card',
  card: elements.getElement(CardElement),
});

// Attach to customer
await stripe.paymentMethods.attach(paymentMethod.id, {
  customer: customerId,
});
```

### 2. Subscriptions

```javascript
// Backend
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: 'price_xxx' }],
});
```

### 3. Refunds

```javascript
// Already implemented!
// POST /api/payment/refund
const result = await paymentService.refund('stripe', paymentId, amount);
```

---

## 📞 Support & Resources

### Stripe Documentation
- Getting Started: https://stripe.com/docs/payments/quickstart
- Testing: https://stripe.com/docs/testing
- Webhooks: https://stripe.com/docs/webhooks
- API Reference: https://stripe.com/docs/api

### Stripe Dashboard
- Test Mode: https://dashboard.stripe.com/test
- Live Mode: https://dashboard.stripe.com

### Your Implementation
- Backend: `shop/apps/api/src/adapters/payment/StripeAdapter.js`
- Routes: `shop/apps/api/src/routes/payment.js`
- Controller: `shop/apps/api/src/controllers/paymentController.js`

---

## Summary

✅ **Stripe is already fully integrated** in your backend!

**To start using:**
1. Add STRIPE_KEY to `.env`
2. Restart API server
3. Install frontend packages: `@stripe/stripe-js`, `@stripe/react-stripe-js`
4. Create checkout component (see example above)
5. Test with test cards

**Your payment system includes:**
- ✅ Payment intents
- ✅ Webhooks
- ✅ Order tracking
- ✅ Refunds
- ✅ Multi-currency support

**Next steps:**
1. Get Stripe API keys from dashboard
2. Add keys to .env
3. Create frontend checkout component
4. Test with test cards
5. Go live! 🚀
