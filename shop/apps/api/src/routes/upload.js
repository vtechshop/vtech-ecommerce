const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const uploadService = require('../services/uploadService');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Single file upload - rate limited to prevent storage abuse
router.post(
  '/single',
  authenticate,
  uploadLimiter,
  uploadService.middleware('file'),
  uploadController.uploadFile
);

// Multiple files upload - rate limited to prevent storage abuse
router.post(
  '/multiple',
  authenticate,
  uploadLimiter,
  uploadService.middlewareMultiple('files', 10),
  uploadController.uploadMultiple
);

// Delete file
router.delete('/:id', authenticate, uploadController.deleteFile);

module.exports = router;