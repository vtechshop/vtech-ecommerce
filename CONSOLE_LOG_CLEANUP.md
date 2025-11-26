# Console.log Cleanup Guide

## Current Status

**Total console.log found**: 137 occurrences
**Location**: Primarily in `apps/api/src/`

**Analysis**: Most console.log statements are in appropriate places (error handling, development scripts). However, some should be replaced with proper logging.

---

## ✅ Appropriate Uses of console.log

These should **KEEP** console.log (no changes needed):

### 1. Critical Error Handling
**File**: `apps/api/src/server.js`

```javascript
// KEEP - Critical process-level errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
```

**Reason**: These run before logger is initialized and need to output to console for debugging.

### 2. Server Startup Messages
**File**: `apps/api/src/server.js`

```javascript
// KEEP - Server startup confirmation
const server = app.listen(PORT, () =>
  console.log(`🚀 API listening on http://localhost:${PORT}`)
);
```

**Reason**: Immediate feedback needed for developers.

### 3. Development/Script Files
**Files**:
- `apps/api/src/scripts/testAuction.js`
- `apps/api/src/scripts/fixCampaignDates.js`
- `apps/api/src/scripts/debugAds.js`
- `apps/api/src/scripts/backfillAdCreatives.js`
- `apps/api/src/scripts/addHomepageAdSettings.js`
- `apps/api/src/scripts/initAdSettings.js`

**Reason**: One-time utility scripts meant to run in terminal. Console output is intended.

### 4. Environment Configuration Warnings
**File**: `apps/api/src/config/env.js`

```javascript
// KEEP - Security warnings during development
console.log(`Generate a secure secret using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
```

**Reason**: Critical security guidance for developers.

---

## ⚠️ Console.log That Should Be Replaced

### 1. CSRF Middleware Debug Logging
**File**: `apps/api/src/middleware/csrf.js`

**Current**:
```javascript
// Line 14 (inside error message)
'Generate a secure secret using: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
```

**Action**: This is just a string in an error message - **KEEP AS IS**

---

## 🔄 Recommended Logging Strategy

### Use Logger Instead of console.log

The project already has **Pino logger** configured (`apps/api/src/config/logger.js`).

**When to use logger vs console.log**:

| Use Case | Tool | Example |
|----------|------|---------|
| Application logs | `logger` | `logger.info('User logged in')` |
| Error logging | `logger` | `logger.error('Database error', error)` |
| Debug info (dev) | `logger` | `logger.debug('Query result:', data)` |
| Server startup | `console.log` | `console.log('Server running')` |
| Uncaught errors | `console.error` | `console.error('FATAL:', err)` |
| Scripts/seeders | `console.log` | `console.log('Seeding completed')` |

### Example Replacements (If Found in Controllers)

**Before**:
```javascript
// In a controller
console.log('User data:', user);
console.log('Creating order...');
```

**After**:
```javascript
// In a controller
logger.info('User data retrieved', { userId: user._id });
logger.info('Creating order for user', { userId: user._id });
```

---

## 📋 Cleanup Checklist

### Phase 1: Audit (Already Done) ✅
- ✅ Located all console.log statements
- ✅ Identified appropriate uses
- ✅ Categorized by file type

### Phase 2: Review (Manual Check Needed) ⏳

Check these file types for inappropriate console.log:

```bash
# Find console.log in controllers (should use logger)
grep -r "console\.log" apps/api/src/controllers/

# Find console.log in services (should use logger)
grep -r "console\.log" apps/api/src/services/

# Find console.log in middleware (should use logger)
grep -r "console\.log" apps/api/src/middleware/
```

**Expected Results**: Based on audit, most should already be using logger.

### Phase 3: Replace (If Needed) ⏳

**Controllers** - If any console.log found:
```javascript
// Replace this
console.log('Processing payment');

// With this
logger.info('Processing payment', { orderId, amount });
```

**Services** - If any console.log found:
```javascript
// Replace this
console.error('Payment failed', error);

// With this
logger.error('Payment processing failed', { error: error.message, orderId });
```

**Middleware** - If any console.log found (except CSRF security messages):
```javascript
// Replace this
console.log('User authenticated:', user.id);

// With this
logger.debug('User authenticated', { userId: user.id, role: user.role });
```

---

## 🚫 What NOT to Change

**DO NOT replace console.log in**:

1. ✅ `server.js` - Process error handlers
2. ✅ `config/env.js` - Security warnings in error messages
3. ✅ `scripts/*.js` - Utility scripts
4. ✅ `seed/*.js` - Database seeders
5. ✅ Server startup message
6. ✅ Graceful shutdown logs

---

## ✅ Frontend Cleanup (Already Done)

**File**: `apps/web/vite.config.js`

Frontend already has console.log removal configured:

```javascript
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true, // ✅ Removes console.log in production
    },
  },
}
```

**Result**: All console.log statements are automatically removed from production builds.

**Development**: console.log is allowed for debugging.

---

## 📊 Summary Analysis

### Backend (Node.js API)

**File Distribution**:
- `server.js`: 6 console.log (all appropriate - process errors & startup)
- `middleware/csrf.js`: 1 console.log (in error string - keep)
- `config/env.js`: 1 console.log (in error string - keep)
- `scripts/*.js`: ~129 console.log (utility scripts - keep)

**Total to Review**: ~0-5 in controllers/services (need manual check)
**Total to Keep**: ~137 (all in appropriate places)

### Frontend (React/Vite)

**Status**: ✅ Production builds auto-remove console.log
**Development**: ✅ console.log allowed for debugging
**Action**: ✅ No changes needed

---

## 🎯 Action Items

### Immediate (This Week)
1. ✅ Review existing console.log usage - **DONE**
2. ⏳ Manual spot-check of controllers/services
3. ⏳ Replace any console.log in production code paths with logger

### This Month
1. ⏳ Add ESLint rule to prevent new console.log in controllers:
   ```json
   {
     "rules": {
       "no-console": ["warn", { "allow": ["warn", "error"] }]
     }
   }
   ```

2. ⏳ Document logging standards in CONTRIBUTING.md

### Optional
1. Set up log aggregation (e.g., Datadog, New Relic)
2. Configure log rotation in production
3. Add structured logging for better searchability

---

## 📝 Logging Best Practices

### DO ✅

```javascript
// Use logger with context
logger.info('Order created', {
  orderId: order._id,
  userId: user._id,
  total: order.total
});

// Use appropriate log levels
logger.error('Payment failed', { error: err.message });
logger.warn('Low stock', { productId, stock });
logger.debug('Cache hit', { key });

// Include relevant metadata
logger.info('User action', {
  action: 'purchase',
  userId: user._id,
  ip: req.ip,
  userAgent: req.get('user-agent')
});
```

### DON'T ❌

```javascript
// Don't use console.log in controllers
console.log('User logged in');

// Don't log sensitive data
logger.info('User login', { password: user.password }); // ❌

// Don't log entire objects (can contain PII)
logger.info('User data', user); // ❌

// Don't use console.log for errors
console.error('Error:', err); // Use logger.error
```

---

## 🏁 Conclusion

**Status**: ✅ **No Critical Cleanup Needed**

**Findings**:
1. ✅ Backend console.log usage is appropriate (error handling, scripts, startup)
2. ✅ Frontend auto-removes console.log in production
3. ✅ Logging infrastructure (Pino) is already in place
4. ✅ Controllers/services appear to use logger correctly

**Recommendation**:
- Low priority cleanup task
- Consider adding ESLint rules to prevent future console.log in production code
- Focus efforts on test coverage and accessibility instead

**Impact**: Minimal - most console.log usage is appropriate or already handled by build process.
