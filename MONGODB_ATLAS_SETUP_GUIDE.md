# MongoDB Atlas Setup Guide

**Date:** November 21, 2025
**Status:** Step-by-step guide to migrate from local MongoDB to MongoDB Atlas (Cloud)

---

## 🎯 Why MongoDB Atlas?

**Benefits:**
- ✅ **Free tier available** (512 MB storage)
- ✅ **Accessible from anywhere** (not just localhost)
- ✅ **Automatic backups**
- ✅ **Better security** with authentication
- ✅ **Production-ready** infrastructure
- ✅ **No local MongoDB installation needed**

---

## 📋 Step-by-Step Setup

### Step 1: Create MongoDB Atlas Account

1. **Go to MongoDB Atlas:**
   - Visit: https://www.mongodb.com/cloud/atlas/register

2. **Sign Up:**
   - Use your email: `ledvtech@gmail.com`
   - OR sign up with Google account
   - Create a strong password

3. **Verify Email:**
   - Check your inbox for verification email
   - Click verification link

---

### Step 2: Create a Free Cluster

1. **After login, click "Build a Database"**

2. **Choose Free Tier:**
   - Select **"M0 FREE"** (512 MB storage)
   - ✅ No credit card required!

3. **Choose Cloud Provider & Region:**
   - **Provider:** AWS (recommended)
   - **Region:** Choose closest to India
     - Mumbai (ap-south-1) - **RECOMMENDED**
     - Singapore (ap-southeast-1)
   - Click **"Create Cluster"**

4. **Cluster Name:**
   - Keep default name (Cluster0) or rename to "vtech-shop"

---

### Step 3: Create Database User

⚠️ **IMPORTANT:** This is different from your Atlas account!

1. **Security → Database Access → Add New Database User**

2. **Authentication Method:** Password

3. **Create User:**
   ```
   Username: vtech_admin
   Password: [Click "Autogenerate Secure Password" and COPY IT!]
   ```

   **Example generated password:** `Xy9mK2pL5nQ8rT3v`

   ⚠️ **IMPORTANT:** Save this password! You'll need it for connection string.

4. **Database User Privileges:**
   - Select: **"Read and write to any database"**

5. **Click "Add User"**

---

### Step 4: Configure Network Access

**Allow your application to connect:**

1. **Security → Network Access → Add IP Address**

2. **For Development (Option 1 - Easy but less secure):**
   - Click **"Allow Access from Anywhere"**
   - IP: `0.0.0.0/0`
   - Click **"Confirm"**

   ⚠️ This allows connections from any IP (good for development/testing)

3. **For Production (Option 2 - More secure):**
   - Click **"Add Current IP Address"**
   - Add your server's IP address

4. **Click "Confirm"**

---

### Step 5: Get Connection String

1. **Click "Connect" on your cluster**

2. **Choose "Connect your application"**

3. **Select:**
   - Driver: **Node.js**
   - Version: **5.5 or later**

4. **Copy the connection string:**
   ```
   mongodb+srv://vtech_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

5. **Replace `<password>` with your actual password:**
   ```
   mongodb+srv://vtech_admin:Xy9mK2pL5nQ8rT3v@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. **Add database name (optional but recommended):**
   ```
   mongodb+srv://vtech_admin:Xy9mK2pL5nQ8rT3v@cluster0.xxxxx.mongodb.net/shop?retryWrites=true&w=majority
   ```

---

### Step 6: Update Your Application

**File:** `shop/apps/api/.env`

**Replace line 8:**

```env
# OLD (Local MongoDB):
MONGO_URI=mongodb://localhost:27017/shop

# NEW (MongoDB Atlas):
MONGO_URI=mongodb+srv://vtech_admin:YOUR_PASSWORD_HERE@cluster0.xxxxx.mongodb.net/shop?retryWrites=true&w=majority
```

**Full example:**
```env
MONGO_URI=mongodb+srv://vtech_admin:Xy9mK2pL5nQ8rT3v@cluster0.abc123.mongodb.net/shop?retryWrites=true&w=majority
```

⚠️ **Replace with YOUR actual:**
- Username (if different)
- Password (from Step 3)
- Cluster URL (from Step 5)

---

### Step 7: Test Connection

1. **Save the `.env` file**

2. **Restart your API server:**
   ```bash
   cd shop/apps/api
   npm run dev
   ```

3. **Check for success message:**
   ```
   ✅ MongoDB connected: cluster0.xxxxx.mongodb.net
   ```

4. **If you see errors, check:**
   - Password is correct (no spaces, no < or >)
   - IP address is whitelisted (Step 4)
   - Connection string format is correct

---

## 🔄 Migrate Existing Data (Optional)

### If you want to copy data from local MongoDB to Atlas:

**Option 1: Using MongoDB Compass (GUI - Easy)**

1. **Download MongoDB Compass:**
   - Visit: https://www.mongodb.com/try/download/compass
   - Install it

2. **Connect to Local MongoDB:**
   - Connection string: `mongodb://localhost:27017`
   - Database: `shop`

3. **Export Collections:**
   - Right-click each collection → Export Collection → JSON

4. **Connect to Atlas:**
   - Use your Atlas connection string
   - Import each JSON file

**Option 2: Using mongodump/mongorestore (Command Line)**

```bash
# 1. Export from local MongoDB
mongodump --uri="mongodb://localhost:27017/shop" --out="./backup"

# 2. Import to Atlas
mongorestore --uri="mongodb+srv://vtech_admin:PASSWORD@cluster0.xxxxx.mongodb.net/shop" ./backup/shop
```

---

## 🔐 Security Best Practices

### 1. **Keep Credentials Secret:**
```env
# ✅ GOOD - In .env file (not committed to git)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/shop

# ❌ BAD - Hardcoded in source code
const uri = "mongodb+srv://user:pass@cluster.mongodb.net/shop";
```

### 2. **Strong Password:**
- Use autogenerated passwords (like `Xy9mK2pL5nQ8rT3v`)
- Don't use simple passwords like `password123`

### 3. **Network Access:**
- Development: `0.0.0.0/0` (anywhere)
- Production: Specific IP addresses only

### 4. **User Privileges:**
- Don't use "Atlas admin" for application
- Use "Read and write to any database" or specific database access

---

## 📊 View Your Data

### Using MongoDB Atlas UI:

1. **Go to your cluster**
2. **Click "Browse Collections"**
3. **View/Edit data directly in browser**

### Using MongoDB Compass:

1. **Open MongoDB Compass**
2. **Paste your Atlas connection string**
3. **Browse collections visually**

---

## 🆓 Free Tier Limits

**MongoDB Atlas M0 FREE includes:**
- ✅ 512 MB storage
- ✅ Shared RAM
- ✅ Shared vCPU
- ✅ Up to 3 clusters per project
- ✅ Perfect for development & small projects

**If you exceed limits:**
- Upgrade to M10 cluster (~$0.08/hour = $57/month)
- Or optimize your data storage

---

## 🐛 Troubleshooting

### Error: "Authentication failed"
**Solution:**
- Check password is correct
- No spaces in password
- Remove `< >` brackets from password

### Error: "Connection timeout"
**Solution:**
- Check IP whitelist (Network Access)
- Add `0.0.0.0/0` for testing
- Check firewall isn't blocking port 27017

### Error: "Invalid connection string"
**Solution:**
- Format should be: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`
- Include `?retryWrites=true&w=majority` at end
- Check for typos

### Error: "Server selection timeout"
**Solution:**
- Cluster might be starting (wait 2-3 minutes)
- Check Network Access allows your IP
- Try restarting your application

---

## 📝 Connection String Format

**Full MongoDB Atlas URI format:**
```
mongodb+srv://<username>:<password>@<cluster-url>/<database>?<options>
```

**Example with all parts:**
```
mongodb+srv://vtech_admin:Xy9mK2pL5nQ8rT3v@cluster0.abc123.mongodb.net/shop?retryWrites=true&w=majority&appName=Cluster0
```

**Parts explained:**
- `mongodb+srv://` - Protocol (use SRV for Atlas)
- `vtech_admin` - Database username
- `Xy9mK2pL5nQ8rT3v` - Database password
- `cluster0.abc123.mongodb.net` - Cluster URL
- `/shop` - Database name
- `?retryWrites=true&w=majority` - Connection options

---

## 🔄 Switching Back to Local (If Needed)

**To switch back to local MongoDB:**

```env
# In .env file, change back to:
MONGO_URI=mongodb://localhost:27017/shop
```

**You can keep both and switch as needed!**

---

## 📞 Support

**MongoDB Atlas Issues:**
- Documentation: https://www.mongodb.com/docs/atlas/
- Support: https://www.mongodb.com/cloud/atlas/support

**Your Application Issues:**
- Email: ledvtech@gmail.com
- Phone: +919944556683

---

## ✅ Quick Setup Checklist

- [ ] 1. Create MongoDB Atlas account at mongodb.com
- [ ] 2. Create FREE M0 cluster (choose Mumbai region)
- [ ] 3. Create database user (username + password)
- [ ] 4. Whitelist IP address (0.0.0.0/0 for development)
- [ ] 5. Get connection string from "Connect" button
- [ ] 6. Replace `<password>` with actual password
- [ ] 7. Update `MONGO_URI` in `.env` file
- [ ] 8. Save `.env` file
- [ ] 9. Restart API server: `npm run dev`
- [ ] 10. Check logs: "✅ MongoDB connected"
- [ ] 11. Test application (register, login, create order)
- [ ] 12. ✅ MongoDB Atlas Working!

---

## 🎯 Summary

**Before (Local):**
```env
MONGO_URI=mongodb://localhost:27017/shop
```
- ❌ Only works on your computer
- ❌ No backups
- ❌ Not production-ready

**After (Atlas):**
```env
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/shop
```
- ✅ Works from anywhere
- ✅ Automatic backups
- ✅ Production-ready
- ✅ Better security

---

**Total setup time:** 10-15 minutes
**Cost:** FREE (M0 tier)
**Difficulty:** Easy

---

**Last Updated:** November 21, 2025
**Guide Version:** 1.0
