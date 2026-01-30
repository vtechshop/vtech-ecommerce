// FILE: apps/api/src/routes/gst.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const { verifyGST } = require('../services/gstService');
const logger = require('../config/logger');

const router = express.Router();

// Rate limit: 10 requests per minute per user
const gstRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many GST verification requests. Please try again later.' } },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

// POST /api/gst/verify
router.post(
  '/verify',
  authenticate,
  authorize(['vendor', 'affiliate', 'admin']),
  gstRateLimit,
  async (req, res, next) => {
    try {
      const { gstNumber } = req.body;

      if (!gstNumber) {
        return res.status(400).json({
          success: false,
          error: { code: 'GST_REQUIRED', message: 'GST number is required' },
        });
      }

      const result = await verifyGST(gstNumber);

      if (!result.verified) {
        return res.status(400).json({
          success: false,
          error: { code: 'GST_INVALID', message: result.error },
        });
      }

      logger.info(`GST verified by user ${req.user._id}: ${gstNumber}`);

      res.json({
        success: true,
        data: result.data,
        active: result.active,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
