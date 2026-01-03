// FILE: apps/api/src/controllers/gdprController.js
const GDPRService = require('../services/gdprService');
const logger = require('../config/logger');

// Export user data
exports.exportData = async (req, res, next) => {
  try {
    const exportData = await GDPRService.exportUserData(req.user.userId);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user_data_${req.user.userId}_${Date.now()}.json"`);

    res.json(exportData);
  } catch (error) {
    next(error);
  }
};

// Request account deletion
exports.requestDeletion = async (req, res, next) => {
  try {
    const result = await GDPRService.requestDataDeletion(req.user.userId);

    logger.info(`User ${req.user.userId} requested account deletion`);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Cancel account deletion
exports.cancelDeletion = async (req, res, next) => {
  try {
    const result = await GDPRService.cancelDataDeletion(req.user.userId);

    logger.info(`User ${req.user.userId} cancelled account deletion`);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Admin: Anonymize user
exports.anonymizeUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await GDPRService.anonymizeUserData(userId);

    logger.warn(`Admin ${req.user.userId} anonymized user ${userId}`);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Admin: Permanently delete user (use with extreme caution)
exports.permanentlyDeleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { confirmDelete } = req.body;

    if (confirmDelete !== 'PERMANENTLY_DELETE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Please confirm permanent deletion by sending confirmDelete: "PERMANENTLY_DELETE"',
        },
      });
    }

    const result = await GDPRService.permanentlyDeleteUser(userId);

    logger.warn(`Admin ${req.user.userId} PERMANENTLY deleted user ${userId}`);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
