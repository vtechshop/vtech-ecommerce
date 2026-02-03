// FILE: apps/api/src/routes/cms.js
const express = require('express');
const router = express.Router();
const Page = require('../models/Page');
const Post = require('../models/Post');
const Carousel = require('../models/Carousel');

// GET /cms/posts?page=1&limit=12
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [posts, total] = await Promise.all([
      Post.find({ published: true })
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Post.countDocuments({ published: true }),
    ]);

    res.json({
      success: true,
      data: posts,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
});

// GET /cms/posts/:slug
router.get('/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await Post.findOne({ slug, published: true }).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Post not found' },
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
});

// GET /cms/pages/:slug
router.get('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await Page.findOne({ slug, isPublished: true }).lean();

    if (!page) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Page not found' },
      });
    }

    res.json({
      success: true,
      data: page,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
});

// GET /cms/carousel - Public endpoint for active carousel items
router.get('/carousel', async (req, res) => {
  try {
    const items = await Carousel.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .select('title brand description tags imageUrl link')
      .lean();

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message },
    });
  }
});

module.exports = router;
