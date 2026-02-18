// FILE: apps/api/src/controllers/spinController.js
const SpinConfig = require('../models/SpinConfig');
const SpinHistory = require('../models/SpinHistory');
const Coupon = require('../models/Coupon');
const LoyaltyPoints = require('../models/LoyaltyPoints');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/gamification/spin/config - Auth: Get wheel config + remaining spins
exports.getConfig = asyncHandler(async (req, res) => {
  const config = await SpinConfig.findOne().lean();

  if (!config || !config.isActive) {
    return res.json({
      success: true,
      data: { isActive: false, segments: [], remainingSpins: 0 },
    });
  }

  // Count user's spins today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const spinsToday = await SpinHistory.countDocuments({
    user: req.user._id,
    spunAt: { $gte: startOfDay },
  });

  const remainingSpins = Math.max(0, config.dailySpinsAllowed - spinsToday);

  // Return segments WITHOUT probabilities
  const segments = config.segments.map(s => ({
    label: s.label,
    value: s.value,
    color: s.color,
    type: s.type,
  }));

  res.json({
    success: true,
    data: {
      isActive: config.isActive,
      segments,
      dailySpinsAllowed: config.dailySpinsAllowed,
      remainingSpins,
    },
  });
});

// POST /api/gamification/spin - Auth: Spin the wheel
exports.spin = asyncHandler(async (req, res) => {
  const config = await SpinConfig.findOne();

  if (!config || !config.isActive) {
    throw AppError.badRequest('Spin wheel is currently not available', 'SPIN_INACTIVE');
  }

  if (!config.segments || config.segments.length === 0) {
    throw AppError.badRequest('Spin wheel is not configured', 'SPIN_NOT_CONFIGURED');
  }

  // Check daily limit
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const spinsToday = await SpinHistory.countDocuments({
    user: req.user._id,
    spunAt: { $gte: startOfDay },
  });

  if (spinsToday >= config.dailySpinsAllowed) {
    throw AppError.badRequest('You have used all your spins for today', 'SPIN_LIMIT_REACHED');
  }

  // Server-side weighted random selection
  const random = Math.random();
  let cumulative = 0;
  let selectedIndex = 0;

  for (let i = 0; i < config.segments.length; i++) {
    cumulative += config.segments[i].probability;
    if (random <= cumulative) {
      selectedIndex = i;
      break;
    }
  }

  const prize = config.segments[selectedIndex];
  let couponCode = null;

  // If prize is a discount, create a single-use coupon
  if (prize.type === 'discount' && prize.value > 0) {
    const code = `SPIN${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    await Coupon.create({
      code,
      type: 'fixed',
      value: prize.value,
      description: `Spin & Win reward: ₹${prize.value} off`,
      terms: ['Won from Spin & Win', 'Single use only'],
      category: 'general',
      isActive: true,
      usageLimit: 1,
      perUserLimit: 1,
      // Expires in 7 days
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    couponCode = code;
  }

  // If prize is loyalty points, add to user's points
  if (prize.type === 'points' && prize.value > 0) {
    let loyaltyRecord = await LoyaltyPoints.findOne({ user: req.user._id });
    if (!loyaltyRecord) {
      loyaltyRecord = await LoyaltyPoints.create({ user: req.user._id });
    }
    loyaltyRecord.totalPoints += prize.value;
    loyaltyRecord.availablePoints += prize.value;
    loyaltyRecord.lifetimePoints += prize.value;
    loyaltyRecord.calculateTier();
    await loyaltyRecord.save();
  }

  // Save spin history
  await SpinHistory.create({
    user: req.user._id,
    prize: prize.label,
    value: prize.value,
    type: prize.type,
    couponCode,
  });

  res.json({
    success: true,
    data: {
      segment: selectedIndex,
      prize: prize.label,
      value: prize.value,
      type: prize.type,
      couponCode,
    },
  });
});

// GET /api/gamification/spin/history - Auth: User's spin history
exports.getHistory = asyncHandler(async (req, res) => {
  const history = await SpinHistory.find({ user: req.user._id })
    .sort({ spunAt: -1 })
    .limit(50)
    .lean();

  res.json({ success: true, data: history });
});

// PUT /api/gamification/spin/config - Admin: Update spin config
exports.updateConfig = asyncHandler(async (req, res) => {
  const { segments, dailySpinsAllowed, isActive } = req.body;

  // Validate probabilities sum to 1.0
  if (segments && segments.length > 0) {
    const totalProb = segments.reduce((sum, s) => sum + (s.probability || 0), 0);
    if (Math.abs(totalProb - 1.0) > 0.01) {
      throw AppError.badRequest(
        `Segment probabilities must sum to 1.0 (current sum: ${totalProb.toFixed(2)})`,
        'INVALID_PROBABILITIES'
      );
    }
  }

  const config = await SpinConfig.findOneAndUpdate(
    {},
    {
      segments: segments || [],
      dailySpinsAllowed: dailySpinsAllowed || 1,
      isActive: isActive !== undefined ? isActive : true,
    },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({ success: true, data: config });
});

// GET /api/gamification/spin/config/admin - Admin: Get full config with probabilities
exports.getAdminConfig = asyncHandler(async (req, res) => {
  const config = await SpinConfig.findOne().lean();
  res.json({ success: true, data: config || { segments: [], dailySpinsAllowed: 1, isActive: false } });
});
