// FILE: apps/api/src/routes/auth.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const auth = require('../controllers/authController');
const validate = require('../middleware/validate');
const {
  passwordResetLimiter,
  emailVerificationLimiter,
  authLimiter,
} = require('../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/authValidators');

// SECURITY: Apply rate limiting to auth endpoints
router.post('/register', authLimiter, validate(registerSchema), auth.register);
router.post('/login', authLimiter, validate(loginSchema), auth.login);
router.post('/refresh', auth.refresh);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), auth.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), auth.resetPassword);

// Email verification - rate limited to prevent spam
router.post('/verify-email', auth.verifyEmail);
router.post('/resend-verification', authenticate, emailVerificationLimiter, auth.resendVerification);

router.get('/me', authenticate, auth.me);
router.post('/logout', authenticate, auth.logout);

module.exports = router;
