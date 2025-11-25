const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hash');

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

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, avatar },
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

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'New password must be at least 8 characters long',
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
    const user = await User.findById(req.user._id);

    user.addresses.push(req.body);
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