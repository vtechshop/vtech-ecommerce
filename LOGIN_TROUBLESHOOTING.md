# Login Troubleshooting Guide

## ✅ Backend is Working Correctly

The API login endpoint is working perfectly. Test results:

### Test Users Created:
1. **Admin User:**
   - Email: `admin@example.com`
   - Password: `Password123`
   - Role: `admin`

2. **Demo Customer:**
   - Email: `demo@example.com`
   - Password: `Password123`
   - Role: `customer`

Both users can successfully log in via API (tested with curl).

---

## Common Login Issues & Solutions

### Issue 1: "Network Error" or "Failed to fetch"

**Cause:** Frontend cannot reach the backend API

**Solutions:**
1. Check if API server is running:
   ```bash
   cd E:\Project-4\Ecommerce_patched_v2\shop\apps\api
   npm start
   ```

2. Verify API is on port 8080:
   ```bash
   netstat -ano | findstr :8080
   ```

3. Check frontend `.env` file:
   ```
   File: E:\Project-4\Ecommerce_patched_v2\shop\apps\web\.env

   VITE_API_URL=http://localhost:8080/api
   ```

4. Restart the frontend dev server after changing `.env`:
   ```bash
   cd E:\Project-4\Ecommerce_patched_v2\shop\apps\web
   npm run dev
   ```

---

### Issue 2: "Invalid email or password"

**Cause:** Wrong credentials or user doesn't exist

**Solutions:**
1. Use the correct test credentials:
   - Email: `admin@example.com` or `demo@example.com`
   - Password: `Password123`

2. Create test users if they don't exist:
   ```bash
   cd E:\Project-4\Ecommerce_patched_v2\shop\apps\api
   node scripts/seedUser.js
   ```

3. Verify MongoDB is running:
   ```bash
   mongod --version
   ```

---

### Issue 3: CORS Errors

**Symptom:** Browser console shows CORS errors

**Solutions:**
1. Check API CORS configuration in `apps/api/src/app.js`:
   ```javascript
   app.use(cors({
     origin: 'http://localhost:5173',  // Must match frontend URL
     credentials: true,
   }));
   ```

2. Verify backend `.env` has correct CLIENT_URL:
   ```
   CLIENT_URL=http://localhost:5173
   ```

3. Check if frontend is running on port 5173:
   ```bash
   cd E:\Project-4\Ecommerce_patched_v2\shop\apps\web
   npm run dev
   ```

---

### Issue 4: Cookie/Session Issues

**Symptom:** Login succeeds but user is not authenticated on refresh

**Cause:** Cookies not being set or stored

**Solutions:**
1. Check browser settings - cookies must be enabled
2. Clear browser cookies and cache
3. Verify `withCredentials: true` in api.js
4. Check that both frontend and backend are on `localhost` (not mixing localhost with 127.0.0.1)

---

## Quick Test

Visit: `http://localhost:5173/test-login`

This page will test:
- Environment variables
- API connectivity
- Login functionality

---

## Starting the Application

### 1. Start MongoDB:
```bash
# MongoDB should be running on localhost:27017
mongod
```

### 2. Start Backend API:
```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\api
npm start
```
Should show: `Server running on port 8080`

### 3. Start Frontend:
```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\web
npm run dev
```
Should show: `Local: http://localhost:5173/`

### 4. Login:
- Go to: `http://localhost:5173/login`
- Email: `demo@example.com`
- Password: `Password123`
- Click "Sign in"

---

## Additional Test Users

To create more users with specific roles:

```bash
cd E:\Project-4\Ecommerce_patched_v2\shop\apps\api
node scripts/seedUser.js
```

This creates:
- **Admin:** `admin@example.com` / `Password123`
- **Customer:** `demo@example.com` / `Password123`

---

## Debugging Steps

1. **Check browser console** (F12) for errors
2. **Check browser Network tab** to see API requests/responses
3. **Check API server logs** for errors
4. **Test API directly** with curl or Postman
5. **Verify MongoDB connection** - check if users exist

---

## Support

If login still fails after trying these solutions:
1. Check browser console for specific error messages
2. Check API server console for error logs
3. Verify all services are running (MongoDB, Backend, Frontend)
4. Try in incognito/private browsing mode
