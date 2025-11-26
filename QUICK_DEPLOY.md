# ⚡ Quick Deployment Checklist

இந்த steps-ஐ follow பண்ணி உங்க website-ஐ live-க்கு கொண்டு போங்க!

---

## 🎯 Backend Deployment (Render.com)

### ✅ Step 1: Check Render Environment Variables

Render Dashboard-ல போய் உங்க service-ல இந்த variables இருக்கான்னு check பண்ணுங்க:

**Must Have Variables:**
```
NODE_ENV=production
CLIENT_URL=https://loquacious-sfogliatella-745014.netlify.app
MONGO_URI=mongodb+srv://Vtech-shop:Vtech%238090@vtech-shop.38ajpbv.mongodb.net/shop?retryWrites=true&w=majority&appName=vtech-shop
REDIS_HOST=sought-bulldog-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AU12AAIncDJiZGYxMmM1MGM0NDI0NGFlYjU1MjAzNjdjNDNjMWUxNnAyMTk4MzA
```

### ✅ Step 2: Trigger Redeploy

1. Render Dashboard → Your Service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait 2-3 minutes for deployment to complete

### ✅ Step 3: Test Backend

```bash
curl https://vtech-shop.onrender.com/api/health
```

Should return: `{"status":"OK","services":{"database":"connected"}}`

---

## 🌐 Frontend Deployment (Netlify)

### ✅ Option A: Manual Drag & Drop (Fastest!)

1. **Build locally:**
   ```bash
   cd E:\V-Tech  Ecommerce\Ecommerce\shop\apps\web
   npm run build
   ```

2. **Open folder:**
   ```
   E:\V-Tech  Ecommerce\Ecommerce\shop\apps\web\dist
   ```

3. **Go to Netlify:**
   - https://app.netlify.com
   - Your site → Deploys tab
   - **Drag the entire `dist` folder** to the upload area
   - Wait 30 seconds - Done!

### ✅ Option B: Auto Deploy from GitHub

1. **Configure Build Settings:**
   - Netlify → Site settings → Build & deploy
   - Base directory: `Ecommerce/shop/apps/web`
   - Build command: `npm run build`
   - Publish directory: `Ecommerce/shop/apps/web/dist`

2. **Add Environment Variable:**
   ```
   VITE_API_URL=https://vtech-shop.onrender.com/api
   ```

3. **Trigger Deploy:**
   - Deploys tab → Trigger deploy → Clear cache and deploy

---

## ✅ Final Verification

### 1. Frontend Check
Open: https://loquacious-sfogliatella-745014.netlify.app

**Expected:**
- ✅ Homepage loads
- ✅ NO console errors about `useSyncExternalStore`
- ✅ NO CORS errors
- ✅ Products load from backend API

### 2. Backend Check
```bash
curl https://vtech-shop.onrender.com/api/health
```

**Expected:**
```json
{
  "status": "OK",
  "services": {
    "database": "connected"
  }
}
```

### 3. Full Flow Test
1. ✅ Register new user
2. ✅ Login
3. ✅ Browse products
4. ✅ Add to cart
5. ✅ View cart
6. ✅ Checkout (if payment configured)

---

## 🔧 Common Issues & Fixes

### ❌ Issue: CORS Error in Console

**Fix:**
1. Check Render environment variable: `CLIENT_URL=https://loquacious-sfogliatella-745014.netlify.app`
2. Redeploy backend on Render
3. Wait 2 minutes, refresh frontend

### ❌ Issue: 404 on Page Refresh

**Fix:**
- File `public/_redirects` must exist in web folder (already created)
- Contains: `/*    /index.html   200`
- Redeploy on Netlify

### ❌ Issue: "useSyncExternalStore" Error

**Fix:**
- Already fixed in `vite.config.js`
- Just redeploy frontend (build locally + drag & drop)

### ❌ Issue: API Calls Fail

**Check:**
1. Netlify environment variable `VITE_API_URL=https://vtech-shop.onrender.com/api`
2. Backend is running (check Render dashboard)
3. No typos in API URL (must end with `/api`)

---

## 📊 Deployment Status URLs

| Service | Status Page |
|---------|------------|
| **Render Backend** | https://dashboard.render.com |
| **Netlify Frontend** | https://app.netlify.com |
| **MongoDB Atlas** | https://cloud.mongodb.com |
| **Upstash Redis** | https://console.upstash.com |

---

## 🚀 Ready to Deploy?

இப்போ மேல steps-ஐ follow பண்ணுங்க:

1. **Backend**: Render-ல environment variables check பண்ணி redeploy பண்ணுங்க
2. **Frontend**: Local-ல build பண்ணி Netlify-ல drag & drop பண்ணுங்க
3. **Test**: Frontend URL open பண்ணி verify பண்ணுங்க

**Total Time**: ~5 minutes 🎉

---

**Note:** First request to backend may be slow (15-30 seconds) if Render free tier spins down after inactivity. Subsequent requests will be fast!
