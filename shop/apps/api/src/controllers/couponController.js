// FILE: apps/api/src/controllers/couponController.js
const Coupon = require('../models/Coupon');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/coupons - Public: Get all active coupons
exports.getActiveCoupons = asyncHandler(async (req, res) => {
  const now = new Date();

  const coupons = await Coupon.find({
    isActive: true,
    $or: [
      { startDate: { $exists: false } },
      { startDate: null },
      { startDate: { $lte: now } },
    ],
  })
    .select('-applicableProducts -applicableCategories -applicableVendors')
    .sort({ createdAt: -1 })
    .lean();

  // Filter: endDate not passed, usageLimit not exceeded
  const filtered = coupons.filter(c => {
    if (c.endDate && new Date(c.endDate) < now) return false;
    if (c.usageLimit > 0 && c.usageCount >= c.usageLimit) return false;
    return true;
  });

  res.json({ success: true, data: filtered });
});

// GET /api/coupons/validate - Auth: Validate a coupon
exports.validateCoupon = asyncHandler(async (req, res) => {
  const { code, cartTotal } = req.query;

  if (!code) {
    throw AppError.badRequest('Coupon code is required');
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) {
    throw AppError.notFound('Coupon');
  }

  const now = new Date();

  // Check if active
  if (!coupon.isActive) {
    throw AppError.badRequest('This coupon is no longer active', 'COUPON_INACTIVE');
  }

  // Check date range
  if (coupon.startDate && now < coupon.startDate) {
    throw AppError.badRequest('This coupon is not yet valid', 'COUPON_NOT_STARTED');
  }
  if (coupon.endDate && now > coupon.endDate) {
    throw AppError.badRequest('This coupon has expired', 'COUPON_EXPIRED');
  }

  // Check usage limits
  if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
    throw AppError.badRequest('This coupon has reached its usage limit', 'COUPON_LIMIT_REACHED');
  }

  // Check minimum order amount
  const total = parseFloat(cartTotal) || 0;
  const minAmount = coupon.minOrderAmount || coupon.minOrderValue || 0;
  if (minAmount > 0 && total < minAmount) {
    throw AppError.badRequest(
      `Minimum order amount of ₹${minAmount} required`,
      'COUPON_MIN_ORDER'
    );
  }

  // Calculate discount
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Math.round((total * coupon.value) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.value;
  }

  // Discount cannot exceed cart total
  discount = Math.min(discount, total);

  res.json({
    success: true,
    data: {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      description: coupon.description,
    },
  });
});

// GET /api/coupons/all - Admin: Get all coupons
exports.getAllCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: coupons });
});

// POST /api/coupons - Admin: Create coupon
exports.createCoupon = asyncHandler(async (req, res) => {
  const {
    code, type, value, description, terms, minOrderAmount,
    maxDiscount, category, isActive, usageLimit, perUserLimit,
    startDate, endDate,
  } = req.body;

  if (!code || !type || value === undefined || !description) {
    throw AppError.badRequest('Code, type, value, and description are required');
  }

  // Check for duplicate code
  const existing = await Coupon.findOne({ code: code.toUpperCase() });
  if (existing) {
    throw AppError.conflict('A coupon with this code already exists');
  }

  const coupon = await Coupon.create({
    code,
    type,
    value,
    description,
    terms: terms || [],
    minOrderAmount: minOrderAmount || 0,
    maxDiscount,
    category: category || 'general',
    isActive: isActive !== undefined ? isActive : true,
    usageLimit: usageLimit || 0,
    perUserLimit: perUserLimit || 1,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  res.status(201).json({ success: true, data: coupon });
});

// PUT /api/coupons/:id - Admin: Update coupon
exports.updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    throw AppError.notFound('Coupon');
  }

  const allowedFields = [
    'code', 'type', 'value', 'description', 'terms', 'minOrderAmount',
    'maxDiscount', 'category', 'isActive', 'usageLimit', 'perUserLimit',
    'startDate', 'endDate',
  ];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      coupon[field] = req.body[field];
    }
  });

  await coupon.save();
  res.json({ success: true, data: coupon });
});

// DELETE /api/coupons/:id - Admin: Delete coupon
exports.deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    throw AppError.notFound('Coupon');
  }
  res.json({ success: true, data: { message: 'Coupon deleted successfully' } });
});
