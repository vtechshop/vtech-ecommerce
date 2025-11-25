// FILE: apps/api/src/controllers/cmsController.js
const Post = require('../models/Post');
const Page = require('../models/Page');
const Media = require('../models/Media');
const Banner = require('../models/Banner');
const { getPaginationMeta } = require('../utils/helpers');

// Get posts
exports.getPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, category } = req.query;

    const query = { published: true };
    if (category) query.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'name avatar')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Post.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: posts,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get post by slug
exports.getPostBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const post = await Post.findOne({ slug, published: true })
      .populate('author', 'name avatar bio')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Post not found',
        },
      });
    }

    // Increment view count
    await Post.updateOne({ _id: post._id }, { $inc: { viewCount: 1 } });

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

// Get page by slug
exports.getPageBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const page = await Page.findOne({ slug, published: true }).lean();

    if (!page) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Page not found',
        },
      });
    }

    // Increment view count
    await Page.updateOne({ _id: page._id }, { $inc: { viewCount: 1 } });

    res.json({
      success: true,
      data: page,
    });
  } catch (error) {
    next(error);
  }
};

// Get media
exports.getMedia = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, folder } = req.query;

    const query = {};
    if (folder) query.folder = folder;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [media, total] = await Promise.all([
      Media.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Media.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: media,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get banners
exports.getBanners = async (req, res, next) => {
  try {
    const { placement } = req.query;

    const now = new Date();
    const query = {
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: null },
      ],
    };

    if (placement) query.placement = placement;

    const banners = await Banner.find(query)
      .sort({ position: 1 })
      .lean();

    res.json({
      success: true,
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};