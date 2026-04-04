// FILE: apps/api/src/controllers/bannerController.js
const Banner = require('../models/Banner');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');
const { v2: cloudinary } = require('cloudinary');
const env = require('../config/env');

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// GET /api/banners - Public: Get all active banners
exports.getActiveBanners = asyncHandler(async (req, res) => {
  const now = new Date();
  const { platform } = req.query; // 'website' | 'mobile' | undefined (returns all)

  const query = {
    isActive: true,
    $or: [
      { startDate: { $exists: false } },
      { startDate: null },
      { startDate: { $lte: now } },
    ],
  };

  // Filter by platform if specified
  // Also match legacy banners that have no platform field (treat as 'website')
  if (platform) {
    const isWeb = platform === 'web' || platform === 'website';
    if (isWeb) {
      // Old banners with no platform field default to web only
      query.$and = [{
        $or: [
          { platform: 'web' },
          { platform: 'website' },
          { platform: 'both' },
          { platform: { $exists: false } },
          { platform: null },
        ],
      }];
    } else {
      // Mobile — never show old no-platform banners
      query.$and = [{ $or: [{ platform }, { platform: 'both' }] }];
    }
  }

  const banners = await Banner.find(query).sort({ order: 1 }).lean();

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
  const { title, subtitle, link, isActive, order, startDate, endDate, imagePosition } = req.body;

  let imageUrl = req.body.image;

  // Handle file upload
  if (req.file) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'vtech/banners', resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });
    imageUrl = result.secure_url;
  }

  if (!imageUrl) {
    throw AppError.badRequest('Banner image is required');
  }

  const { platform } = req.body;
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
    platform: ['website', 'mobile', 'both'].includes(platform) ? platform : 'website',
  });

  res.status(201).json({ success: true, data: banner });
});

// PUT /api/banners/:id - Admin: Update banner
exports.updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    throw AppError.notFound('Banner');
  }

  const { title, subtitle, link, isActive, order, startDate, endDate, imagePosition, platform } = req.body;

  // Handle new image upload
  if (req.file) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'vtech/banners', resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });
    banner.image = result.secure_url;
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
  if (platform !== undefined) banner.platform = platform;

  await banner.save();
  res.json({ success: true, data: banner });
});

// DELETE /api/banners/:id - Admin: Delete banner
exports.deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    throw AppError.notFound('Banner');
  }

  // Try to delete image from Cloudinary
  if (banner.image && banner.image.includes('cloudinary')) {
    try {
      const urlParts = banner.image.split('/');
      const uploadIdx = urlParts.indexOf('upload');
      if (uploadIdx !== -1) {
        const publicIdParts = urlParts.slice(uploadIdx + 2); // skip version
        const publicId = publicIdParts.join('/').replace(/\.[^.]+$/, '');
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (err) {
      // Non-critical - continue with deletion
    }
  }

  await Banner.findByIdAndDelete(req.params.id);
  res.json({ success: true, data: { message: 'Banner deleted successfully' } });
});
