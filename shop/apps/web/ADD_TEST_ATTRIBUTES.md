# Remaining Test Attribute Fixes

## ✅ ALREADY COMPLETED

1. **Header.jsx** - ✅ Cart button and user menu
2. **ProductCard.jsx** - ✅ Product cards
3. **CartItem.jsx** - ✅ Cart item, quantity, remove button, price

## 📝 REMAINING FIXES NEEDED

### Register.jsx

Find the form element around line 85 and update:

**Current**:
```jsx
<form onSubmit={handleSubmit} className="space-y-6">
```

**Update to**:
```jsx
<form onSubmit={handleSubmit} className="space-y-6" data-testid="register-form">
```

Find each input field and add data-testid:

**Name input** (around line 90-100):
```jsx
<input
  type="text"
  name="name"
  data-testid="register-name"
  ...
/>
```

**Email input**:
```jsx
<input
  type="email"
  name="email"
  data-testid="register-email"
  ...
/>
```

**Password input**:
```jsx
<input
  type="password"
  name="password"
  data-testid="register-password"
  ...
/>
```

**Confirm Password input**:
```jsx
<input
  type="password"
  name="confirmPassword"
  data-testid="register-confirm-password"
  ...
/>
```

**Submit button** (around line 160):
```jsx
<button
  type="submit"
  data-testid="register-submit"
  ...
>
  Sign Up
</button>
```

### Login.jsx

Find the form element and update:

**Form**:
```jsx
<form onSubmit={handleSubmit} data-testid="login-form">
```

**Email input**:
```jsx
<input
  type="email"
  name="email"
  data-testid="login-email"
  ...
/>
```

**Password input**:
```jsx
<input
  type="password"
  name="password"
  data-testid="login-password"
  ...
/>
```

**Submit button**:
```jsx
<button
  type="submit"
  data-testid="login-submit"
  ...
>
  Sign In
</button>
```

### ProductGrid or Home Page

If there's an "Add to Cart" button on product cards, add:

```jsx
<button
  onClick={addToCart}
  data-testid="add-to-cart-btn"
  data-cy="add-to-cart-btn"
>
  Add to Cart
</button>
```

### Cart.jsx (Cart Page)

Find the "Proceed to Checkout" button:

```jsx
<button
  onClick={proceedToCheckout}
  data-testid="checkout-btn"
  data-cy="checkout-btn"
>
  Proceed to Checkout
</button>
```

Find "Continue Shopping" button:

```jsx
<button
  onClick={continueShopping}
  data-testid="continue-shopping-btn"
>
  Continue Shopping
</button>
```

### Checkout Page Components

If there's a checkout page, add:

**Shipping form inputs**:
```jsx
<input name="fullName" data-testid="shipping-name" />
<input name="address" data-testid="shipping-address" />
<input name="city" data-testid="shipping-city" />
<input name="zipCode" data-testid="shipping-zip" />
```

**Payment method options**:
```jsx
<input
  type="radio"
  name="paymentMethod"
  value="cod"
  data-testid="payment-cod"
/>
<input
  type="radio"
  name="paymentMethod"
  value="card"
  data-testid="payment-card"
/>
```

**Place Order button**:
```jsx
<button
  type="submit"
  data-testid="place-order-btn"
>
  Place Order
</button>
```

## 🎯 Quick Reference

Add these attributes to these elements:

| Element | Attribute Value |
|---------|----------------|
| Register form | `data-testid="register-form"` |
| Register name input | `data-testid="register-name"` |
| Register email input | `data-testid="register-email"` |
| Register password input | `data-testid="register-password"` |
| Register confirm password | `data-testid="register-confirm-password"` |
| Register submit button | `data-testid="register-submit"` |
| Login form | `data-testid="login-form"` |
| Login email input | `data-testid="login-email"` |
| Login password input | `data-testid="login-password"` |
| Login submit button | `data-testid="login-submit"` |
| Add to cart button | `data-testid="add-to-cart-btn"` |
| Checkout button | `data-testid="checkout-btn"` |
| Continue shopping button | `data-testid="continue-shopping-btn"` |

## ✅ After Adding All Attributes

Run tests to verify improvements:

```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\web
npm run test:playwright
```

**Expected Result**: 35-45 tests passing (65-80% pass rate)

