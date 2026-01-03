// FILE: apps/api/src/services/loyaltyService.js
const LoyaltyPoints = require('../models/LoyaltyPoints');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const logger = require('../config/logger');

// Points earning rates
const POINTS_CONFIG = {
  // Earning rates
  POINTS_PER_RUPEE: 1,              // 1 point per ₹1 spent
  SIGNUP_BONUS: 100,                // Welcome bonus
  REFERRAL_BONUS: 200,              // Refer a friend
  REVIEW_BONUS: 50,                 // Write a product review
  BIRTHDAY_BONUS: 500,              // Birthday gift
  TIER_UPGRADE_BONUS: {
    silver: 100,
    gold: 250,
    platinum: 500,
    diamond: 1000,
  },

  // Redemption rates
  POINTS_TO_RUPEE_RATIO: 1,         // 1 point = ₹1 discount
  MIN_REDEMPTION_POINTS: 100,       // Minimum 100 points to redeem
  MAX_REDEMPTION_PERCENT: 50,       // Can use max 50% of order value

  // Expiration
  POINTS_EXPIRY_DAYS: 365,          // Points expire after 1 year

  // Tier thresholds (lifetime points)
  TIER_THRESHOLDS: {
    bronze: 0,
    silver: 500,
    gold: 2000,
    platinum: 5000,
    diamond: 10000,
  },
};

class LoyaltyService {
  /**
   * Get or create loyalty account for user
   */
  static async getOrCreateAccount(userId) {
    let account = await LoyaltyPoints.findOne({ user: userId });

    if (!account) {
      account = await LoyaltyPoints.create({ user: userId });
      logger.info(`Created loyalty account for user: ${userId}`);
    }

    return account;
  }

  /**
   * Award points to user
   */
  static async awardPoints(userId, points, reason, description, metadata = {}) {
    try {
      const account = await this.getOrCreateAccount(userId);
      const balanceBefore = account.availablePoints;

      // Update points
      account.availablePoints += points;
      account.totalPoints += points;
      account.lifetimePoints += points;

      // Check for tier upgrade
      const oldTier = account.tier;
      account.calculateTier();
      const newTier = account.tier;

      await account.save();

      // Create transaction record
      const transaction = await LoyaltyTransaction.create({
        user: userId,
        type: 'earned',
        points,
        reason,
        description,
        balanceBefore,
        balanceAfter: account.availablePoints,
        expiresAt: new Date(Date.now() + POINTS_CONFIG.POINTS_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        metadata,
      });

      // Award tier upgrade bonus if applicable
      if (newTier !== oldTier) {
        const tierBonus = POINTS_CONFIG.TIER_UPGRADE_BONUS[newTier];
        if (tierBonus) {
          await this.awardPoints(
            userId,
            tierBonus,
            'tier_bonus',
            `Tier upgraded to ${newTier}! Bonus points awarded.`,
            { oldTier, newTier }
          );
        }
        logger.info(`User ${userId} upgraded from ${oldTier} to ${newTier}`);
      }

      logger.info(`Awarded ${points} points to user ${userId} for ${reason}`);
      return { account, transaction };
    } catch (error) {
      logger.error(`Error awarding points to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Redeem points for discount
   */
  static async redeemPoints(userId, points, orderId, orderAmount) {
    try {
      const account = await this.getOrCreateAccount(userId);

      // Validation
      if (account.availablePoints < points) {
        throw new Error('Insufficient points balance');
      }

      if (points < POINTS_CONFIG.MIN_REDEMPTION_POINTS) {
        throw new Error(`Minimum ${POINTS_CONFIG.MIN_REDEMPTION_POINTS} points required for redemption`);
      }

      const maxRedeemablePoints = Math.floor((orderAmount * POINTS_CONFIG.MAX_REDEMPTION_PERCENT) / 100);
      if (points > maxRedeemablePoints) {
        throw new Error(`Cannot redeem more than ${POINTS_CONFIG.MAX_REDEMPTION_PERCENT}% of order value`);
      }

      const balanceBefore = account.availablePoints;

      // Deduct points
      account.availablePoints -= points;
      account.usedPoints += points;
      await account.save();

      // Create transaction
      const transaction = await LoyaltyTransaction.create({
        user: userId,
        type: 'redeemed',
        points: -points, // Negative for redemption
        reason: 'redemption',
        description: `Redeemed ${points} points for ₹${points * POINTS_CONFIG.POINTS_TO_RUPEE_RATIO} discount`,
        relatedOrder: orderId,
        balanceBefore,
        balanceAfter: account.availablePoints,
        metadata: { orderAmount, discountAmount: points * POINTS_CONFIG.POINTS_TO_RUPEE_RATIO },
      });

      logger.info(`User ${userId} redeemed ${points} points for order ${orderId}`);
      return { account, transaction, discountAmount: points * POINTS_CONFIG.POINTS_TO_RUPEE_RATIO };
    } catch (error) {
      logger.error(`Error redeeming points for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate points for order purchase
   */
  static calculatePointsForOrder(orderAmount) {
    return Math.floor(orderAmount * POINTS_CONFIG.POINTS_PER_RUPEE);
  }

  /**
   * Award points for completed order
   */
  static async awardOrderPoints(userId, orderId, orderAmount) {
    const points = this.calculatePointsForOrder(orderAmount);
    return await this.awardPoints(
      userId,
      points,
      'purchase',
      `Earned ${points} points from order purchase (₹${orderAmount})`,
      { orderId, orderAmount }
    );
  }

  /**
   * Award signup bonus
   */
  static async awardSignupBonus(userId) {
    return await this.awardPoints(
      userId,
      POINTS_CONFIG.SIGNUP_BONUS,
      'signup_bonus',
      `Welcome bonus! ${POINTS_CONFIG.SIGNUP_BONUS} points added to your account.`
    );
  }

  /**
   * Award referral bonus
   */
  static async awardReferralBonus(userId, referredUserId) {
    return await this.awardPoints(
      userId,
      POINTS_CONFIG.REFERRAL_BONUS,
      'referral',
      `Earned ${POINTS_CONFIG.REFERRAL_BONUS} points for referring a friend!`,
      { referredUserId }
    );
  }

  /**
   * Award review bonus
   */
  static async awardReviewBonus(userId, reviewId, productId) {
    return await this.awardPoints(
      userId,
      POINTS_CONFIG.REVIEW_BONUS,
      'review',
      `Earned ${POINTS_CONFIG.REVIEW_BONUS} points for writing a product review!`,
      { reviewId, productId }
    );
  }

  /**
   * Award birthday bonus
   */
  static async awardBirthdayBonus(userId) {
    return await this.awardPoints(
      userId,
      POINTS_CONFIG.BIRTHDAY_BONUS,
      'birthday',
      `Happy Birthday! ${POINTS_CONFIG.BIRTHDAY_BONUS} bonus points just for you!`
    );
  }

  /**
   * Refund points from cancelled order
   */
  static async refundOrderPoints(userId, orderId, points) {
    try {
      const account = await this.getOrCreateAccount(userId);
      const balanceBefore = account.availablePoints;

      account.availablePoints += points;
      account.totalPoints += points;
      await account.save();

      const transaction = await LoyaltyTransaction.create({
        user: userId,
        type: 'refunded',
        points,
        reason: 'order_cancelled',
        description: `Refunded ${points} points from cancelled order`,
        relatedOrder: orderId,
        balanceBefore,
        balanceAfter: account.availablePoints,
        metadata: { orderId },
      });

      logger.info(`Refunded ${points} points to user ${userId} for cancelled order ${orderId}`);
      return { account, transaction };
    } catch (error) {
      logger.error(`Error refunding points for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user transaction history
   */
  static async getTransactionHistory(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      LoyaltyTransaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('relatedOrder', 'orderNumber total')
        .lean(),
      LoyaltyTransaction.countDocuments({ user: userId }),
    ]);

    return {
      transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get loyalty statistics
   */
  static async getStatistics(userId) {
    const account = await this.getOrCreateAccount(userId);

    const stats = await LoyaltyTransaction.aggregate([
      { $match: { user: account.user } },
      {
        $group: {
          _id: null,
          totalEarned: {
            $sum: {
              $cond: [{ $eq: ['$type', 'earned'] }, '$points', 0],
            },
          },
          totalRedeemed: {
            $sum: {
              $cond: [{ $eq: ['$type', 'redeemed'] }, { $abs: '$points' }, 0],
            },
          },
          totalExpired: {
            $sum: {
              $cond: [{ $eq: ['$type', 'expired'] }, { $abs: '$points' }, 0],
            },
          },
        },
      },
    ]);

    return {
      account: account.toObject(),
      stats: stats[0] || { totalEarned: 0, totalRedeemed: 0, totalExpired: 0 },
    };
  }

  /**
   * Expire old points (run via cron job)
   */
  static async expireOldPoints() {
    try {
      const now = new Date();
      const expiredTransactions = await LoyaltyTransaction.find({
        type: 'earned',
        expiresAt: { $lte: now },
      });

      for (const transaction of expiredTransactions) {
        const account = await LoyaltyPoints.findOne({ user: transaction.user });
        if (!account) continue;

        const pointsToExpire = transaction.points;
        const balanceBefore = account.availablePoints;

        account.availablePoints = Math.max(0, account.availablePoints - pointsToExpire);
        await account.save();

        await LoyaltyTransaction.create({
          user: transaction.user,
          type: 'expired',
          points: -pointsToExpire,
          reason: 'expiration',
          description: `${pointsToExpire} points expired after ${POINTS_CONFIG.POINTS_EXPIRY_DAYS} days`,
          balanceBefore,
          balanceAfter: account.availablePoints,
        });

        // Mark original transaction as expired
        transaction.expiresAt = null; // Prevent re-processing
        await transaction.save();

        logger.info(`Expired ${pointsToExpire} points for user ${transaction.user}`);
      }

      logger.info(`Expired points job completed. Processed ${expiredTransactions.length} transactions.`);
    } catch (error) {
      logger.error('Error expiring points:', error);
      throw error;
    }
  }
}

module.exports = { LoyaltyService, POINTS_CONFIG };
