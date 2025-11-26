# Complete Website Error Analysis & Fixes

## Error Summary

| # | Error Type | Severity | Status | Impact |
|---|------------|----------|--------|--------|
| 1 | Port 8080 Conflict | 🔴 CRITICAL | Fixing | Server crashes on restart |
| 2 | CSRF generateToken | 🔴 CRITICAL | Fixing | /api/csrf-token returns 500 |
| 3 | Email Transporter | 🟡 WARNING | Fixing | Emails won't send |
| 4 | Duplicate Mongoose Indexes | 🟡 WARNING | Fixing | Performance degradation |
| 5 | TLS Certificate Warning | 🟡 WARNING | Fixing | Security vulnerability |

---

## 1. Port 8080 Already in Use (CRITICAL)

**Error:**
```
Error: listen EADDRINUSE: address already in use :::8080
```

**Root Cause:**
- API server is already running on port 8080
- Nodemon tries to restart but port is taken
- Causes continuous crash loop

**Impact:**
- Server cannot start
- API becomes unavailable after file changes
- Development workflow disrupted

**Solution:**
Kill existing process and ensure clean restart

---

## 2. CSRF Token Generation Error (CRITICAL)

**Error:**
```
TypeError: generateToken is not a function
at getCsrfToken (csrf.js:53:17)
```

**Root Cause:**
- `csrf-csrf` library doesn't export `generateToken` directly
- Wrong destructuring of library exports
- Function name mismatch

**Impact:**
- `/api/csrf-token` endpoint returns 500 error
- Any route requiring CSRF fails
- Cart was failing before we disabled CSRF for it

**Solution:**
Fix CSRF token generation to use correct library API

---

## 3. Email Transporter Verification Failed (WARNING)

**Error:**
```
ERROR: Email transporter verification failed:
```

**Root Cause:**
- SMTP credentials not configured or invalid
- Email service (Gmail/SendGrid) not set up
- Missing environment variables

**Impact:**
- Password reset emails won't send
- Order confirmation emails won't send
- Verification emails won't send
- KYC notifications won't send

**Solution:**
Configure proper email credentials or disable email verification

---

## 4. Duplicate Mongoose Schema Indexes (WARNING)

**Errors (9 occurrences):**
```
Warning: Duplicate schema index on {"email":1} found
Warning: Duplicate schema index on {"userId":1} found
Warning: Duplicate schema index on {"guestId":1} found
Warning: Duplicate schema index on {"code":1} found
Warning: Duplicate schema index on {"vendorId":1} found
Warning: Duplicate schema index on {"slug":1} found (x2)
Warning: Duplicate schema index on {"key":1} found
```

**Root Cause:**
- Index defined BOTH in schema field options AND via `schema.index()`
- Example:
  ```javascript
  // WRONG - Duplicate index
  email: { type: String, index: true, unique: true }  // Index 1
  schema.index({ email: 1 })  // Index 2 - DUPLICATE
  ```

**Impact:**
- MongoDB creates duplicate indexes
- Slower write operations
- Wasted memory
- Confusing database structure

**Solution:**
Remove duplicate index definitions from schemas

---

## 5. TLS Certificate Rejection Disabled (WARNING)

**Error:**
```
Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0'
makes TLS connections and HTTPS requests insecure by disabling certificate verification.
```

**Root Cause:**
- Environment variable `NODE_TLS_REJECT_UNAUTHORIZED=0` is set
- Disables SSL certificate validation
- Usually set to bypass development SSL errors

**Impact:**
- **SEVERE SECURITY RISK** in production
- Man-in-the-middle attacks possible
- No SSL certificate validation
- Should NEVER be in production

**Solution:**
Remove this environment variable

---

## Fix Priority

### Immediate (Critical):
1. ✅ Kill port 8080 process
2. ✅ Fix CSRF token generation
3. ✅ Remove TLS rejection disable

### Important (Warnings):
4. ✅ Configure email or disable email verification
5. ✅ Remove duplicate Mongoose indexes

---

## Files to Fix

1. **Port conflict**: Kill process (command)
2. **CSRF**: `shop/apps/api/src/middleware/csrf.js`
3. **Email**: `shop/apps/api/src/config/email.js` or `.env`
4. **Mongoose indexes**: All model files in `shop/apps/api/src/models/`
5. **TLS**: `shop/apps/api/.env`

---

**Status**: Fixes in progress...
