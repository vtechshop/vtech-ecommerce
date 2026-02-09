const express = require('express');
const router = express.Router();
const warrantyService = require('../services/warrantyService');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');
const Warranty = require('../models/Warranty');
const logger = require('../config/logger');

// Warranty check - optionalAuth so logged-in users get their data, guests can search by orderId
// GET /api/warranties/check?orderId=xxx or ?phone=my-account (for logged-in users)
const admin = require('../controllers/adminController');
router.get('/check', optionalAuth, admin.checkWarranty);

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

// Get all warranties (admin only) - with type filter support
// GET /api/warranties/admin/all
router.get('/admin/all', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20, search, expiringIn } = req.query;

    const query = { isActive: true };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.warrantyType = type;
    }

    if (search) {
      query.$or = [
        { warrantyId: new RegExp(search, 'i') },
        { 'product.name': new RegExp(search, 'i') },
        { purchaseId: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { customerEmail: new RegExp(search, 'i') },
        { customerPhone: new RegExp(search, 'i') },
      ];
    }

    if (expiringIn) {
      const daysAhead = parseInt(expiringIn);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      query.warrantyEndDate = {
        $gte: new Date(),
        $lte: futureDate,
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [warranties, total] = await Promise.all([
      Warranty.find(query)
        .populate('userId', 'name email phone')
        .sort({ warrantyEndDate: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Warranty.countDocuments(query),
    ]);

    // Update statuses and convert to admin view
    const warrantyData = [];
    for (const warranty of warranties) {
      warranty.updateStatus();
      warrantyData.push(warranty.toAdminView());
    }

    res.json({
      success: true,
      data: warrantyData,
      pagination: {
        total,
        currentPage: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
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

// Get warranty statistics (admin only) - Basic stats
// GET /api/warranties/admin/stats
router.get('/admin/stats', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
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

// Enhanced warranty statistics (admin only) - Amazon-style
// GET /api/warranties/admin/stats/enhanced
router.get('/admin/stats/enhanced', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    // Basic counts
    const [active, expiringSoon, expired, claimed, voided, total] = await Promise.all([
      Warranty.countDocuments({ status: 'active', isActive: true }),
      Warranty.countDocuments({ status: 'expiring_soon', isActive: true }),
      Warranty.countDocuments({ status: 'expired', isActive: true }),
      Warranty.countDocuments({ status: 'claimed', isActive: true }),
      Warranty.countDocuments({ status: 'void', isActive: true }),
      Warranty.countDocuments({ isActive: true }),
    ]);

    // Type distribution
    const typeDistribution = await Warranty.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$warrantyType', count: { $sum: 1 } } },
    ]);

    const typeDistributionObj = {};
    typeDistribution.forEach(t => {
      typeDistributionObj[t._id || 'unknown'] = t.count;
    });

    // Pending claims count
    const pendingClaims = await Warranty.countDocuments({
      isActive: true,
      'claims.status': 'pending',
    });

    // Average warranty period
    const avgResult = await Warranty.aggregate([
      { $match: { isActive: true, warrantyPeriodDays: { $gt: 0 } } },
      { $group: { _id: null, avgDays: { $avg: '$warrantyPeriodDays' } } },
    ]);

    const avgWarrantyDays = avgResult.length > 0 ? Math.round(avgResult[0].avgDays) : 0;

    // This month statistics
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthCreated = await Warranty.countDocuments({
      isActive: true,
      createdAt: { $gte: startOfMonth },
    });

    const thisMonthExpiring = await Warranty.countDocuments({
      isActive: true,
      status: { $in: ['active', 'expiring_soon'] },
      warrantyEndDate: {
        $gte: new Date(),
        $lte: new Date(new Date().setDate(new Date().getDate() + 30)),
      },
    });

    res.json({
      success: true,
      data: {
        total,
        active,
        expiringSoon,
        expired,
        claimed,
        voided,
        noWarranty: total - (active + expiringSoon + expired + claimed + voided),
        pendingClaims,
        avgWarrantyDays,
        typeDistribution: typeDistributionObj,
        thisMonth: {
          created: thisMonthCreated,
          expiring: thisMonthExpiring,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Export warranties to CSV (admin only)
// GET /api/warranties/admin/export
router.get('/admin/export', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const { status, type, search } = req.query;

    const query = { isActive: true };
    if (status) query.status = status;
    if (type) query.warrantyType = type;
    if (search) {
      query.$or = [
        { warrantyId: new RegExp(search, 'i') },
        { 'product.name': new RegExp(search, 'i') },
        { purchaseId: new RegExp(search, 'i') },
      ];
    }

    const warranties = await Warranty.find(query)
      .populate('userId', 'name email phone')
      .sort({ warrantyEndDate: 1 })
      .lean();

    // Generate CSV
    const headers = [
      'Warranty ID',
      'Order ID',
      'Product Name',
      'Product Model',
      'Customer Name',
      'Customer Email',
      'Warranty Type',
      'Purchase Date',
      'Start Date',
      'End Date',
      'Period (Days)',
      'Status',
      'Claims Count',
    ];

    const rows = warranties.map(w => [
      w.warrantyId,
      w.purchaseId,
      w.product?.name || '',
      w.product?.model || '',
      w.userId?.name || '',
      w.userId?.email || '',
      w.warrantyType,
      w.purchaseDate ? new Date(w.purchaseDate).toISOString().split('T')[0] : '',
      w.warrantyStartDate ? new Date(w.warrantyStartDate).toISOString().split('T')[0] : '',
      w.warrantyEndDate ? new Date(w.warrantyEndDate).toISOString().split('T')[0] : '',
      w.warrantyPeriodDays,
      w.status,
      w.claims?.length || 0,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=warranties-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// Extend warranty (admin only)
// PUT /api/warranties/admin/:id/extend
router.put('/admin/:id/extend', authenticate, authorize(['admin']), validateObjectId('id'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { days } = req.body;

    if (!days || days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Days must be a positive number',
      });
    }

    const warranty = await Warranty.findById(id);

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found',
      });
    }

    if (warranty.status === 'void') {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend a voided warranty',
      });
    }

    // Extend warranty end date
    const newEndDate = new Date(warranty.warrantyEndDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    warranty.warrantyEndDate = newEndDate;
    warranty.warrantyPeriodDays += days;
    warranty.warrantyType = 'extended';

    // Update status
    warranty.updateStatus();

    await warranty.save();

    logger.info(`Warranty ${warranty.warrantyId} extended by ${days} days by admin ${req.user._id}`);

    res.json({
      success: true,
      message: `Warranty extended by ${days} days`,
      data: warranty.toAdminView(),
    });
  } catch (error) {
    next(error);
  }
});

// Void warranty (admin only)
// PUT /api/warranties/admin/:id/void
router.put('/admin/:id/void', authenticate, authorize(['admin']), validateObjectId('id'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const warranty = await Warranty.findById(id);

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found',
      });
    }

    if (warranty.status === 'void') {
      return res.status(400).json({
        success: false,
        message: 'Warranty is already voided',
      });
    }

    warranty.status = 'void';
    await warranty.save();

    logger.info(`Warranty ${warranty.warrantyId} voided by admin ${req.user._id}`);

    res.json({
      success: true,
      message: 'Warranty voided successfully',
      data: warranty.toAdminView(),
    });
  } catch (error) {
    next(error);
  }
});

// Send warranty reminder (admin only)
// POST /api/warranties/admin/:id/send-reminder
router.post('/admin/:id/send-reminder', authenticate, authorize(['admin']), validateObjectId('id'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const warranty = await Warranty.findById(id).populate('userId', 'name email');

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found',
      });
    }

    // Record notification
    const now = new Date();
    warranty.notifications.push({
      type: 'manual_reminder',
      sentAt: now,
      sentTo: warranty.userId?.email || 'N/A',
    });
    warranty.lastNotificationSent = now;
    await warranty.save();

    // In production, this would send an email via notificationHelper
    logger.info(`Manual warranty reminder sent for ${warranty.warrantyId} by admin ${req.user._id}`);

    res.json({
      success: true,
      message: 'Reminder sent successfully',
      data: {
        warrantyId: warranty.warrantyId,
        sentTo: warranty.userId?.email,
        sentAt: now,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Process warranty claim (admin only)
// PUT /api/warranties/admin/:id/claims/:claimId
router.put('/admin/:id/claims/:claimId', authenticate, authorize(['admin']), validateObjectId('id'), async (req, res, next) => {
  try {
    const { id, claimId } = req.params;
    const { status, resolution } = req.body;

    if (!status || !['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid claim status. Must be approved, rejected, or completed',
      });
    }

    const warranty = await Warranty.findById(id);

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found',
      });
    }

    // Find and update claim
    const claim = warranty.claims.find(c => c.claimId === claimId);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found',
      });
    }

    claim.status = status;
    claim.resolvedDate = new Date();
    if (resolution) {
      claim.resolution = resolution;
    }

    // Update warranty status if claim is approved/completed
    if (status === 'completed' || status === 'approved') {
      warranty.status = 'claimed';
    }

    await warranty.save();

    logger.info(`Warranty claim ${claimId} ${status} for ${warranty.warrantyId} by admin ${req.user._id}`);

    res.json({
      success: true,
      message: `Claim ${status} successfully`,
      data: warranty.toAdminView(),
    });
  } catch (error) {
    next(error);
  }
});

// Bulk actions (admin only)
// POST /api/warranties/admin/bulk-action
router.post('/admin/bulk-action', authenticate, authorize(['admin']), async (req, res, next) => {
  try {
    const { action, warrantyIds, data = {} } = req.body;

    if (!action || !warrantyIds || !Array.isArray(warrantyIds) || warrantyIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Provide action and warrantyIds array',
      });
    }

    let updatedCount = 0;
    const now = new Date();

    switch (action) {
      case 'void':
        const voidResult = await Warranty.updateMany(
          { _id: { $in: warrantyIds }, status: { $ne: 'void' } },
          { $set: { status: 'void' } }
        );
        updatedCount = voidResult.modifiedCount;
        break;

      case 'send_reminder':
        const warranties = await Warranty.find({ _id: { $in: warrantyIds } }).populate('userId', 'email');
        for (const warranty of warranties) {
          warranty.notifications.push({
            type: 'bulk_reminder',
            sentAt: now,
            sentTo: warranty.userId?.email || 'N/A',
          });
          warranty.lastNotificationSent = now;
          await warranty.save();
          updatedCount++;
        }
        break;

      case 'extend':
        const extendDays = data.days || 30;
        const extendWarranties = await Warranty.find({
          _id: { $in: warrantyIds },
          status: { $ne: 'void' },
        });
        for (const warranty of extendWarranties) {
          const newEndDate = new Date(warranty.warrantyEndDate);
          newEndDate.setDate(newEndDate.getDate() + extendDays);
          warranty.warrantyEndDate = newEndDate;
          warranty.warrantyPeriodDays += extendDays;
          warranty.warrantyType = 'extended';
          warranty.updateStatus();
          await warranty.save();
          updatedCount++;
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Unknown action: ${action}`,
        });
    }

    logger.info(`Bulk warranty action '${action}' performed on ${updatedCount} warranties by admin ${req.user._id}`);

    res.json({
      success: true,
      message: `${action} completed for ${updatedCount} warranties`,
      data: { updatedCount },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
