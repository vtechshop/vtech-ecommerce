const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate } = require('../middleware/auth');
const uploadService = require('../services/uploadService');

// Single file upload
router.post(
  '/single',
  authenticate,
  uploadService.middleware('file'),
  uploadController.uploadFile
);

// Multiple files upload
router.post(
  '/multiple',
  authenticate,
  uploadService.middlewareMultiple('files', 10),
  uploadController.uploadMultiple
);

// Delete file
router.delete('/:id', authenticate, uploadController.deleteFile);

module.exports = router;