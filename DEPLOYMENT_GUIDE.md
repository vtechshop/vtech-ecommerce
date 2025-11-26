# V-Tech Shop Deployment Guide

Complete guide for deploying V-Tech Shop to production (Render + Netlify).

---

## 🎯 Architecture Overview

- **Frontend**: React + Vite → Deployed on **Netlify**
- **Backend**: Node.js + Express → Deployed on **Render.com**
- **Database**: MongoDB Atlas (Cloud)
- **Cache**: Upstash Redis (Cloud)

---

## 📦 1. Backend Deployment (Render.com)

### Step 1: Create Web Service on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `vtechshop/Vtech-shop`
4. Configure:
   ```
   Name: vtech-shop
   Region: Singapore (or closest to Mumbai)
   Branch: main
   Root Directory: Ecommerce/shop/apps/api
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

### Step 2: Environment Variables (Render)

Add these in **Environment** section:

```env
NODE_ENV=production
PORT=8080
APP_URL=https://vtech-shop.onrender.com
CLIENT_URL=https://loquacious-sfogliatella-745014.netlify.app

# MongoDB Atlas
MONGO_URI=mongodb+srv://Vtech-shop:Vtech%238090@vtech-shop.38ajpbv.mongodb.net/shop?retryWrites=true&w=majority&appName=vtech-shop

# Upstash Redis
REDIS_HOST=sought-bulldog-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AU12AAIncDJiZGYxMmM1MGM0NDI0NGFlYjU1MjAzNjdjNDNjMWUxNnAyMTk4MzA
REDIS_DB=0

# JWT
JWT_ACCESS_SECRET=2fadc7eda2add997f95b72bfd1c6eada308fc25f8dc5cc164c4e936ab504abbc00f4754272e01752d921927f2764a1ab31b5c8f2223b9f9f224feefddd81c2dc
JWT_REFRESH_SECRET=7d23bc535567f1b5f1617eb936ea88a879bfaaa780bfab74dd3c85b44671b7f3df9a4564d403425fb037766074a96237fcb8655c07c3c034548310145146be5b
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=2d

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vtechshop.customercare@gmail.com
SMTP_PASS=avfjtilvtxveetkx
MAIL_FROM=Vtech Shop <vtechshop.customercare@gmail.com>
ADMIN_EMAIL=vtechshop.customercare@gmail.com
SUPPORT_EMAIL=vtechshop.customercare@gmail.com
SUPPORT_PHONE=+919944556683

# Security
CSRF_SECRET=d0e3a8f5bd0194752b7a277d1e5ec75781bcb19df19960fb4c28c51ca3a468f23857c0893b2380e24d0db08fc2eed2d578c80685f3576e65f12bc75844927031
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15

# Other
UPLOAD_DRIVER=local
LOG_LEVEL=info
AD_CLICK_SESSION_TTL_MIN=30
AD_BUDGET_MIN=100
AFFILIATE_WINDOW_DAYS=30
```

### Step 3: Deploy Backend

Click **"Create Web Service"** - Render will automatically build and deploy.

**Backend URL**: https://vtech-shop.onrender.com

---

## 🌐 2. Frontend Deployment (Netlify)

### Option A: Drag & Drop (Easiest - Recommended)

1. Build locally:
   ```bash
   cd Ecommerce/shop/apps/web
   npm install
   npm run build
   ```

2. Go to https://app.netlify.com
3. **Drag the `dist` folder** into "Sites" page
4. Done! Site deployed instantly

### Option B: GitHub Auto-Deploy

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect GitHub → Select `vtechshop/Vtech-shop`
4. Configure Build Settings:
   ```
   Base directory: Ecommerce/shop/apps/web
   Build command: npm run build
   Publish directory: Ecommerce/shop/apps/web/dist
   ```

5. **Environment Variables**:
   ```
   VITE_API_URL=https://vtech-shop.onrender.com/api
   ```

6. Click **"Deploy site"**

### Step 4: Configure SPA Routing

Netlify automatically reads `public/_redirects` file (already created):
```
/*    /index.html   200
```

This fixes 404 errors on page refresh.

**Frontend URL**: https://loquacious-sfogliatella-745014.netlify.app

---

## ✅ 3. Verification Checklist

### Backend Health Check
```bash
curl https://vtech-shop.onrender.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "services": {
    "database": "connected"
  }
}
```

### Frontend Check
1. Open: https://loquacious-sfogliatella-745014.netlify.app
2. Should see homepage loading
3. Open DevTools Console - **NO errors** about `useSyncExternalStore`
4. **NO CORS errors**

### Full Flow Test
1. Register a new user
2. Login
3. Browse products
4. Add to cart
5. Checkout

---

## 🔧 4. Troubleshooting

### Issue: CORS Errors

**Fix**: Update `Ecommerce/shop/apps/api/src/app.js`:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://loquacious-sfogliatella-745014.netlify.app',
];
```

Then redeploy backend on Render.

### Issue: 404 on Page Refresh (Netlify)

**Fix**: Ensure `public/_redirects` exists:
```
/*    /index.html   200
```

### Issue: Environment Variables Not Working

**Render**: Go to Dashboard → Your Service → Environment → Add variables → **Manual Deploy**

**Netlify**: Go to Site settings → Environment variables → Add → **Trigger deploy** → **Clear cache and deploy**

### Issue: Build Fails with `useSyncExternalStore` Error

**Fix**: Ensure `vite.config.js` has React+Redux in same chunk:
```javascript
manualChunks: (id) => {
  if (id.includes('react') || id.includes('react-dom') ||
      id.includes('react-router') || id.includes('@reduxjs/toolkit') ||
      id.includes('react-redux')) {
    return 'vendor-react';
  }
  // ... other chunks
}
```

---

## 📊 5. Production URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://loquacious-sfogliatella-745014.netlify.app |
| **Backend API** | https://vtech-shop.onrender.com/api |
| **Health Check** | https://vtech-shop.onrender.com/api/health |
| **MongoDB** | Atlas Mumbai (Cloud) |
| **Redis** | Upstash Mumbai (Cloud) |

---

## 🚀 6. Deployment Commands

### Update Frontend
```bash
cd Ecommerce/shop/apps/web
npm run build
# Then drag dist folder to Netlify, or push to GitHub for auto-deploy
```

### Update Backend
```bash
git add .
git commit -m "Backend update"
git push origin main
# Render auto-deploys from GitHub
```

---

## 📝 7. Important Notes

1. **Free Tier Limitations**:
   - Render: Spins down after 15 min inactivity (first request may be slow)
   - Netlify: 100GB bandwidth/month, 300 build minutes/month

2. **Security**:
   - Never commit `.env` files
   - All secrets in Render/Netlify environment variables
   - JWT secrets are strong (64+ chars)

3. **Performance**:
   - Static assets cached for 1 year
   - Redis caching enabled
   - Gzip compression enabled
   - Code splitting optimized

4. **Monitoring**:
   - Check Render logs for backend errors
   - Check Netlify function logs if needed
   - Monitor MongoDB Atlas metrics

---

## ✨ Deployment Complete!

Your V-Tech multi-vendor e-commerce platform is now live! 🎉

**Next Steps**:
- Add custom domain (optional)
- Set up SSL certificate (auto on Netlify/Render)
- Configure payment gateways (Stripe/Razorpay)
- Add real Delhivery API key
- Monitor and optimize performance
