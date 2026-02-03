const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hash');
const loginActivityService = require('../services/loginActivityService');
const apiKeyService = require('../services/apiKeyService');

// Get profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken');

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Update profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;

    // SECURITY: Validate name (required, max 100 chars)
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_NAME', message: 'Name is required and cannot be empty' },
        });
      }
      if (name.length > 100) {
        return res.status(400).json({
          success: false,
          error: { code: 'NAME_TOO_LONG', message: 'Name cannot exceed 100 characters' },
        });
      }
    }

    // SECURITY: Validate phone format (optional, 10-15 digits)
    if (phone !== undefined && phone !== null && phone !== '') {
      const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PHONE', message: 'Phone number must be 10-15 digits' },
        });
      }
    }

    // SECURITY: Validate avatar URL (optional, must be valid URL or relative path)
    if (avatar !== undefined && avatar !== null && avatar !== '') {
      const urlRegex = /^(https?:\/\/|\/uploads\/)/i;
      if (!urlRegex.test(avatar)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_AVATAR', message: 'Avatar must be a valid URL or upload path' },
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name?.trim(), phone, avatar },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Change password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Current password and new password are required',
        },
      });
    }

    // SECURITY: Enforce same password complexity as registration
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

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    const isValid = await comparePassword(currentPassword, user.password);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect',
        },
      });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    res.json({
      success: true,
      data: { message: 'Password changed successfully' },
    });
  } catch (error) {
    next(error);
  }
};

// Get addresses
exports.getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');

    res.json({
      success: true,
      data: user.addresses || [],
    });
  } catch (error) {
    next(error);
  }
};

// Add address
exports.addAddress = async (req, res, next) => {
  try {
    const { fullName, phone, addressLine1, city, state, zipCode, country } = req.body;

    // SECURITY: Validate required address fields
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Full name is required' },
      });
    }

    if (!addressLine1 || typeof addressLine1 !== 'string' || addressLine1.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Address line 1 is required' },
      });
    }

    if (!city || typeof city !== 'string' || city.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'City is required' },
      });
    }

    if (!state || typeof state !== 'string' || state.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'State is required' },
      });
    }

    if (!zipCode || typeof zipCode !== 'string' || !/^\d{5,10}$/.test(zipCode.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Valid ZIP/Postal code is required (5-10 digits)' },
      });
    }

    // SECURITY: Validate phone format if provided
    if (phone && !/^[+]?[\d\s()-]{10,15}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PHONE', message: 'Invalid phone number format' },
      });
    }

    // SECURITY: Limit number of addresses per user
    const MAX_ADDRESSES = 10;
    const user = await User.findById(req.user._id);
    if (user.addresses.length >= MAX_ADDRESSES) {
      return res.status(400).json({
        success: false,
        error: { code: 'MAX_ADDRESSES', message: `Maximum ${MAX_ADDRESSES} addresses allowed` },
      });
    }

    // Sanitize and add address
    const sanitizedAddress = {
      fullName: fullName.trim(),
      phone: phone?.trim() || '',
      addressLine1: addressLine1.trim(),
      addressLine2: req.body.addressLine2?.trim() || '',
      city: city.trim(),
      district: req.body.district?.trim() || '',
      area: req.body.area?.trim() || '',
      state: state.trim(),
      zipCode: zipCode.trim(),
      country: country?.trim() || 'India',
      isDefault: user.addresses.length === 0 ? true : (req.body.isDefault || false),
    };

    user.addresses.push(sanitizedAddress);
    await user.save();

    res.status(201).json({
      success: true,
      data: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// Update address
exports.updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    const address = user.addresses.id(id);

    if (!address) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found',
        },
      });
    }

    Object.assign(address, req.body);
    await user.save();

    res.json({
      success: true,
      data: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// Delete address
exports.deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    user.addresses.pull(id);
    await user.save();

    res.json({
      success: true,
      data: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// Set default address
exports.setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    // SECURITY: Null check for user
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    // SECURITY: Validate address exists before setting as default
    const addressExists = user.addresses.some(addr => addr._id.toString() === id);
    if (!addressExists) {
      return res.status(404).json({
        success: false,
        error: { code: 'ADDRESS_NOT_FOUND', message: 'Address not found' },
      });
    }

    user.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === id;
    });

    await user.save();

    res.json({
      success: true,
      data: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// Get wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist').select('wishlist');

    res.json({
      success: true,
      data: user.wishlist || [],
    });
  } catch (error) {
    next(error);
  }
};

// Toggle wishlist (add or remove)
exports.toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const mongoose = require('mongoose');

    // SECURITY: Validate productId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PRODUCT_ID', message: 'Invalid product ID format' },
      });
    }

    const user = await User.findById(req.user._id);

    const index = user.wishlist.indexOf(productId);

    if (index > -1) {
      // Product is in wishlist, remove it
      user.wishlist.splice(index, 1);
    } else {
      // Product is not in wishlist, add it
      user.wishlist.push(productId);
    }

    await user.save();

    res.json({
      success: true,
      data: {
        wishlist: user.wishlist,
        isInWishlist: index === -1, // true if we just added it
      },
    });
  } catch (error) {
    next(error);
  }
};

// Add to wishlist
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const mongoose = require('mongoose');

    // SECURITY: Validate productId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PRODUCT_ID', message: 'Invalid product ID format' },
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    res.json({
      success: true,
      data: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
};

// Remove from wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const mongoose = require('mongoose');

    // SECURITY: Validate productId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PRODUCT_ID', message: 'Invalid product ID format' },
      });
    }

    const user = await User.findById(req.user._id);

    const index = user.wishlist.indexOf(productId);
    if (index > -1) {
      user.wishlist.splice(index, 1);
      await user.save();
    }

    res.json({
      success: true,
      data: user.wishlist,
    });
  } catch (error) {
    next(error);
  }
};

// Get user statistics
exports.getStats = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const Order = require('../models/Order');
    const user = await User.findById(req.user._id).select('wishlist');

    // Get total orders count
    const totalOrders = await Order.countDocuments({ userId: req.user._id });

    // Get total spent (sum of all completed orders)
    const ordersAggregate = await Order.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id), status: { $nin: ['cancelled', 'returned'] } } },
      { $group: { _id: null, totalSpent: { $sum: '$totals.total' } } }
    ]);

    const totalSpent = ordersAggregate.length > 0 ? ordersAggregate[0].totalSpent : 0;

    // Get wishlist count
    const wishlistCount = user.wishlist ? user.wishlist.length : 0;

    res.json({
      success: true,
      data: {
        totalOrders,
        totalSpent,
        wishlistCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update email preferences
exports.updateEmailPreferences = async (req, res, next) => {
  try {
    const { orderUpdates, promotions, newsletter } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        emailPreferences: {
          orderUpdates: orderUpdates !== undefined ? orderUpdates : true,
          promotions: promotions !== undefined ? promotions : true,
          newsletter: newsletter !== undefined ? newsletter : true,
        },
      },
      { new: true, runValidators: true }
    ).select('emailPreferences');

    res.json({
      success: true,
      data: user.emailPreferences,
    });
  } catch (error) {
    next(error);
  }
};

// Get email preferences
exports.getEmailPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('emailPreferences');

    res.json({
      success: true,
      data: user.emailPreferences || {
        orderUpdates: true,
        promotions: true,
        newsletter: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete account
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    // Validate password
    if (!password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PASSWORD',
          message: 'Password is required to delete your account',
        },
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Verify password
    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Password is incorrect',
        },
      });
    }

    // Don't allow admins to delete their accounts via this endpoint
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_DELETE_FORBIDDEN',
          message: 'Admin accounts cannot be deleted through this endpoint. Please contact support.',
        },
      });
    }

    // Delete user account
    await User.findByIdAndDelete(req.user._id);

    res.json({
      success: true,
      data: {
        message: 'Your account has been successfully deleted',
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get login activity
exports.getLoginActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = await loginActivityService.getUserActivities(req.user._id, limit);

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};

// Get user's API keys
exports.getAPIKeys = async (req, res, next) => {
  try {
    const apiKeys = await apiKeyService.getUserKeys(req.user._id);

    res.json({
      success: true,
      data: apiKeys,
    });
  } catch (error) {
    next(error);
  }
};

// Create new API key
exports.createAPIKey = async (req, res, next) => {
  try {
    const { name, permissions, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'API key name is required' },
      });
    }

    const apiKey = await apiKeyService.createKey(req.user._id, name, {
      permissions,
      description,
    });

    res.status(201).json({
      success: true,
      data: apiKey,
      message: 'API key created successfully. Please save this key as it won\'t be shown again.',
    });
  } catch (error) {
    next(error);
  }
};

// Delete API key
exports.deleteAPIKey = async (req, res, next) => {
  try {
    await apiKeyService.deleteKey(req.params.id, req.user._id);

    res.json({
      success: true,
      data: { message: 'API key deleted successfully' },
    });
  } catch (error) {
    if (error.message === 'API key not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message },
      });
    }
    next(error);
  }
};