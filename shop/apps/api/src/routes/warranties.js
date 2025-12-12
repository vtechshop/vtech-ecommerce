const express = require('express');
const router = express.Router();
const warrantyService = require('../services/warrantyService');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

// Generate warranty (typically called after order completion)
// POST /api/warranties/generate
router.post('/generate', authenticate, authorize(['admin', 'vendor']), async (req, res, next) => {
  try {
    const warrantyData = await warrantyService.generateWarranty(req.body);

    res.status(201).json({
      success: true,
      message: 'Warranty generated successfully',
      data: warrantyData,
    });
  } catch (error) {
    next(error);
  }
});

// Get user's warranties
// GET /api/warranties/my-warranties
router.get('/my-warranties', authenticate, async (req, res, next) => {
  try {
    const warranties = await warrantyService.getUserWarranties(req.user._id);

    res.json({
      success: true,
      data: warranties,
    });
  } catch (error) {
    next(error);
  }
});

// Get specific warranty by ID - SECURITY: Added ObjectId validation
// GET /api/warranties/:warrantyId
router.get('/:warrantyId', authenticate, validateObjectId('warrantyId'), async (req, res, next) => {
  try {
    const { warrantyId } = req.params;
    const userRole = req.user.role;

    const warrantyData = await warrantyService.getWarranty(warrantyId, userRole);

    res.json({
      success: true,
      data: warrantyData,
    });
  } catch (error) {
    next(error);
  }
});

// Get all warranties (admin only)
// GET /api/warranties/admin/all
router.get('/admin/all', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      expiringIn: req.query.expiringIn,
    };

    const result = await warrantyService.getAllWarranties(filters);

    res.json({
      success: true,
      data: result.warranties,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

// Check and send notifications (admin only, typically called by cron job)
// POST /api/warranties/admin/check-notifications
router.post('/admin/check-notifications', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const notifications = await warrantyService.checkAndSendNotifications();

    res.json({
      success: true,
      message: `${notifications.length} notifications queued for sending`,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
});

// Get warranty statistics (admin only)
// GET /api/warranties/admin/stats
router.get('/admin/stats', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const Warranty = require('../models/Warranty');

    const [active, expiringSoon, expired, total] = await Promise.all([
      Warranty.countDocuments({ status: 'active', isActive: true }),
      Warranty.countDocuments({ status: 'expiring_soon', isActive: true }),
      Warranty.countDocuments({ status: 'expired', isActive: true }),
      Warranty.countDocuments({ isActive: true }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        expiringSoon,
        expired,
        noWarranty: total - (active + expiringSoon + expired),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
