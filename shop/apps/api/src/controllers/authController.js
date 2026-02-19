// FILE: apps/api/src/controllers/authController.js
const crypto = require('crypto');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { hashPassword, comparePassword, hashRefreshToken, compareRefreshToken } = require('../utils/hash');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');
const logger = require('../config/logger');
const emailService = require('../services/emailService');
const loginActivityService = require('../services/loginActivityService');
const env = require('../config/env');

// Helper function to log audit events
async function logAudit(userId, action, details, req) {
  try {
    await AuditLog.create({
      userId,
      action,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

// Account lockout configuration
const MAX_LOGIN_ATTEMPTS = parseInt(env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCKOUT_DURATION = parseInt(env.LOCKOUT_DURATION_MINUTES) || 15;

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'User with this email already exists' },
      });
    }

    // Validate password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (@$!%*?&)'
        },
      });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    const hashed = await hashPassword(password);

    // Allow role selection, but validate it
    const allowedRoles = ['customer', 'vendor', 'affiliate'];
    const userRole = allowedRoles.includes(role) ? role : 'customer';

    const user = await User.create({
      name,
      email,
      phone,
      password: hashed,
      role: userRole,
      verificationToken: hashedToken,
      verificationTokenExpire: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      emailVerified: false,
    });

    // Auto-create affiliate profile if registering as affiliate
    if (userRole === 'affiliate') {
      try {
        const Affiliate = require('../models/Affiliate');
        const { generateAffiliateCode } = require('../utils/helpers');

        const affiliate = await Affiliate.create({
          userId: user._id,
          code: generateAffiliateCode(name || email),
          status: 'active', // Auto-approved - affiliates can start immediately
        });

        // Link affiliate profile to user
        user.affiliateProfile = affiliate._id;
        await user.save();

        logger.info(`Affiliate profile auto-created and activated: ${affiliate.code}`);
      } catch (affiliateError) {
        logger.error('Failed to auto-create affiliate profile:', affiliateError);
        // Continue with registration even if affiliate creation fails
      }
    }

    // Auto-create vendor profile if registering as vendor
    if (userRole === 'vendor') {
      try {
        const Vendor = require('../models/Vendor');
        const slugify = require('slugify');

        const baseSlug = slugify(name || email.split('@')[0], { lower: true, strict: true });
        const vendor = await Vendor.create({
          userId: user._id,
          storeName: name ? `${name}'s Store` : 'My Store',
          slug: `${baseSlug}-${Date.now()}`,
          description: '',
          kyc: {
            businessName: name || '',
            businessType: 'sole_proprietorship',
            businessAddress: '',
            taxId: '',
            phoneNumber: '',
            documents: [],
            status: 'pending',
          },
          bank: {},
          status: 'pending', // Requires admin approval
        });

        // Link vendor profile to user
        user.vendorProfile = vendor._id;
        await user.save();

        logger.info(`Vendor profile auto-created: ${vendor.slug}`);
      } catch (vendorError) {
        logger.error('Failed to auto-create vendor profile:', vendorError);
        // Continue with registration even if vendor creation fails
      }
    }

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user, verificationToken);
      logger.info(`Verification email sent to: ${email}`);
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails
    }

    // Generate tokens (user can still login but with limited access until verified)
    const accessToken = generateAccessToken(user._id, user.role, user.email);
    const refreshToken = generateRefreshToken(user._id, user.role, user.email);

    // SECURITY: Store hashed refresh token in database
    user.refreshToken = hashRefreshToken(refreshToken);
    await user.save();

    // Cookie settings for cross-origin mobile support
    // Send plain token to client (will be hashed when comparing)
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 1 month
    });

    // Audit log
    await logAudit(user._id, 'USER_REGISTERED', { email, role: user.role }, req);

    logger.info(`User registered: ${email}`);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          emailVerified: user.emailVerified
        },
        accessToken,
        message: 'Registration successful. Please check your email to verify your account.',
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Verification token is required' },
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired verification token' },
      });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    // Audit log
    await logAudit(user._id, 'EMAIL_VERIFIED', { email: user.email }, req);

    logger.info(`Email verified for: ${user.email}`);

    return res.json({
      success: true,
      data: { message: 'Email verified successfully! You can now access all features.' },
    });
  } catch (err) {
    next(err);
  }
};

exports.resendVerification = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_VERIFIED', message: 'Email is already verified' },
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    user.verificationToken = hashedToken;
    user.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user, verificationToken);

    logger.info(`Verification email resent to: ${user.email}`);

    return res.json({
      success: true,
      data: { message: 'Verification email has been resent. Please check your inbox.' },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Normalize email to lowercase for case-insensitive matching
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select('+password +refreshToken +loginAttempts +lockUntil');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${remainingTime} minutes.`
        },
      });
    }

    // Reset lock if expired
    if (user.lockUntil && user.lockUntil <= Date.now()) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
    }

    const ok = await comparePassword(password, user.password);
    if (!ok) {
      // Increment failed login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      // Lock account if max attempts reached
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = Date.now() + (LOCKOUT_DURATION * 60 * 1000);
        await user.save();

        // Send account locked email
        try {
          await emailService.sendAccountLockedEmail(user, LOCKOUT_DURATION);
        } catch (emailError) {
          logger.error('Failed to send account locked email:', emailError);
        }

        // Audit log
        await logAudit(user._id, 'ACCOUNT_LOCKED', {
          reason: 'Max login attempts exceeded',
          attempts: user.loginAttempts
        }, req);

        logger.warn(`Account locked for: ${normalizedEmail} after ${user.loginAttempts} failed attempts`);

        return res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Account locked due to multiple failed login attempts. Please try again in ${LOCKOUT_DURATION} minutes or reset your password.`
          },
        });
      }

      await user.save();

      // Audit log
      await logAudit(user._id, 'LOGIN_FAILED', {
        email: normalizedEmail,
        attempts: user.loginAttempts,
        remainingAttempts: MAX_LOGIN_ATTEMPTS - user.loginAttempts
      }, req);

      // Log login activity
      await loginActivityService.logActivity(user._id, 'failed_login', req, {
        status: 'failed',
        failureReason: 'Invalid password'
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: `Invalid email or password. ${MAX_LOGIN_ATTEMPTS - user.loginAttempts} attempts remaining.`
        },
      });
    }

    // Successful login - reset attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    const accessToken = generateAccessToken(user._id, user.role, user.email);
    const refreshToken = generateRefreshToken(user._id, user.role, user.email);

    // SECURITY: Store hashed refresh token in database
    user.refreshToken = hashRefreshToken(refreshToken);
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    // Cookie settings for cross-origin mobile support
    // Send plain token to client (will be hashed when comparing)
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin in production
      maxAge: 30 * 24 * 60 * 60 * 1000, // 1 month
    });

    // Audit log
    await logAudit(user._id, 'LOGIN_SUCCESS', { email: normalizedEmail }, req);

    // Log login activity
    await loginActivityService.logActivity(user._id, 'login', req);

    logger.info(`User logged in: ${normalizedEmail}`);

    // Populate vendor and affiliate profiles for role-based access control
    const populatedUser = await User.findById(user._id)
      .select('-password -refreshToken')
      .populate({
        path: 'vendorProfile',
        select: 'storeName slug status kyc',
      })
      .populate({
        path: 'affiliateProfile',
        select: 'kycStatus commissionRate totalEarnings',
      });

    return res.json({
      success: true,
      data: {
        user: populatedUser,
        accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies || {};
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token not provided' },
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId).select('+refreshToken');

    // SECURITY: Compare hashed refresh tokens using timing-safe comparison
    let tokenValid = false;
    if (user && user.refreshToken) {
      try {
        tokenValid = compareRefreshToken(refreshToken, user.refreshToken);
      } catch {
        tokenValid = false;
      }
    }

    if (!user || !tokenValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' },
      });
    }

    const accessToken = generateAccessToken(user._id, user.role, user.email);
    return res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken')
      .populate({
        path: 'vendorProfile',
        select: 'storeName slug status kyc',
      })
      .populate({
        path: 'affiliateProfile',
        select: 'kycStatus commissionRate totalEarnings',
      });
    return res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.clearCookie('refreshToken');

    // Audit log
    await logAudit(req.user._id, 'LOGOUT', {}, req);

    return res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Normalize email to lowercase for case-insensitive matching
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        data: { message: 'If your email exists in our system, you will receive a password reset link' },
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(user, resetToken);
      logger.info(`Password reset email sent to: ${normalizedEmail}`);
    } catch (emailError) {
      logger.error('Failed to send password reset email:', emailError);
    }

    // Audit log
    await logAudit(user._id, 'PASSWORD_RESET_REQUESTED', { email: normalizedEmail }, req);

    logger.info(`Password reset requested for: ${normalizedEmail}`);

    return res.json({
      success: true,
      data: {
        message: 'If your email exists in our system, you will receive a password reset link',
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Token and new password are required' },
      });
    }

    // SECURITY: Enforce password complexity (same as registration and changePassword)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-[\]{}|;:'"<>,.\/\\])[A-Za-z\d@$!%*?&#^()_+=\-[\]{}|;:'"<>,.\/\\]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        },
      });
    }

    // Hash the token from URL to compare with DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' },
      });
    }

    // Update password
    const hashed = await hashPassword(newPassword);
    user.password = hashed;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Reset login attempts on password reset
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    // Audit log
    await logAudit(user._id, 'PASSWORD_RESET_SUCCESS', { email: user.email }, req);

    logger.info(`Password reset successful for: ${user.email}`);

    return res.json({
      success: true,
      data: { message: 'Password has been reset successfully. You can now login with your new password.' },
    });
  } catch (err) {
    next(err);
  }
};
