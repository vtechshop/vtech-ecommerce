# Email API Integration Guide - Complete Setup

**Status:** ✅ **EMAIL SERVICE ALREADY INTEGRATED**
**Action Required:** Configure Gmail App Password (5 minutes)

---

## Current Status

✅ **Email service is already coded and working!**
- `emailService.js` - Already exists
- `notificationService.js` - Already exists
- `.env` configuration - Already set up
- Email templates - Already designed

**What's Missing:**
- Only need to add **Gmail App Password** to `.env` file

---

## Quick Setup (5 Minutes)

### Step 1: Get Gmail App Password

**Why needed?** Gmail doesn't allow regular passwords for apps. You need a special "App Password".

**How to get it:**

1. **Go to Google Account Settings:**
   - Visit: https://myaccount.google.com/
   - Sign in with: `ledvtech@gmail.com`

2. **Enable 2-Step Verification** (if not already enabled):
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow the setup wizard

3. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: **Mail**
   - Select device: **Other (Custom name)**
   - Enter name: **VTech Ecommerce**
   - Click **Generate**
   - Copy the **16-character password** (looks like: `abcd efgh ijkl mnop`)

### Step 2: Update .env File

**File:** `shop/apps/api/.env`

**Find line 31 and replace:**

```env
# BEFORE (Current - NOT WORKING):
SMTP_PASS=your-gmail-app-password

# AFTER (Replace with your generated password):
SMTP_PASS=abcdefghijklmnop
```

**Example:**
```env
SMTP_PASS=xyzw abcd efgh ijkl
```

**⚠️ Important:**
- Remove spaces from the app password when pasting
- If Gmail gave you: `xyzw abcd efgh ijkl`
- Enter in .env: `xyzwabcdefghijkl`

### Step 3: Restart Server

```bash
cd shop/apps/api
npm run dev
```

**You should see:**
```
✓ Email service ready
```

---

## Test Email Sending

### Test 1: Register New User

1. Go to: http://localhost:5173/register
2. Create a new account
3. Check email inbox for "Verify Your Email Address"

### Test 2: Password Reset

1. Go to: http://localhost:5173/forgot-password
2. Enter your email
3. Check inbox for "Password Reset Request"

### Test 3: Order Confirmation

1. Place an order as customer
2. Check inbox for "Order Confirmation"

### Test 4: Shipping Notification

1. As vendor, mark order as "shipped"
2. Customer receives "Order Shipped" email with tracking number

---

## Available Email Features

Your website already has these email capabilities:

### 1. **User Authentication Emails**
- ✅ Email verification (when user registers)
- ✅ Password reset emails
- ✅ Account locked notification

### 2. **Order Emails**
- ✅ Order confirmation (when order placed)
- ✅ Shipping notification (when vendor ships)

### 3. **Custom Emails**
You can send any email using:

```javascript
const emailService = require('./services/emailService');

// Send custom email
await emailService.send({
  from: 'Vtech <ledvtech@gmail.com>',
  to: 'customer@example.com',
  subject: 'Your Subject Here',
  html: '<h1>Your HTML content</h1>'
});
```

---

## Email Templates

All emails use beautiful HTML templates with:
- 📱 Mobile responsive design
- 🎨 Brand colors (Orange #FF9F1C, Teal #2EC4B6)
- 🔘 Action buttons
- 🔒 Security notices
- 📧 Professional layout

**Example templates:**
- [Verification Email](shop/apps/api/src/services/emailService.js#L42-L88)
- [Password Reset](shop/apps/api/src/services/emailService.js#L90-L135)
- [Order Confirmation](shop/apps/api/src/services/notificationService.js#L37-L46)
- [Shipping Notification](shop/apps/api/src/services/notificationService.js#L49-L58)

---

## Add More Email Types

Want to add order tracking update emails? Here's how:

### Example: Add Tracking Update Email

**File:** `shop/apps/api/src/services/notificationService.js`

Add this function:

```javascript
async sendTrackingUpdate(user, order, trackingInfo) {
  const trackOrderUrl = `${env.CLIENT_URL}/track-order`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF9F1C 0%, #2EC4B6 100%); color: white; padding: 30px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; }
        .tracking-box { background: white; border: 2px solid #2EC4B6; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .status { font-size: 18px; font-weight: bold; color: #2EC4B6; }
        .button { display: inline-block; background: #FF9F1C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Tracking Update</h1>
        </div>
        <div class="content">
          <p>Hi ${user.name},</p>
          <p>Your order <strong>${order.orderId}</strong> has a new status update:</p>

          <div class="tracking-box">
            <p class="status">🚚 ${trackingInfo.statusDescription}</p>
            <p><strong>Location:</strong> ${trackingInfo.scans[0]?.location || 'In Transit'}</p>
            <p><strong>Tracking Number:</strong> ${order.shipment.awb}</p>
            <p><strong>Carrier:</strong> ${order.shipment.carrier}</p>
            ${trackingInfo.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${new Date(trackingInfo.estimatedDelivery).toLocaleDateString()}</p>` : ''}
          </div>

          <p style="text-align: center;">
            <a href="${trackOrderUrl}" class="button">Track Your Order</a>
          </p>

          <p>Thank you for shopping with us!</p>
          <p><em>- Vtech Team</em></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return this.sendEmail(
    user.email,
    `Tracking Update: ${trackingInfo.statusDescription}`,
    html
  );
}
```

### Use it in tracking sync:

**File:** `shop/apps/api/src/controllers/shippingController.js`

Find the `syncTrackingData` function (around line 421), and add after line 496:

```javascript
// Send tracking update email to customer
if (tracking.status === 'out_for_delivery' || tracking.status === 'delivered') {
  const User = require('../models/User');
  const notificationService = require('../services/notificationService');
  const user = await User.findById(order.userId);

  if (user) {
    await notificationService.sendTrackingUpdate(user, order, tracking);
  }
}
```

---

## Alternative Email Services

Currently using: **Gmail SMTP** (Free, 500 emails/day)

If you need more emails, you can upgrade to:

### Option 1: SendGrid (Recommended for Production)
- **Free tier:** 100 emails/day
- **Paid:** 50,000 emails/month for $19.95
- **Setup:** Easy API integration

**How to switch to SendGrid:**

1. Sign up at: https://sendgrid.com/
2. Get API Key
3. Update `.env`:

```env
# Replace SMTP config with:
SENDGRID_API_KEY=your_sendgrid_api_key
```

4. Update `emailService.js` to use SendGrid API

### Option 2: Amazon SES
- **Very cheap:** $0.10 per 1,000 emails
- **Reliable:** Enterprise-grade
- **Setup:** Requires AWS account

### Option 3: Mailgun
- **Free tier:** 5,000 emails/month
- **Good for transactional emails**

---

## Troubleshooting

### Issue: "Email would be sent (SMTP not configured)"

**Cause:** App password not set in `.env`

**Solution:**
1. Get Gmail App Password (see Step 1 above)
2. Add to `.env` file
3. Restart server

### Issue: "Authentication failed"

**Cause:** Wrong app password or regular Gmail password used

**Solution:**
1. Generate NEW app password
2. Make sure it's 16 characters
3. Remove all spaces
4. Update `.env`
5. Restart server

### Issue: Emails not received

**Check:**
1. ✅ Spam/Junk folder
2. ✅ Email logs in terminal: `Email sent: <message-id>`
3. ✅ Gmail account not blocked
4. ✅ 2-Step Verification enabled

---

## Email Configuration Reference

**Current configuration in `.env`:**

```env
# Email Configuration - Official Admin Email
SMTP_HOST=smtp.gmail.com          # Gmail SMTP server
SMTP_PORT=587                      # Port for TLS (secure)
SMTP_USER=ledvtech@gmail.com      # Your Gmail address
SMTP_PASS=your-gmail-app-password # ⚠️ NEED TO UPDATE THIS
MAIL_FROM="Vtech <ledvtech@gmail.com>"  # Sender name and email
ADMIN_EMAIL=ledvtech@gmail.com    # For admin notifications
SUPPORT_EMAIL=ledvtech@gmail.com  # For customer support
SUPPORT_PHONE=+919944556683       # Support contact
```

---

## Complete Setup Checklist

- [ ] 1. Go to https://myaccount.google.com/apppasswords
- [ ] 2. Generate App Password for "VTech Ecommerce"
- [ ] 3. Copy 16-character password
- [ ] 4. Update `shop/apps/api/.env` line 31
- [ ] 5. Remove spaces from app password
- [ ] 6. Restart API server: `npm run dev`
- [ ] 7. See "Email service ready" in logs
- [ ] 8. Test by registering new user
- [ ] 9. Check email inbox for verification
- [ ] 10. ✅ Email API Working!

---

## Tamil Instructions (Simple)

### Gmail App Password எப்படி எடுப்பது:

1. **Google Account-க்கு போங்க:**
   - https://myaccount.google.com/apppasswords
   - `ledvtech@gmail.com` login பண்ணுங்க

2. **App Password create பண்ணுங்க:**
   - App: **Mail** select பண்ணுங்க
   - Device: **Other** select பண்ணுங்க
   - Name: **VTech Ecommerce** type பண்ணுங்க
   - **Generate** click பண்ணுங்க
   - 16 character password copy பண்ணுங்க

3. **.env file-ல update பண்ணுங்க:**
   - File: `shop/apps/api/.env`
   - Line 31-ல paste பண்ணுங்க:
   ```env
   SMTP_PASS=your_copied_password_here
   ```
   - Space-களை remove பண்ணுங்க

4. **Server restart பண்ணுங்க:**
   ```bash
   cd shop/apps/api
   npm run dev
   ```

5. **Test பண்ணுங்க:**
   - New user register பண்ணுங்க
   - Email check பண்ணுங்க
   - Verification email வரும்!

---

## Support

**Email not working?** Contact:
- Email: ledvtech@gmail.com
- Phone: +919944556683

**Documentation:**
- Email Service: [shop/apps/api/src/services/emailService.js](shop/apps/api/src/services/emailService.js)
- Notification Service: [shop/apps/api/src/services/notificationService.js](shop/apps/api/src/services/notificationService.js)

---

## Summary

✅ **Email API is ALREADY integrated in your website!**
✅ **All code is ready**
✅ **Templates are designed**
✅ **Only need 1 thing: Gmail App Password**

**Total time to activate:** 5 minutes

**Once activated, your website will automatically send:**
- Welcome emails when users register
- Password reset emails
- Order confirmation emails
- Shipping notification emails
- And any custom emails you want!

---

**Last Updated:** November 21, 2025
**Status:** Ready to activate with Gmail App Password
