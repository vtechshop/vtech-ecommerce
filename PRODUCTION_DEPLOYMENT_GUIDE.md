# Production Deployment Configuration Guide

## Current Issue

The checkout is failing with `404 Not Found` when trying to POST to `https://api.vtechkitchen.com/api/orders`.

## Root Causes

1. **Backend not deployed to api.vtechkitchen.com** - The API server may not be running at that domain
2. **Frontend using wrong API URL** - The production build might be using incorrect environment variables
3. **Corrupted cart data** - The cart contains invalid product IDs that need to be cleared

## Quick Fix (Immediate)

### Option 1: Use Render Backend (Recommended)

Update your **Vercel** environment variables:

```bash
VITE_API_URL=https://vtech-ecommerce.onrender.com/api
```

**Steps:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (vtech-ecommerce or vtechkitchen)
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_API_URL` or add it
5. Set value to: `https://vtech-ecommerce.onrender.com/api`
6. Redeploy: Go to **Deployments** → Click "..." on latest → **Redeploy**

### Option 2: Deploy Backend to api.vtechkitchen.com

If you want to use `api.vtechkitchen.com`, you need to:

1. **Deploy the backend** to a server (Render, Railway, etc.)
2. **Set up DNS** to point `api.vtechkitchen.com` to your backend server
3. **Configure CORS** in backend to allow `vtechkitchen.com` origin

## Current Deployment Setup

### Frontend (Vercel)
- **URL**: `https://vtechkitchen.com` or `https://www.vtechkitchen.com`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite (React)

### Backend (Should be on Render)
- **URL**: `https://vtech-ecommerce.onrender.com`
- **API Base**: `https://vtech-ecommerce.onrender.com/api`
- **Framework**: Express.js
- **Database**: MongoDB Atlas

## Environment Variables

### Frontend (Vercel)

**Required:**
```bash
VITE_API_URL=https://vtech-ecommerce.onrender.com/api
```

**Optional:**
```bash
VITE_RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXX
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_META_PIXEL_ID=XXXXXXXXXX
```

### Backend (Render)

**Required:**
```bash
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secure-jwt-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret
CLIENT_URL=https://vtechkitchen.com
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXX
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

**Optional:**
```bash
STRIPE_KEY=sk_live_XXXXXXXXXX
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Vercel Deployment Steps

1. **Connect Repository**
   ```bash
   # If not already connected
   vercel login
   vercel link
   ```

2. **Configure Project Settings**
   - Root Directory: `shop/apps/web`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Set Environment Variables**
   ```bash
   vercel env add VITE_API_URL production
   # Enter: https://vtech-ecommerce.onrender.com/api
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

## Render Backend Deployment

1. **Create Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - Name: `vtech-ecommerce-api`
   - Region: Choose closest to your users
   - Branch: `main`
   - Root Directory: `shop/apps/api`
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Free or paid

3. **Environment Variables**
   Add all required variables from the list above

4. **Custom Domain (Optional)**
   - Go to Settings → Custom Domain
   - Add `api.vtechkitchen.com`
   - Update DNS records as instructed

## DNS Configuration (for api.vtechkitchen.com)

If using custom domain for backend:

### If Backend on Render:
```
Type: CNAME
Name: api
Value: your-service-name.onrender.com
TTL: 3600
```

### If Backend elsewhere:
```
Type: A
Name: api
Value: [Your server IP]
TTL: 3600
```

## CORS Configuration

Ensure backend allows your frontend domain:

**File**: `shop/apps/api/src/app.js`

```javascript
const allowedOrigins = [
  'https://vtechkitchen.com',
  'https://www.vtechkitchen.com',
  'https://vtech-ecommerce.vercel.app',
  // ... other origins
];
```

## Testing Production Deployment

### 1. Test API Health
```bash
curl https://vtech-ecommerce.onrender.com/api/health
```

Expected response:
```json
{
  "uptime": 123.45,
  "timestamp": 1234567890,
  "status": "OK",
  "services": {
    "database": "connected"
  }
}
```

### 2. Test Frontend API Connection
Open browser console on production site:
```javascript
fetch('https://vtech-ecommerce.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
```

### 3. Test Cart & Checkout
1. Clear browser cache and cookies
2. Add a product to cart
3. Proceed to checkout
4. Check console for errors

## Troubleshooting

### Issue: 404 on /api/orders

**Check:**
1. Backend is deployed and running
2. `VITE_API_URL` matches backend URL
3. Backend `/api/orders` route exists
4. CORS allows your frontend domain

**Fix:**
```bash
# Verify backend URL
curl https://vtech-ecommerce.onrender.com/api/health

# Check Vercel env vars
vercel env ls

# Redeploy frontend
vercel --prod
```

### Issue: CORS Error

**Symptoms:** Browser console shows CORS policy error

**Fix:**
1. Check `allowedOrigins` in `shop/apps/api/src/app.js`
2. Add your frontend domain
3. Redeploy backend

### Issue: "Product not found" Error

**Cause:** Cart has corrupted product IDs

**Fix:**
1. Open DevTools Console (F12)
2. Run: `localStorage.clear()`
3. Refresh page
4. Add products again

### Issue: Environment Variables Not Updating

**Fix:**
```bash
# Vercel
vercel env pull .env.production.local
vercel --prod

# Render
# Update in dashboard → Settings → Environment
# Then: Manual Deploy → Deploy latest commit
```

## Current Code Fixes Applied

### 1. ProductId Extraction Fix
**File**: `shop/apps/web/src/assets/pages/Checkout.jsx`

Fixed handling of populated productId fields from cart:
```javascript
let productId = item.productId;
if (typeof productId === 'object' && productId !== null) {
  productId = productId._id || productId.id;
}
```

### 2. Analytics Tracking Fix
**File**: `shop/apps/web/src/assets/utils/analytics.js`

Fixed productId in tracking functions to handle populated objects.

### 3. Razorpay Route Integration
**Files**: Multiple backend files

Added automatic commission splits for vendors and affiliates.

## Next Steps

1. **Immediate**: Update `VITE_API_URL` on Vercel to use Render backend
2. **Short-term**: Clear any corrupted cart data
3. **Long-term**: Consider setting up `api.vtechkitchen.com` properly if needed

## Support

- **Backend Logs**: Check Render dashboard → Logs
- **Frontend Logs**: Check Vercel dashboard → Deployments → Function Logs
- **Browser Console**: Check for client-side errors

## Useful Commands

```bash
# Vercel
vercel --prod                    # Deploy production
vercel env pull                  # Download env vars
vercel logs                      # View logs
vercel domains ls                # List domains

# Git
git status                       # Check changes
git add .                        # Stage all changes
git commit -m "message"          # Commit changes
git push origin main             # Push to GitHub

# Local Testing
npm run dev                      # Start dev server
npm run build                    # Test build
npm run preview                  # Preview production build
```

---

**Last Updated**: 2025-12-19
**Version**: 2.0.0
