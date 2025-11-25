// FILE: apps/api/src/controllers/uploadController.js
const uploadService = require('../services/uploadService');
const logger = require('../config/logger');

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
      });
    }

    const media = await uploadService.uploadFile(req.file, req.body.folder || 'general');

    logger.info(`File uploaded: ${media.filename}`);

    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadMultiple = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files uploaded',
        },
      });
    }

    const uploadPromises = req.files.map(file => 
      uploadService.uploadFile(file, req.body.folder || 'general')
    );

    const media = await Promise.all(uploadPromises);

    logger.info(`${media.length} files uploaded`);

    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const Media = require('../models/Media');
    const media = await Media.findById(id);

    if (!media) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'File not found',
        },
      });
    }

    const adapter = uploadService.getAdapter();
    await adapter.delete(media.filename);

    await media.deleteOne();

    logger.info(`File deleted: ${media.filename}`);

    res.json({
      success: true,
      data: { message: 'File deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};