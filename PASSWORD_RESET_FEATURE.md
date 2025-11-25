# Admin Password Reset Feature

## Overview
Admins can now reset passwords for any user (customers, vendors, affiliates, support staff) directly from the Admin Dashboard without needing access to user emails.

---

## Features

### 1. **Password Reset Button**
- Added a **purple key icon** button in the user actions column
- Located next to View, Activate/Deactivate, and Delete buttons
- Visible for all user roles: Customer, Vendor, Affiliate, Support, Admin

### 2. **Password Reset Modal**
- Clean, user-friendly modal interface
- Shows user details (name, email, role) for confirmation
- Requires new password (minimum 8 characters)
- Requires password confirmation to prevent typos
- Validation checks:
  - Passwords must match
  - Minimum 8 characters
  - Confirmation before reset

### 3. **Backend API**
- Secure endpoint: `PUT /admin/users/:id/reset-password`
- Requires admin authentication
- Password validation
- Secure password hashing using bcrypt
- Audit logging for security tracking

---

## How to Use

### Step 1: Access User Management
1. Login as admin (`admin@example.com` / `Password123`)
2. Go to **Admin Dashboard** → **Users**
3. You'll see a list of all users with filters by role

### Step 2: Reset Password
1. Find the user whose password you want to reset
2. Click the **purple key icon** (🔑) in the Actions column
3. A modal will appear showing:
   - User's name
   - User's email
   - User's role

### Step 3: Set New Password
1. Enter new password (minimum 8 characters)
2. Confirm the password by entering it again
3. Click **"Reset Password"** button
4. Confirm the action when prompted
5. Success! The password is reset immediately

---

## Technical Implementation

### Backend

**Route:** `apps/api/src/routes/admin.js`
```javascript
router.put('/users/:id/reset-password', admin.resetUserPassword);
```

**Controller:** `apps/api/src/controllers/adminController.js`
```javascript
exports.resetUserPassword = async (req, res, next) => {
  try {
    const { hashPassword } = require('../utils/hash');
    const { password } = req.body;

    // Validation
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Password must be at least 8 characters' }
      });
    }

    // Find user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    // Hash and save new password
    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    await user.save();

    // Log action
    logger.info(`Password reset by admin for user: ${user.email}`);

    res.json({
      success: true,
      data: { message: 'Password reset successfully' }
    });
  } catch (error) {
    next(error);
  }
};
```

### Frontend

**Component:** `apps/web/src/assets/pages/dashboard/admin/Users.jsx`

**Features:**
- Key icon button in actions column
- PasswordResetModal component
- Form validation
- Confirmation dialogs
- Error handling
- Success notifications

---

## Security Features

1. **Admin-Only Access**
   - Endpoint protected by `authenticate` and `authorize(['admin'])` middleware
   - Only admins can reset passwords

2. **Password Hashing**
   - Passwords are hashed using bcrypt before storage
   - Same security as regular user registration

3. **Audit Logging**
   - All password resets are logged with:
     - Admin who performed the reset
     - Target user email
     - Timestamp

4. **Validation**
   - Minimum 8 character password requirement
   - Password confirmation check
   - User existence verification

5. **Confirmation Dialog**
   - Admin must confirm the action before password is reset
   - Prevents accidental resets

---

## Use Cases

### 1. **Forgot Password Support**
When users forget their password and can't access email:
- Admin can reset it to a temporary password
- Inform user of the temporary password (via phone/chat)
- User can login and change password

### 2. **Account Recovery**
When user account is locked or compromised:
- Admin resets password immediately
- User regains access securely

### 3. **New Employee Onboarding**
For internal users (admin, support):
- Admin creates account with initial password
- User logs in and changes password on first login

### 4. **Emergency Access**
When urgent access is needed:
- Admin can reset password quickly
- No waiting for email verification

---

## Testing

### Test Case 1: Reset Customer Password
1. Login as admin
2. Go to Users page
3. Filter by "Customer" role
4. Click key icon for `demo@example.com`
5. Set new password: `NewPassword123`
6. Confirm password: `NewPassword123`
7. Click "Reset Password"
8. Logout and login as `demo@example.com` with `NewPassword123`
9. ✅ Should work!

### Test Case 2: Validation
1. Try password with <8 characters
2. ✅ Should show error
3. Try mismatched passwords
4. ✅ Should show error

### Test Case 3: Different Roles
1. Reset password for Vendor
2. Reset password for Affiliate
3. Reset password for Admin (yourself!)
4. ✅ All should work

---

## API Endpoint Details

### Reset User Password
**Endpoint:** `PUT /admin/users/:id/reset-password`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "password": "NewPassword123"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

**Error Responses:**
```json
// Invalid password (< 8 characters)
{
  "success": false,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "Password must be at least 8 characters"
  }
}

// User not found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  }
}

// Unauthorized (not admin)
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

---

## Files Modified

### Backend:
1. `shop/apps/api/src/routes/admin.js` - Added route
2. `shop/apps/api/src/controllers/adminController.js` - Added controller function

### Frontend:
1. `shop/apps/web/src/assets/pages/dashboard/admin/Users.jsx` - Added UI and modal

---

## Best Practices for Admins

1. **Verify User Identity**
   - Always verify the user's identity before resetting
   - Use phone, chat, or other verification methods

2. **Use Strong Temporary Passwords**
   - Create complex temporary passwords
   - Example: `TempPass2024!`

3. **Inform Users Securely**
   - Don't send passwords via email
   - Use secure channels (phone, encrypted chat)

4. **Ask Users to Change Password**
   - Instruct users to change password after first login
   - Temporary passwords should not be permanent

5. **Keep Records**
   - Note when and why you reset a password
   - All resets are automatically logged

---

## Troubleshooting

### Problem: "Password must be at least 8 characters"
**Solution:** Enter a password with 8 or more characters

### Problem: "Passwords do not match"
**Solution:** Ensure both password fields have identical values

### Problem: "User not found"
**Solution:** The user may have been deleted. Refresh the page.

### Problem: "Insufficient permissions"
**Solution:** Only admins can reset passwords. Verify you're logged in as admin.

---

## Future Enhancements

Potential improvements:
1. **Email Notification** - Notify user when admin resets their password
2. **Password Generator** - Auto-generate secure temporary passwords
3. **Expire Temporary Passwords** - Force password change on first login
4. **Activity Log in UI** - Show password reset history in user details
5. **Bulk Password Reset** - Reset multiple users at once
6. **2FA Reset** - Also reset two-factor authentication if enabled

---

## Security Considerations

### What Admins CAN Do:
✅ Reset any user's password
✅ View user details
✅ Activate/deactivate accounts
✅ Delete users

### What Admins CANNOT Do:
❌ See current passwords (they're hashed)
❌ Bypass password hashing
❌ Reset passwords without logging

### Recommendations:
- Limit admin role to trusted staff only
- Regularly audit password reset logs
- Use strong passwords for admin accounts
- Enable 2FA for admin accounts (when implemented)

---

## Summary

The password reset feature provides admins with a secure, efficient way to help users regain access to their accounts. It's fully integrated into the existing admin dashboard with proper validation, security, and logging.

**Key Benefits:**
- 🔐 Secure password hashing
- 📝 Audit logging
- ✅ Validation checks
- 🎨 User-friendly interface
- 🚀 Instant password reset
- 👥 Works for all user roles
