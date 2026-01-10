// FILE: apps/api/src/middleware/auth.js
const { verifyAccessToken } = require('../utils/jwt');

async function authenticate(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No access token' },
      });
    }

    const decoded = verifyAccessToken(token);

    // CRITICAL SECURITY FIX: Validate token data against database
    const User = require('../models/User');
    const user = await User.findById(decoded.userId).select('role email');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found' },
      });
    }

    // CRITICAL: Verify role in token matches role in database
    if (user.role !== decoded.role) {
      // Log suspicious activity - role mismatch indicates potential token tampering or collision
      console.error('[SECURITY ALERT] Token role mismatch:', {
        userId: decoded.userId,
        tokenRole: decoded.role,
        dbRole: user.role,
        email: decoded.email,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'ROLE_MISMATCH',
          message: 'Token role does not match user role. Please log in again.'
        },
      });
    }

    // SECURITY FIX: Include role and email in req.user for authorization checks
    req.user = {
      _id: decoded.userId,
      role: user.role, // Use database role, not token role
      email: user.email // Use database email, not token email
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
  }
}

function authorize(roles = []) {
  return (req, res, next) => {
    // Allow access if no roles specified
    if (!roles.length) return next();

    // SECURITY FIX: Properly enforce role-based access control
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    return next();
  };
}

// Middleware to require email verification
async function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  try {
    // Fetch user from database to check email verification status
    const User = require('../models/User');
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address to access this feature',
        },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Middleware to require approved KYC for vendor operations
async function requireApprovedKYC(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  // Admins bypass KYC check
  if (req.user.role === 'admin') {
    return next();
  }

  // Only check KYC for vendors
  if (req.user.role !== 'vendor') {
    return next();
  }

  try {
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findOne({ userId: req.user._id });

    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'KYC_REQUIRED',
          message: 'Vendor profile not found. Please complete vendor onboarding first.',
        },
      });
    }

    if (vendor.kyc.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'KYC_NOT_APPROVED',
          message: 'Your KYC verification is pending or was rejected. Please complete KYC verification to access this feature.',
          kycStatus: vendor.kyc.status,
        },
      });
    }

    // Attach vendor to request for downstream use
    req.vendor = vendor;
    next();
  } catch (error) {
    next(error);
  }
}

// Optional authentication - attach user if token exists, but don't require it
async function optionalAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (token) {
      try {
        const decoded = verifyAccessToken(token);

        // SECURITY FIX: Validate against database even for optional auth
        const User = require('../models/User');
        const user = await User.findById(decoded.userId).select('role email');

        if (user && user.role === decoded.role) {
          req.user = {
            _id: decoded.userId,
            role: user.role, // Use database role
            email: user.email // Use database email
          };
        } else {
          req.user = null;
        }
      } catch (err) {
        // Token is invalid but that's okay for optional auth
        req.user = null;
      }
    } else {
      req.user = null;
    }

    next();
  } catch (err) {
    // Error in processing, but allow request to continue
    req.user = null;
    next();
  }
}

module.exports = { authenticate, authorize, requireVerifiedEmail, requireApprovedKYC, optionalAuth };
