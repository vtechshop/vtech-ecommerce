# Login Troubleshooting Guide

## Quick Diagnostics

### 1. Check API is Running ✅
```bash
curl http://localhost:8080/health
```
**Expected:** `{"status":"ok","timestamp":"..."}`

### 2. Test Login API Directly ✅
```bash
curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@shop.test\",\"password\":\"admin123456\"}"
```
**Expected:** `{"success":true,"data":{"user":{...},"accessToken":"..."}}`

### 3. Check MongoDB is Running ✅
```bash
netstat -an | findstr "27017"
```
**Expected:** Should show `LISTENING` on port 27017

### 4. Verify Frontend Environment Variables

**File:** `e:\Project-4\Ecommerce_patched_v2\shop\apps\web\.env`

**Should contain:**
```
VITE_API_URL=http://localhost:8080/api
```

**IMPORTANT:** After changing `.env`, you MUST restart Vite:
1. Stop the dev server (Ctrl+C)
2. Run `npm run dev` again
3. Refresh browser (Ctrl+Shift+R for hard refresh)

---

## Common Issues & Solutions

### Issue 1: "Login failed" or Network Error

**Symptom:** Red error message on login page

**Check Browser Console (F12 → Console tab):**
- Look for CORS errors
- Look for network errors
- Look for "Failed to fetch" errors

**Solutions:**

#### A. Wrong API URL
The frontend has **3 places** that set the API URL:
1. `apps/web/.env` → `VITE_API_URL=http://localhost:8080/api` ✅ FIXED
2. `apps/web/src/main.jsx:15` → Uses `VITE_API_URL` ✅ OK
3. `apps/web/src/assets/utils/api.js:5` → Uses `VITE_API_URL` ✅ OK

**If still wrong port:**
```bash
# Make sure .env is correct
cat apps/web/.env

# MUST restart Vite
cd apps/web
npm run dev
```

#### B. CORS Issue
**Check backend .env:**
```
CLIENT_URL=http://localhost:5173
```

**Backend should show in logs:**
```
CORS enabled for: http://localhost:5173
```

#### C. API Not Running
```bash
# Check if API is listening
netstat -an | findstr "8080"

# If not running, start it
cd apps/api
npm run dev
```

---

### Issue 2: Database Not Seeded

**Symptom:** Login works but no admin user exists

**Solution:**
```bash
cd apps/api
npm run seed
npm run seed:settings
```

**Verify admin exists:**
```bash
# Using MongoDB Compass or mongosh
mongosh
use shop
db.users.findOne({email: "admin@shop.test"})
```

---

### Issue 3: Wrong Credentials

**Demo Accounts (from seed):**
```
Admin:     admin@shop.test     / admin123456
Vendor:    vendor@shop.test    / vendor123456
Affiliate: affiliate@shop.test / affiliate123456
Customer:  customer@shop.test  / customer123456
```

---

### Issue 4: JWT Token Issues

**Check backend .env:**
```
ACCESS_TOKEN_SECRET=your-super-secret-access-key-min-32-characters-long-abc123
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-min-32-characters-long-xyz789
```

**Both must be 32+ characters!**

---

## Browser DevTools Debugging

### Network Tab Investigation

1. Open DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for `/api/auth/login` request

**Check:**
- **Status Code:** Should be `200 OK`
  - If `404`: Wrong URL (check VITE_API_URL)
  - If `401`: Wrong credentials
  - If `500`: Server error (check backend logs)
  - If `CORS error`: Check CLIENT_URL in backend .env

- **Request URL:** Should be `http://localhost:8080/api/auth/login`
  - If it's `http://localhost:3000/api/auth/login` → You didn't restart Vite!

- **Response:** Should have:
  ```json
  {
    "success": true,
    "data": {
      "user": {...},
      "accessToken": "eyJ..."
    }
  }
  ```

### Console Tab Investigation

**Look for errors:**
- `Failed to fetch` → API not running or wrong URL
- `CORS policy` → Backend CLIENT_URL mismatch
- `Network Error` → API crashed or not accessible

---

## Step-by-Step Login Process

### 1. Start Backend
```bash
cd e:\Project-4\Ecommerce_patched_v2\shop\apps\api
npm run dev
```

**Should see:**
```
[INFO] Server running on port 8080
[INFO] Database connected
```

### 2. Seed Database (if not done)
```bash
cd e:\Project-4\Ecommerce_patched_v2\shop\apps\api
npm run seed
npm run seed:settings
```

### 3. Verify Backend .env
```
NODE_ENV=development
PORT=8080
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/shop
ACCESS_TOKEN_SECRET=your-super-secret-access-key-min-32-characters-long-abc123
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-min-32-characters-long-xyz789
```

### 4. Verify Frontend .env
```
VITE_API_URL=http://localhost:8080/api
```

### 5. Start Frontend
```bash
cd e:\Project-4\Ecommerce_patched_v2\shop\apps\web
npm run dev
```

### 6. Test in Browser
1. Go to `http://localhost:5173/login`
2. Enter:
   - Email: `admin@shop.test`
   - Password: `admin123456`
3. Click "Sign in"
4. Should redirect to home or admin dashboard

### 7. Access Admin Panel
Navigate to: `http://localhost:5173/admin-dashboard`

---

## Quick Test Script

Create a file `test-login.sh`:
```bash
#!/bin/bash
echo "Testing API health..."
curl http://localhost:8080/health
echo -e "\n\nTesting login..."
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@shop.test","password":"admin123456"}'
```

Run: `bash test-login.sh`

---

## Still Not Working?

### Provide These Details:

1. **Browser Console Errors** (F12 → Console tab)
   - Copy ALL red errors

2. **Network Request Details** (F12 → Network tab → Click login request)
   - Request URL
   - Status Code
   - Response Body

3. **Backend Logs**
   - What does the terminal running `npm run dev` show?

4. **Environment Check**
   ```bash
   # In apps/web
   cat .env

   # In apps/api
   cat .env
   ```

5. **Vite Server Status**
   - Did you restart after changing .env?
   - What port is Vite running on? (Should be 5173)

---

## Nuclear Option: Fresh Start

If nothing works:

```bash
# 1. Stop all servers (Ctrl+C)

# 2. Clear browser cache and cookies
# Browser → Settings → Clear browsing data → Cookies and cached files

# 3. Restart MongoDB
net stop MongoDB
net start MongoDB

# 4. Re-seed database
cd e:\Project-4\Ecommerce_patched_v2\shop\apps\api
npm run seed
npm run seed:settings

# 5. Start backend
npm run dev

# 6. In new terminal, start frontend
cd e:\Project-4\Ecommerce_patched_v2\shop\apps\web
npm run dev

# 7. Hard refresh browser (Ctrl+Shift+R)

# 8. Try login again
```

---

**Generated:** 2025-10-16
**For Project:** Shop Multi-Vendor E-Commerce Platform
