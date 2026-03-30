// FILE: apps/api/src/controllers/bannerController.js
const Banner = require('../models/Banner');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');
const uploadService = require('../services/uploadService');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function uploadBannerImage(file) {
  const adapter = uploadService.getAdapter();
  const filename = `banners/${uuidv4()}${path.extname(file.originalname)}`;
  const storedPath = await adapter.upload(file, filename);
  return adapter.getUrl(storedPath);
}

// GET /api/banners - Public: Get all active banners
exports.getActiveBanners = asyncHandler(async (req, res) => {
  const now = new Date();

  const banners = await Banner.find({
    isActive: true,
    $or: [
      { startDate: { $exists: false } },
      { startDate: null },
      { startDate: { $lte: now } },
    ],
  })
    .sort({ order: 1 })
    .lean();

  // Filter out banners whose endDate has passed
  const filtered = banners.filter(b => {
    if (!b.endDate) return true;
    return new Date(b.endDate) >= now;
  });

  res.json({ success: true, data: filtered });
});

// GET /api/banners/all - Admin: Get all banners
exports.getAllBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find().sort({ order: 1 }).lean();
  res.json({ success: true, data: banners });
});

// POST /api/banners - Admin: Create banner
exports.createBanner = asyncHandler(async (req, res) => {
  const { title, subtitle, link, isActive, order, startDate, endDate, imagePosition, bannerHeight, imageScale } = req.body;

  let imageUrl = req.body.image;

  if (req.file) {
    imageUrl = await uploadBannerImage(req.file);
  }

  if (!imageUrl) {
    throw AppError.badRequest('Banner image is required');
  }

  const banner = await Banner.create({
    title,
    subtitle,
    image: imageUrl,
    link: link || '',
    isActive: isActive !== undefined ? isActive : true,
    order: order || 0,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    imagePosition: imagePosition || '50',
    bannerHeight: bannerHeight ? Math.min(650, Math.max(250, parseInt(bannerHeight))) : 420,
    imageScale: imageScale ? Math.min(150, Math.max(50, parseInt(imageScale))) : 100,
  });

  res.status(201).json({ success: true, data: banner });
});

// PUT /api/banners/:id - Admin: Update banner
exports.updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    throw AppError.notFound('Banner');
  }

  const { title, subtitle, link, isActive, order, startDate, endDate, imagePosition, bannerHeight, imageScale } = req.body;

  if (req.file) {
    banner.image = await uploadBannerImage(req.file);
  } else if (req.body.image) {
    banner.image = req.body.image;
  }

  if (title !== undefined) banner.title = title;
  if (subtitle !== undefined) banner.subtitle = subtitle;
  if (link !== undefined) banner.link = link;
  if (isActive !== undefined) banner.isActive = isActive;
  if (order !== undefined) banner.order = order;
  if (startDate !== undefined) banner.startDate = startDate || null;
  if (endDate !== undefined) banner.endDate = endDate || null;
  if (imagePosition !== undefined) banner.imagePosition = imagePosition;
  if (bannerHeight !== undefined) banner.bannerHeight = Math.min(650, Math.max(250, parseInt(bannerHeight) || 420));
  if (imageScale !== undefined) banner.imageScale = Math.min(150, Math.max(50, parseInt(imageScale) || 100));

  await banner.save();
  res.json({ success: true, data: banner });
});

// DELETE /api/banners/:id - Admin: Delete banner
exports.deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    throw AppError.notFound('Banner');
  }

  await Banner.findByIdAndDelete(req.params.id);
  res.json({ success: true, data: { message: 'Banner deleted successfully' } });
});
