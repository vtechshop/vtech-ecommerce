# 🚀 Quick Start - Login Fix Guide

## ✅ FIXES APPLIED

1. **Frontend .env fixed** - Now points to correct API URL (`http://localhost:8080/api`)
2. **Backend .env verified** - All secrets and configurations correct
3. **Test page created** - Debug page at `/test-login`
4. **All security issues fixed** - RBAC, JWT, validations working

---

## 🔧 REQUIRED STEPS TO FIX LOGIN

### Step 1: Stop ALL Running Servers

**Press `Ctrl+C`** in both terminal windows (frontend and backend)

### Step 2: Restart Backend (API)

```bash
cd e:\Project-4\Ecommerce_patched_v2\shop\apps\api
npm run dev
```

**You should see:**
```
[INFO] Server running on port 8080
[INFO] Database connected successfully
```

**If you see JWT errors:**
```
Error: ACCESS_TOKEN_SECRET must be set and at least 32 characters long
```
**This means:** Backend .env is correct and security is working! ✅

### Step 3: Seed Database (If Not Done)

**In a new terminal:**
```bash
cd e:\Project-4\Ecommerce_patched_v2\shop\apps\api
npm run seed
npm run seed:settings
```

**You should see:**
```
✅ Seeded successfully
Admin user created
Settings created
```

### Step 4: Restart Frontend (Vite)

**CRITICAL:** You MUST restart Vite for `.env` changes to take effect!

```bash
cd e:\Project-4\Ecommerce_patched_v2\shop\apps\web
npm run dev
```

**You should see:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 5: Clear Browser Cache

**Important!** Old cached API calls might still be using port 3000.

**Option A - Hard Refresh:**
- Press `Ctrl+Shift+R` in your browser

**Option B - Clear Cache:**
1. Open DevTools (F12)
2. Right-click the refresh button → "Empty Cache and Hard Reload"

**Option C - Incognito:**
- Open an incognito/private window

---

## 🧪 TEST THE CONNECTION

### Test Page (Recommended)

1. Go to: **`http://localhost:5173/test-login`**
2. Click the **"Test Login"** button
3. You should see:
   - ✅ `VITE_API_URL: http://localhost:8080/api`
   - ✅ Health check success
   - ✅ Login success with admin user and access token

**If test page shows success:** Login is working! Proceed to actual login page.

**If test page shows error:** See troubleshooting below.

---

## 🔐 LOGIN TO ADMIN PANEL

### Step 1: Go to Login Page
```
http://localhost:5173/login
```

### Step 2: Enter Admin Credentials
```
Email:    admin@shop.test
Password: admin123456
```

### Step 3: Click "Sign in"

You should be redirected to the home page or dashboard.

### Step 4: Access Admin Dashboard
```
http://localhost:5173/admin-dashboard
```

---

## 📋 All Admin Routes

After successful login, you can access:

| URL | Description |
|-----|-------------|
| `/admin-dashboard` | Main Dashboard |
| `/admin-dashboard/users` | User Management |
| `/admin-dashboard/products` | Products |
| `/admin-dashboard/categories` | Categories |
| `/admin-dashboard/orders` | Orders |
| `/admin-dashboard/vendors` | Vendors |
| `/admin-dashboard/affiliates` | Affiliates |
| `/admin-dashboard/ads` | Ads |
| `/admin-dashboard/cms` | CMS |
| `/admin-dashboard/settings` | **Settings** ⭐ NEW |

---

## ❌ Troubleshooting

### Issue: Test page shows "VITE_API_URL: NOT SET"

**Problem:** Vite didn't reload the `.env` file

**Solution:**
1. Stop Vite (Ctrl+C)
2. Verify `.env` exists:
   ```bash
   type e:\Project-4\Ecommerce_patched_v2\shop\apps\web\.env
   ```
   Should show: `VITE_API_URL=http://localhost:8080/api`
3. Start Vite again: `npm run dev`
4. Hard refresh browser (Ctrl+Shift+R)

### Issue: Test page shows "Network Error" or "ERR_CONNECTION_REFUSED"

**Problem:** API is not running

**Solution:**
1. Check if API is running:
   ```bash
   netstat -an | findstr "8080"
   ```
   Should show `LISTENING`
2. If not listening, start API:
   ```bash
   cd e:\Project-4\Ecommerce_patched_v2\shop\apps\api
   npm run dev
   ```

### Issue: Test page shows "Invalid email or password"

**Problem:** Database not seeded

**Solution:**
```bash
cd e:\Project-4\Ecommerce_patched_v2\shop\apps\api
npm run seed
```

### Issue: Login page still fails after test page works

**Problem:** Browser cache or cookie issues

**Solution:**
1. Open DevTools (F12)
2. Application tab → Storage → Clear site data
3. Or use Incognito mode
4. Try login again

### Issue: "Failed to fetch" error

**Problem:** Request still going to wrong port

**Check in DevTools (F12 → Network tab):**
- Try to login
- Look at the `/auth/login` request
- Check "Request URL"

**If URL is `http://localhost:3000/api/auth/login`:**
- You didn't restart Vite!
- Stop and start Vite again

**If URL is `http://localhost:8080/api/auth/login` but still fails:**
- Check CORS in backend .env: `CLIENT_URL=http://localhost:5173`
- Restart backend

---

## 🎯 Expected Behavior

### When Everything Works:

1. **Test page (`/test-login`):**
   - Shows green success box
   - Displays admin user info
   - Shows JWT access token

2. **Login page (`/login`):**
   - No error messages
   - After clicking "Sign in", redirects immediately
   - You're logged in (can see user menu)

3. **Admin dashboard (`/admin-dashboard`):**
   - Shows dashboard stats
   - Sidebar shows admin menu items
   - Settings page has 10 categories

---

## 🔍 Debug Checklist

Before asking for help, verify:

- [ ] Backend is running on port 8080
  ```bash
  netstat -an | findstr "8080"
  ```

- [ ] MongoDB is running on port 27017
  ```bash
  netstat -an | findstr "27017"
  ```

- [ ] Database is seeded
  ```bash
  # Run if not done
  npm run seed
  ```

- [ ] Frontend `.env` is correct
  ```bash
  type e:\Project-4\Ecommerce_patched_v2\shop\apps\web\.env
  # Should show: VITE_API_URL=http://localhost:8080/api
  ```

- [ ] Backend `.env` has JWT secrets (32+ characters)
  ```bash
  type e:\Project-4\Ecommerce_patched_v2\shop\apps\api\.env
  # Should have ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET
  ```

- [ ] Vite was restarted after changing `.env`

- [ ] Browser cache was cleared (Ctrl+Shift+R)

- [ ] Test page works (`/test-login`)

---

## 📞 Still Not Working?

If nothing works, provide:

1. **Test page results** - Screenshot or copy of `/test-login` output

2. **Browser console errors** (F12 → Console tab)

3. **Network request details** (F12 → Network tab → login request)
   - Request URL
   - Status code
   - Response

4. **Backend terminal output** - Any errors?

5. **Environment files:**
   ```bash
   type e:\Project-4\Ecommerce_patched_v2\shop\apps\web\.env
   type e:\Project-4\Ecommerce_patched_v2\shop\apps\api\.env
   ```

---

## 🎉 Success Confirmation

**You know it's working when:**

1. ✅ Test page shows green success
2. ✅ Login redirects you immediately
3. ✅ You can access `/admin-dashboard`
4. ✅ Settings page shows 10 categories
5. ✅ No errors in browser console

---

**Last Updated:** 2025-10-16
**Status:** All fixes applied, ready to test
