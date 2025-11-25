# Affiliate System - Complete Guide

## 🎯 What is the Affiliate System?

The affiliate system allows users to earn commissions by promoting your e-commerce products. Affiliates get unique tracking links, and when someone makes a purchase through their link, they earn a percentage of the sale.

---

## 📊 How It Works - Simple Overview

### **For Affiliates:**
1. **Apply** → Customer applies to become an affiliate
2. **Get Approved** → Admin approves the application
3. **Get Links** → Affiliate receives unique tracking links
4. **Promote** → Share links on social media, blogs, websites, etc.
5. **Earn** → Get commission when people buy through their links

### **For the Platform:**
1. **Track Clicks** → System tracks when someone clicks affiliate links
2. **Set Cookie** → Store affiliate code in browser (30 days)
3. **Track Orders** → When user places order, check for affiliate cookie
4. **Calculate Commission** → Automatically calculate affiliate's earnings
5. **Pay Affiliates** → Admin approves and pays commissions

---

## 🔄 Complete Workflow

### **Step 1: Becoming an Affiliate**

**Customer Applies:**
- Customer goes to dashboard → Clicks "Become an Affiliate"
- Fills out application form:
  - Payment method (Bank Transfer, UPI, PayPal)
  - Payment details (account number, UPI ID, etc.)
- Submits application
- Status: **Pending**

**Admin Approves:**
- Admin goes to Admin Dashboard → Affiliates
- Reviews application
- Clicks "Approve"
- System generates:
  - **Unique Affiliate Code** (e.g., `JOHN-SMITH-ABC123`)
  - **Default Commission Rate** (5% by default)
- Status: **Active**

---

### **Step 2: Getting Affiliate Links**

Once approved, affiliate gets **3 types of links**:

#### 1. **Homepage Link**
```
http://localhost:5173?affId=JOHN-SMITH-ABC123
```
- Use for: General promotion, social media posts

#### 2. **Search Page Link**
```
http://localhost:5173/search?affId=JOHN-SMITH-ABC123
```
- Use for: Category-specific promotions

#### 3. **Product Page Link**
```
http://localhost:5173/product/wireless-headphones?affId=JOHN-SMITH-ABC123
```
- Use for: Promoting specific products
- Replace `wireless-headphones` with actual product slug

---

### **Step 3: Tracking Clicks**

**When someone clicks an affiliate link:**

1. **Frontend detects** the `affId` parameter
2. **API call** to `/affiliates/track/click` with affiliate code
3. **System checks** if affiliate code is valid and active
4. **Increments** `totalClicks` counter for the affiliate
5. **Sets cookie** in visitor's browser:
   ```javascript
   Cookie: affiliate = JOHN-SMITH-ABC123
   MaxAge: 30 days
   HttpOnly: true
   ```

**Cookie Lifespan:** 30 days (configurable via `AFFILIATE_WINDOW_DAYS`)

**Example Flow:**
```
Visitor clicks link → Cookie set for 30 days → Visitor can buy anytime within 30 days → Affiliate still gets credit!
```

---

### **Step 4: Order Placement & Commission Creation**

**When a user places an order:**

1. **System checks** for affiliate cookie
2. **If found**, looks up the affiliate by code
3. **Validates** affiliate is still active
4. **Calculates commission:**
   ```javascript
   Commission Amount = Order Total × Commission Percentage
   Example: $100 × 5% = $5
   ```
5. **Creates Commission Record:**
   ```json
   {
     "type": "affiliate",
     "subjectId": "affiliate_id",
     "orderId": "order_id",
     "amount": 5.00,
     "percentage": 5,
     "status": "pending"
   }
   ```
6. **Updates Affiliate Stats:**
   - `totalConversions` +1
   - `totalEarnings` +$5
   - `pendingEarnings` +$5

---

### **Step 5: Commission Approval & Payment**

#### **Commission Statuses:**

**1. Pending** (Initial state)
- Order placed, commission created
- Waiting for admin approval
- Shown in affiliate's "Pending Earnings"

**2. Approved** (Admin approved)
- Admin verified the order is legitimate
- Commission ready for payment
- Still shown as pending until paid

**3. Paid** (Payment completed)
- Admin marked as paid
- Moved to affiliate's "Paid Earnings"
- Payment reference recorded

**4. Cancelled** (Order cancelled/refunded)
- Commission reversed
- Deducted from totals

#### **Admin Process:**

1. Go to **Admin Dashboard** → **Commissions**
2. Review pending commissions
3. **Approve** legitimate commissions
4. Process **Payment** to affiliate
5. Mark as **Paid** with payment reference

---

## 💰 Commission Calculation

### **Default Settings:**
- **Commission Rate:** 5% (can be customized per affiliate)
- **Tracking Window:** 30 days
- **Minimum Payout:** None (configurable)

### **Example Calculations:**

| Order Total | Commission Rate | Affiliate Earns |
|-------------|----------------|-----------------|
| $50.00 | 5% | $2.50 |
| $100.00 | 5% | $5.00 |
| $500.00 | 5% | $25.00 |
| $1,000.00 | 10% (custom) | $100.00 |

---

## 📈 Affiliate Dashboard Features

### **Stats Overview:**
- **Total Clicks** - How many people clicked their links
- **Total Conversions** - How many people bought
- **Conversion Rate** - Percentage of clicks that became sales
- **Total Earnings** - All-time earnings
- **Pending Earnings** - Awaiting payment
- **Paid Earnings** - Already paid

### **Performance Tracking:**
- View all commissions (pending, approved, paid)
- See order details for each commission
- Track click-through rates
- Download reports (future feature)

### **Affiliate Links:**
- Copy-paste ready links
- Pre-formatted with affiliate code
- Different link types for different purposes

---

## 🔧 Technical Implementation

### **Database Models:**

#### **Affiliate Model:**
```javascript
{
  userId: ObjectId,              // Reference to User
  code: "JOHN-SMITH-ABC123",     // Unique affiliate code
  status: "active",              // pending, active, suspended, rejected
  commissionPercentage: 5,       // Default 5%
  totalClicks: 245,              // Total link clicks
  totalConversions: 12,          // Total sales
  totalEarnings: 156.50,         // Total earned
  pendingEarnings: 45.00,        // Pending payment
  paidEarnings: 111.50,          // Already paid
  paymentMethod: "bank_transfer",
  paymentDetails: {...}          // Bank/PayPal/UPI details
}
```

#### **Commission Model:**
```javascript
{
  type: "affiliate",             // or "vendor"
  subjectId: ObjectId,           // Affiliate ID
  orderId: ObjectId,             // Order reference
  amount: 5.00,                  // Commission amount
  percentage: 5,                 // Rate used
  status: "pending",             // pending, approved, paid, cancelled
  approvedAt: Date,              // When approved
  paidAt: Date,                  // When paid
  paymentRef: "TX123456"         // Payment reference
}
```

### **Cookie Tracking:**
```javascript
// Set cookie when affiliate link clicked
res.cookie('affiliate', affiliateCode, {
  maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
  httpOnly: true,                     // Secure
  sameSite: 'lax'                     // CSRF protection
});
```

### **Commission Creation Logic:**
```javascript
// When order is placed
const affiliateCookie = req.cookies.affiliate;

if (affiliateCookie) {
  const affiliate = await Affiliate.findOne({
    code: affiliateCookie,
    status: 'active'
  });

  if (affiliate) {
    const commissionAmount = orderTotal * (affiliate.commissionPercentage / 100);

    await Commission.create({
      type: 'affiliate',
      subjectId: affiliate._id,
      orderId: order._id,
      amount: commissionAmount,
      percentage: affiliate.commissionPercentage,
      status: 'pending'
    });

    await Affiliate.findByIdAndUpdate(affiliate._id, {
      $inc: {
        totalConversions: 1,
        totalEarnings: commissionAmount,
        pendingEarnings: commissionAmount
      }
    });
  }
}
```

---

## 🎯 Use Cases & Examples

### **Example 1: Beauty Blogger**
1. Beauty blogger applies to become affiliate
2. Gets approved with 10% commission (custom rate)
3. Shares link: `yourstore.com/product/face-cream?affId=BEAUTY-BLOGGER-123`
4. 1,000 people click (tracked)
5. 50 people buy ($50 each = $2,500 total)
6. Blogger earns: $2,500 × 10% = **$250**

### **Example 2: Social Media Influencer**
1. Instagram influencer with 100K followers
2. Posts homepage link in bio
3. 5,000 clicks tracked
4. 200 conversions ($100 average order)
5. Total sales: $20,000
6. Influencer earns: $20,000 × 5% = **$1,000**

### **Example 3: Tech Review Site**
1. Tech site reviews your products
2. Adds affiliate links to review articles
3. Links stay active for months
4. Steady stream of conversions
5. Passive income from old content

---

## 🔒 Security Features

1. **Cookie Security**
   - HttpOnly (prevents JavaScript access)
   - Secure flag in production
   - SameSite protection

2. **Validation**
   - Verify affiliate code exists
   - Check affiliate is active
   - Prevent self-referral (optional)

3. **Fraud Prevention**
   - Track IP addresses
   - Monitor suspicious patterns
   - Admin review before payment

4. **Audit Trail**
   - All clicks logged
   - All commissions tracked
   - Payment references stored

---

## 🛠️ Admin Controls

### **Affiliate Management:**
- Approve/Reject applications
- Set custom commission rates per affiliate
- Suspend affiliates
- View performance metrics

### **Commission Management:**
- Review all pending commissions
- Approve/Reject commissions
- Process bulk payments
- Export reports

### **Settings:**
- Default commission percentage
- Cookie tracking window (days)
- Minimum payout threshold
- Payment schedules

---

## 📱 Frontend Integration

### **Tracking Implementation:**
```javascript
// Detect affId in URL
const urlParams = new URLSearchParams(window.location.search);
const affId = urlParams.get('affId');

if (affId) {
  // Track click
  await api.post('/affiliates/track/click', { affId });
}
```

### **Affiliate Dashboard:**
- Real-time stats
- Performance charts
- Copy-to-clipboard links
- Commission history

---

## 🚀 Best Practices

### **For Affiliates:**
1. **Disclose Affiliate Relationship** - Be transparent
2. **Choose Relevant Products** - Match your audience
3. **Create Quality Content** - Don't spam
4. **Track Performance** - Monitor what works
5. **Engage Audience** - Build trust

### **For Platform Admins:**
1. **Review Applications** - Approve quality affiliates
2. **Set Fair Rates** - Competitive commissions
3. **Pay On Time** - Build affiliate trust
4. **Monitor Fraud** - Prevent gaming the system
5. **Provide Support** - Help affiliates succeed

---

## 📊 Reporting & Analytics

### **Affiliate Can See:**
- Total clicks
- Total conversions
- Conversion rate
- Earnings (total, pending, paid)
- Individual commission details
- Performance trends

### **Admin Can See:**
- All affiliate performance
- Top performers
- Commission payouts
- Fraud indicators
- Platform-wide stats

---

## 🔮 Future Enhancements

Potential improvements:
1. **Tiered Commissions** - Higher rates for top performers
2. **Recurring Commissions** - Earn on customer lifetime value
3. **Multi-Level Marketing** - Sub-affiliates
4. **Product-Specific Rates** - Different commission per product
5. **Performance Bonuses** - Extra rewards for milestones
6. **Automated Payouts** - Integrate payment gateways
7. **Deep Linking** - Track specific product pages
8. **A/B Testing** - Test different landing pages
9. **Real-Time Notifications** - Alert on conversions
10. **Mobile App** - Affiliate dashboard on mobile

---

## 🆘 Troubleshooting

### **Problem: Affiliate not getting credit for sales**
**Causes:**
- Cookie expired (>30 days since click)
- User cleared cookies
- Different browser/device used
- Affiliate code misspelled in link

**Solution:**
- Remind customers to complete purchase within 30 days
- Use URL shorteners that preserve parameters

### **Problem: Clicks tracked but no conversions**
**Causes:**
- Audience not interested
- Product pricing too high
- Landing page issues
- Checkout problems

**Solution:**
- Review targeting
- A/B test landing pages
- Improve checkout flow

### **Problem: Commission not showing in dashboard**
**Causes:**
- Commission still pending
- Order not yet completed
- Affiliate cookie missing

**Solution:**
- Wait for order completion
- Check order status
- Verify cookie was set

---

## 📞 API Endpoints

### **Public:**
- `POST /affiliates/track/click` - Track affiliate link clicks

### **Affiliate (Authenticated):**
- `POST /affiliates/apply` - Apply to become affiliate
- `GET /affiliates/dashboard/stats` - Get stats
- `GET /affiliates/links` - Get affiliate links
- `GET /affiliates/commissions` - List commissions
- `GET /affiliates/payouts` - List paid commissions

### **Admin:**
- `GET /admin/affiliates` - List all affiliates
- `PUT /admin/affiliates/:id/approve` - Approve affiliate
- `PUT /admin/affiliates/:id/reject` - Reject affiliate
- `GET /admin/commissions` - List all commissions
- `PUT /admin/commissions/:id/approve` - Approve commission
- `PUT /admin/commissions/:id/pay` - Mark as paid

---

## 🎓 Summary

The affiliate system is a **powerful marketing tool** that:

✅ Helps you acquire customers through trusted sources
✅ Only pay for actual sales (performance-based)
✅ Scales your marketing without upfront costs
✅ Builds brand awareness through affiliates
✅ Creates passive income for promoters

**Win-Win Situation:**
- **Platform:** More sales, no upfront marketing cost
- **Affiliates:** Passive income, flexible work
- **Customers:** Discover products from trusted sources

---

## 📚 Related Documentation

- [UPGRADE_BUTTON_FIX.md](UPGRADE_BUTTON_FIX.md) - How to become an affiliate
- [PASSWORD_RESET_FEATURE.md](PASSWORD_RESET_FEATURE.md) - Admin features
- [LOGIN_TROUBLESHOOTING.md](LOGIN_TROUBLESHOOTING.md) - Login help

---

**🎉 The affiliate system is fully functional and ready to use!**
