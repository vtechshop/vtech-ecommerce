// FILE: apps/api/src/routes/blog.js
const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadMultipleMiddleware } = require('../middleware/upload');

// Public routes
router.get('/', blogController.getBlogs);
router.get('/categories', blogController.getCategories);
router.get('/tags', blogController.getTags);
router.get('/:slug', blogController.getBlog);
router.get('/:slug/comments', blogController.getComments);
router.post('/:slug/like', authenticate, blogController.likeBlog);
router.post('/:slug/share', blogController.shareBlog);
router.post('/:slug/comments', authenticate, blogController.addComment);
router.post('/comments/:commentId/like', authenticate, blogController.likeComment);

// Admin routes
router.get('/admin/all', authenticate, authorize('admin'), blogController.adminGetBlogs);
router.get('/admin/stats', authenticate, authorize('admin'), blogController.getBlogStats);
router.get('/admin/:id', authenticate, authorize('admin'), blogController.adminGetBlog);

router.post(
  '/admin',
  authenticate,
  authorize('admin'),
  uploadMultipleMiddleware(['featuredImage', 'images']),
  blogController.createBlog
);

router.put(
  '/admin/:id',
  authenticate,
  authorize('admin'),
  uploadMultipleMiddleware(['featuredImage', 'images']),
  blogController.updateBlog
);

router.delete('/admin/:id', authenticate, authorize('admin'), blogController.deleteBlog);

// Comment moderation
router.put('/admin/comments/:commentId/moderate', authenticate, authorize('admin'), blogController.moderateComment);
router.delete('/admin/comments/:commentId', authenticate, authorize('admin'), blogController.deleteComment);

module.exports = router;
