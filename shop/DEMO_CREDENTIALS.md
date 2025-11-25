# 🔑 Demo Login Credentials

## Quick Access

Here are the demo user accounts available in the system. You can use these to test different features and user roles in the application.

---

## 👥 User Accounts

### 1. 👨‍💼 **Admin User (Primary)**
- **Email:** `admin@example.com`
- **Password:** `Password123`
- **Role:** Administrator
- **Access:** Full system access, admin dashboard
- **Dashboard:** http://localhost:5175/admin-dashboard

**Features:**
- Manage all users
- Review and approve KYC
- Manage products, categories, orders
- View all analytics
- Manage vendors and affiliates
- Configure system settings

---

### 2. 👨‍💼 **Admin User (Secondary)**
- **Email:** `admin@shop.test`
- **Password:** `admin123456`
- **Role:** Administrator
- **Access:** Full system access, admin dashboard
- **Dashboard:** http://localhost:5175/admin-dashboard

**Features:**
- Manage all users
- Review and approve KYC
- Manage products, categories, orders
- View all analytics
- Manage vendors and affiliates
- Configure system settings

---

### 3. 🛍️ **Demo Customer**
- **Email:** `demo@example.com`
- **Password:** `Password123`
- **Role:** Regular Customer
- **Dashboard:** http://localhost:5175/dashboard

**Features:**
- Browse and purchase products
- Manage orders
- Track shipments
- Save addresses
- Create wishlist
- Leave reviews

---

### 4. 🏪 **Vendor User**
- **Email:** `vendor@shop.test`
- **Password:** `vendor123456`
- **Role:** Vendor
- **Store:** Demo Electronics Store
- **Dashboard:** http://localhost:5175/vendor-dashboard

**Features:**
- Add and manage products
- Track inventory
- View orders for their products
- Run ad campaigns
- View sales analytics
- Manage settlements

---

### 5. 💰 **Affiliate User**
- **Email:** `affiliate@shop.test`
- **Password:** `affiliate123456`
- **Role:** Affiliate Marketer
- **Dashboard:** http://localhost:5175/affiliate-dashboard

**Features:**
- Generate affiliate links
- Track referrals and clicks
- View commission earnings
- Monitor conversion rates
- Request payouts

---

### 6. 🛍️ **Customer User**
- **Email:** `customer@shop.test`
- **Password:** `customer123456`
- **Role:** Regular Customer
- **Dashboard:** http://localhost:5175/dashboard

**Features:**
- Browse and purchase products
- Manage orders
- Track shipments
- Save addresses
- Create wishlist
- Leave reviews

---

## 🔐 Password Policy

**Note:** Demo passwords use simple formats for testing purposes:
- Format 1: `Password123` (for @example.com accounts)
- Format 2: `{role}123456` (for @shop.test accounts)
- Length: 8+ characters (meets minimum requirement)
- **For production:** Change these passwords immediately!

---

## 🌐 Application URLs

### Frontend (React App)
- **URL:** http://localhost:5175
- **Home:** http://localhost:5175/
- **Login:** http://localhost:5175/login
- **Register:** http://localhost:5175/register

### Backend API
- **URL:** http://localhost:8080
- **Health Check:** http://localhost:8080/health
- **API Docs:** http://localhost:8080/api

---

## 🧪 Testing Different Flows

### Test as Admin:
1. Login with `admin@example.com` / `Password123` (or `admin@shop.test` / `admin123456`)
2. Go to Admin Dashboard
3. Approve KYC requests
4. Manage all platform data

### Test as Vendor:
1. Login with `vendor@shop.test` / `vendor123456`
2. Go to Vendor Dashboard
3. Add new products
4. Create ad campaigns
5. View sales analytics

### Test as Affiliate:
1. Login with `affiliate@shop.test` / `affiliate123456`
2. Go to Affiliate Dashboard
3. Generate referral links
4. Track commissions

### Test as Customer:
1. Login with `demo@example.com` / `Password123` (or `customer@shop.test` / `customer123456`)
2. Browse products
3. Add items to cart
4. Complete checkout
5. Track orders

---

## 📦 Seeded Data

The seed script also creates:

- ✅ **5 Categories:** Electronics, Fashion, Home & Garden, Sports, Books
- ✅ **10+ Products:** Various demo products with images
- ✅ **1 Sample Order:** For testing order management
- ✅ **1 Ad Campaign:** For testing advertising features
- ✅ **CMS Pages:** About, Terms, Privacy pages

---

## 🔄 Re-seeding Database

If you need to reset the database to default demo data:

```bash
cd apps/api
npm run seed
```

**Warning:** This will **DELETE ALL DATA** and recreate demo users and products!

---

## 🛡️ Security Features Enabled

All demo accounts have these security features:

- ✅ Email verification (pre-verified for demo)
- ✅ Password hashing with bcrypt
- ✅ Account lockout protection (5 failed attempts)
- ✅ JWT authentication
- ✅ CSRF protection
- ✅ XSS sanitization
- ✅ Audit logging

---

## 💡 Tips

1. **First Login:** All accounts are pre-verified (no email verification needed)
2. **Multiple Tabs:** You can login with different accounts in different browsers/incognito windows
3. **Testing Features:** Each role has different permissions - test them all!
4. **Password Reset:** Works with all demo emails
5. **Admin Powers:** Admin can access all dashboards

---

## 📞 Need More Users?

You can create additional test users through:
1. **Registration Form:** http://localhost:5175/register
2. **Admin Dashboard:** Create users as admin
3. **API Endpoint:** POST `/api/auth/register`

---

## ⚠️ Production Deployment

**IMPORTANT:** Before deploying to production:

1. ❌ Delete all demo accounts
2. ❌ Remove or secure the seed script
3. ✅ Create real admin account with strong password
4. ✅ Update `.env` with production secrets
5. ✅ Enable email verification for real users

---

**Last Updated:** 2025-10-18
**Database:** MongoDB Local
**Environment:** Development
