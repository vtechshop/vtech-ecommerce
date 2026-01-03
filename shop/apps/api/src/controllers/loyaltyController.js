// FILE: apps/api/src/controllers/loyaltyController.js
const { LoyaltyService, POINTS_CONFIG } = require('../services/loyaltyService');
const logger = require('../config/logger');

// Get user's loyalty account
exports.getAccount = async (req, res, next) => {
  try {
    const account = await LoyaltyService.getOrCreateAccount(req.user.userId);
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

// Get transaction history
exports.getTransactionHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await LoyaltyService.getTransactionHistory(
      req.user.userId,
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Get loyalty statistics
exports.getStatistics = async (req, res, next) => {
  try {
    const stats = await LoyaltyService.getStatistics(req.user.userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// Get points configuration (for frontend display)
exports.getPointsConfig = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        earningRates: {
          perRupee: POINTS_CONFIG.POINTS_PER_RUPEE,
          signupBonus: POINTS_CONFIG.SIGNUP_BONUS,
          referralBonus: POINTS_CONFIG.REFERRAL_BONUS,
          reviewBonus: POINTS_CONFIG.REVIEW_BONUS,
          birthdayBonus: POINTS_CONFIG.BIRTHDAY_BONUS,
        },
        redemption: {
          pointsToRupeeRatio: POINTS_CONFIG.POINTS_TO_RUPEE_RATIO,
          minRedemptionPoints: POINTS_CONFIG.MIN_REDEMPTION_POINTS,
          maxRedemptionPercent: POINTS_CONFIG.MAX_REDEMPTION_PERCENT,
        },
        expiry: {
          expiryDays: POINTS_CONFIG.POINTS_EXPIRY_DAYS,
        },
        tiers: POINTS_CONFIG.TIER_THRESHOLDS,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Redeem points (called during checkout)
exports.redeemPoints = async (req, res, next) => {
  try {
    const { points, orderId, orderAmount } = req.body;

    if (!points || !orderAmount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Points and order amount are required',
        },
      });
    }

    const result = await LoyaltyService.redeemPoints(
      req.user.userId,
      points,
      orderId,
      orderAmount
    );

    res.json({
      success: true,
      data: {
        account: result.account,
        discountAmount: result.discountAmount,
        transaction: result.transaction,
      },
    });
  } catch (error) {
    if (error.message.includes('Insufficient points') ||
        error.message.includes('Minimum') ||
        error.message.includes('Cannot redeem')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REDEMPTION',
          message: error.message,
        },
      });
    }
    next(error);
  }
};

// Admin: Award points to user
exports.awardPointsAdmin = async (req, res, next) => {
  try {
    const { userId, points, reason, description } = req.body;

    if (!userId || !points || !reason || !description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID, points, reason, and description are required',
        },
      });
    }

    const result = await LoyaltyService.awardPoints(
      userId,
      points,
      'admin_adjustment',
      description,
      { adminId: req.user.userId, reason }
    );

    logger.info(`Admin ${req.user.userId} awarded ${points} points to user ${userId}`);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all users loyalty stats (paginated)
exports.getAllUsersLoyalty = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, tier, sortBy = 'totalPoints' } = req.query;
    const skip = (page - 1) * limit;

    const LoyaltyPoints = require('../models/LoyaltyPoints');

    const query = {};
    if (tier) {
      query.tier = tier;
    }

    const sortOptions = {};
    sortOptions[sortBy] = -1;

    const [accounts, total] = await Promise.all([
      LoyaltyPoints.find(query)
        .populate('user', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LoyaltyPoints.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        accounts,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
