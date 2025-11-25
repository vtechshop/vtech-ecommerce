// FILE: apps/api/src/services/authService.js
const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const logger = require('../config/logger');

class AuthService {
  async register(userData) {
    const { name, email, password, role = 'customer' } = userData;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    logger.info(`User registered: ${email}`);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async login(email, password) {
    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });

    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    user.lastLogin = new Date();
    await user.save();

    logger.info(`User logged in: ${email}`);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async logout(userId, refreshToken) {
    const user = await User.findById(userId);
    if (!user) return;

    // Remove refresh token
    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
    await user.save();

    logger.info(`User logged out: ${user.email}`);
  }

  async refreshAccessToken(refreshToken) {
    const { verifyRefreshToken } = require('../utils/jwt');

    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Check if refresh token exists
      const tokenExists = user.refreshTokens.some((rt) => rt.token === refreshToken);
      if (!tokenExists) {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const accessToken = generateAccessToken(user._id);

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;
    delete userObj.refreshTokens;
    return userObj;
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isMatch = await comparePassword(oldPassword, user.password);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    user.password = await hashPassword(newPassword);

    // Clear all refresh tokens (force re-login)
    user.refreshTokens = [];

    await user.save();

    logger.info(`Password changed: ${user.email}`);
  }
}

module.exports = new AuthService();