// FILE: apps/api/src/controllers/referralController.js
const Referral = require('../models/Referral');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Get or create user's referral program
 * GET /api/referrals/my-program
 */
exports.getMyReferralProgram = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let referral = await Referral.findOne({ referrerId: userId })
    .populate('referredUsers.userId', 'name email');

  // Create if doesn't exist
  if (!referral) {
    const referralCode = await Referral.generateReferralCode(userId);

    referral = await Referral.create({
      referrerId: userId,
      referralCode,
    });

    referral = await Referral.findById(referral._id)
      .populate('referredUsers.userId', 'name email');
  }

  // Calculate stats
  const stats = {
    totalReferrals: referral.totalReferrals,
    successfulReferrals: referral.successfulReferrals,
    pendingReferrals: referral.getActiveReferralCount(),
    totalEarnings: referral.totalEarnings,
    conversionRate: referral.getConversionRate(),
  };

  res.json({
    success: true,
    data: {
      referralCode: referral.referralCode,
      referrerReward: referral.referrerReward,
      refereeReward: referral.refereeReward,
      stats,
      referredUsers: referral.referredUsers,
    },
  });
});

/**
 * Validate a referral code
 * GET /api/referrals/validate/:code
 */
exports.validateReferralCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const referral = await Referral.findOne({
    referralCode: code.toUpperCase(),
    isActive: true,
  }).populate('referrerId', 'name');

  if (!referral) {
    return res.status(404).json({
      success: false,
      message: 'Invalid referral code',
    });
  }

  // Don't allow self-referral
  if (req.user && referral.referrerId._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot use your own referral code',
    });
  }

  res.json({
    success: true,
    data: {
      valid: true,
      referrerName: referral.referrerId.name,
      refereeReward: referral.refereeReward,
    },
  });
});

/**
 * Apply referral code to user account
 * POST /api/referrals/apply
 * Body: { referralCode }
 */
exports.applyReferralCode = asyncHandler(async (req, res) => {
  const { referralCode } = req.body;
  const userId = req.user._id;

  if (!referralCode) {
    return res.status(400).json({
      success: false,
      message: 'Referral code is required',
    });
  }

  const referral = await Referral.findOne({
    referralCode: referralCode.toUpperCase(),
    isActive: true,
  });

  if (!referral) {
    return res.status(404).json({
      success: false,
      message: 'Invalid referral code',
    });
  }

  // Don't allow self-referral
  if (referral.referrerId.toString() === userId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot use your own referral code',
    });
  }

  // Check if user already used a referral code
  const user = await User.findById(userId);
  if (user.referredBy) {
    return res.status(400).json({
      success: false,
      message: 'You have already used a referral code',
    });
  }

  try {
    // Add user to referral program
    await referral.addReferredUser(userId);

    // Update user record
    user.referredBy = referral.referrerId;
    user.referralRewardPending = referral.refereeReward;
    await user.save();

    res.json({
      success: true,
      message: `Referral code applied! You'll receive ₹${(referral.refereeReward / 100).toFixed(2)} credit on your first purchase.`,
      data: {
        refereeReward: referral.refereeReward,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Get referral leaderboard
 * GET /api/referrals/leaderboard
 */
exports.getLeaderboard = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const leaderboard = await Referral.find({ isActive: true })
    .sort({ successfulReferrals: -1, totalEarnings: -1 })
    .limit(parseInt(limit))
    .populate('referrerId', 'name')
    .select('referrerId successfulReferrals totalEarnings');

  const formattedLeaderboard = leaderboard.map((entry, index) => ({
    rank: index + 1,
    userName: entry.referrerId.name,
    successfulReferrals: entry.successfulReferrals,
    totalEarnings: entry.totalEarnings,
  }));

  res.json({
    success: true,
    data: formattedLeaderboard,
  });
});

/**
 * Get referral stats (admin)
 * GET /api/referrals/stats
 */
exports.getReferralStats = asyncHandler(async (req, res) => {
  const totalPrograms = await Referral.countDocuments();
  const activePrograms = await Referral.countDocuments({ isActive: true });

  const aggregateStats = await Referral.aggregate([
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: '$totalReferrals' },
        totalSuccessful: { $sum: '$successfulReferrals' },
        totalEarnings: { $sum: '$totalEarnings' },
      },
    },
  ]);

  const stats = aggregateStats[0] || {
    totalReferrals: 0,
    totalSuccessful: 0,
    totalEarnings: 0,
  };

  const conversionRate = stats.totalReferrals > 0
    ? ((stats.totalSuccessful / stats.totalReferrals) * 100).toFixed(2)
    : 0;

  res.json({
    success: true,
    data: {
      totalPrograms,
      activePrograms,
      totalReferrals: stats.totalReferrals,
      successfulReferrals: stats.totalSuccessful,
      totalEarningsPaid: stats.totalEarnings,
      overallConversionRate: conversionRate,
    },
  });
});
