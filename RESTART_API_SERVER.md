# ⚡ IMPORTANT: Restart API Server

## Why?

You added a YouTube video URL to your product, but the `videoUrl` field was missing from the Product schema.

I've now added it to the schema:
```javascript
videoUrl: { type: String, trim: true }
```

**But this change won't take effect until you restart the API server.**

---

## How to Restart

### Option 1: If running in terminal
1. Go to the terminal running your API server
2. Press `Ctrl+C` to stop it
3. Run `npm run dev` again

### Option 2: If using nodemon (auto-restart)
1. Just save any file in the API directory
2. Nodemon will auto-restart

### Option 3: Kill and restart manually
```bash
# Stop the server
taskkill /F /IM node.exe

# Or find the specific process
# netstat -ano | findstr :5000
# taskkill /F /PID <PID_NUMBER>

# Restart
cd E:\V-Tech  Ecommerce\Ecommerce\shop\apps\api
npm run dev
```

---

## After Restart

1. Go back to admin Products page
2. Edit the product again
3. Add the YouTube URL: `https://youtu.be/ywchG7XckGE?si=E0Fyogq1pcq-KaLD`
4. Click "Update Product"
5. Go to the product page as a customer
6. You should now see the YouTube video!

---

## What Was Fixed

**File:** `Ecommerce/shop/apps/api/src/models/Product.js`

**Change:** Added line 10:
```javascript
videoUrl: { type: String, trim: true }, // YouTube video URL for product demonstration
```

This tells MongoDB that products can have a `videoUrl` field, so it will now save and retrieve it properly.

---

**Status:** ✅ Schema Updated - Waiting for Server Restart
