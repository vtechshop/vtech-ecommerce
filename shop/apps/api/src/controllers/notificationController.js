// FILE: apps/api/src/controllers/notificationController.js
const Order = require('../models/Order');
const User = require('../models/User');
const ContactSubmission = require('../models/ContactSubmission');
const Communication = require('../models/Communication');
const Ticket = require('../models/Ticket');
const Vendor = require('../models/Vendor');
const Affiliate = require('../models/Affiliate');
const Commission = require('../models/Commission');
const AdCampaign = require('../models/AdCampaign');
const Notification = require('../models/Notification');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Category = require('../models/Category');
const logger = require('../config/logger');

/**
 * Get notification counts for admin/vendor dashboards
 * Returns counts of new orders, users, messages, etc.
 */
exports.getNotificationCounts = async (req, res, next) => {
  try {
    const { user } = req;
    const counts = {
      newOrders: 0,
      pendingOrders: 0,
      newUsers: 0,
      unreadMessages: 0,
      openTickets: 0,
      pendingVendors: 0,
      pendingAffiliates: 0,
      pendingCommissions: 0,
      pendingAds: 0,
      unreadNotifications: 0,
      totalNotifications: 0,
      // Additional counts
      pendingProducts: 0,
      pendingKYC: 0,
      pendingReviews: 0,
      pendingVendorCommissions: 0,
      manualOrders: 0,
      categoryDeleteRequests: 0,
    };

    // Calculate time threshold for "new" items (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (user.role === 'admin') {
      // Admin notifications

      // New orders (placed in last 24 hours)
      counts.newOrders = await Order.countDocuments({
        createdAt: { $gte: last24Hours },
        status: 'placed',
      });

      // Pending orders (all statuses that need attention)
      counts.pendingOrders = await Order.countDocuments({
        status: { $in: ['placed', 'processing'] },
      });

      // New users (registered in last 24 hours)
      counts.newUsers = await User.countDocuments({
        createdAt: { $gte: last24Hours },
      });

      // Unread contact submissions (only "new" status, exclude read/spam/resolved)
      counts.unreadMessages = await ContactSubmission.countDocuments({
        status: 'new',
      });

      // Open support tickets
      counts.openTickets = await Ticket.countDocuments({
        status: { $in: ['open', 'in_progress'] },
      });

      // Pending vendor approvals
      counts.pendingVendors = await Vendor.countDocuments({
        status: 'pending',
      });

      // Pending affiliate approvals
      counts.pendingAffiliates = await Affiliate.countDocuments({
        status: 'pending',
      });

      // Pending affiliate commission payments
      counts.pendingCommissions = await Commission.countDocuments({
        status: 'pending',
        type: 'affiliate',
      });

      // Unread communications (failed, pending, or recent)
      counts.unreadCommunications = await Communication.countDocuments({
        $or: [
          { status: 'failed' },
          { status: 'pending' },
          { createdAt: { $gte: last24Hours }, status: { $in: ['sent', 'delivered'] } }
        ]
      });

      // Pending ad campaign approvals
      counts.pendingAds = await AdCampaign.countDocuments({
        status: 'pending_approval',
        'approval.status': 'pending',
      });

      // Pending products (awaiting approval)
      counts.pendingProducts = await Product.countDocuments({
        status: 'pending',
      });

      // Pending KYC (vendors + affiliates needing KYC review)
      const pendingVendorKYC = await Vendor.countDocuments({
        'kyc.status': 'pending',
      });
      const pendingAffiliateKYC = await Affiliate.countDocuments({
        'kyc.status': 'pending',
      });
      counts.pendingKYC = pendingVendorKYC + pendingAffiliateKYC;

      // Pending reviews (awaiting moderation)
      counts.pendingReviews = await Review.countDocuments({
        status: 'pending',
      });

      // Pending vendor commission payments
      counts.pendingVendorCommissions = await Commission.countDocuments({
        status: 'pending',
        type: 'vendor',
      });

      // Manual orders created today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      counts.manualOrders = await Order.countDocuments({
        source: { $in: ['in-store', 'phone'] },
        createdAt: { $gte: today },
      });

      // Categories with delete requests
      counts.categoryDeleteRequests = await Category.countDocuments({
        deleteRequested: true,
      });

      // Unread in-app notifications for admin
      counts.unreadNotifications = await Notification.countDocuments({
        userId: user._id,
        read: false,
      });

    } else if (user.role === 'vendor') {
      // Vendor notifications (only their own products)
      const vendor = await Vendor.findOne({ userId: user._id });

      if (vendor) {
        // New orders for vendor's products (last 24 hours)
        counts.newOrders = await Order.countDocuments({
          'items.vendorId': vendor._id,
          createdAt: { $gte: last24Hours },
          status: 'placed',
        });

        // Pending orders for vendor's products
        counts.pendingOrders = await Order.countDocuments({
          'items.vendorId': vendor._id,
          status: { $in: ['placed', 'processing'] },
        });

        // Vendor's products pending approval
        counts.pendingProducts = await Product.countDocuments({
          vendorId: vendor._id,
          status: 'pending',
        });

        // Pending settlements (vendor commissions ready to be paid)
        counts.pendingSettlements = await Commission.countDocuments({
          vendorId: vendor._id,
          type: 'vendor',
          status: { $in: ['pending', 'approved'] },
        });

        // Open support tickets
        counts.openTickets = await Ticket.countDocuments({
          userId: user._id,
          status: { $in: ['open', 'in_progress'] },
        });

        // Vendor-specific communications/messages
        counts.unreadMessages = await Communication.countDocuments({
          recipientId: vendor._id,
          recipientModel: 'Vendor',
          read: false,
        });

        // Unread in-app notifications for vendor
        counts.unreadNotifications = await Notification.countDocuments({
          userId: user._id,
          read: false,
        });
      }
    } else if (user.role === 'affiliate') {
      // Affiliate notifications
      const affiliate = await Affiliate.findOne({ userId: user._id });

      if (affiliate) {
        // Pending commission payments for this affiliate
        counts.pendingCommissions = await Commission.countDocuments({
          affiliateId: affiliate._id,
          status: 'pending',
        });

        // Approved commissions (ready to be paid)
        counts.approvedCommissions = await Commission.countDocuments({
          affiliateId: affiliate._id,
          status: 'approved',
        });

        // Recent conversions (last 24 hours)
        counts.recentConversions = await Commission.countDocuments({
          affiliateId: affiliate._id,
          createdAt: { $gte: last24Hours },
        });

        // Open support tickets
        counts.openTickets = await Ticket.countDocuments({
          userId: user._id,
          status: { $in: ['open', 'in_progress'] },
        });

        // Affiliate-specific communications/messages
        counts.unreadMessages = await Communication.countDocuments({
          recipientId: affiliate._id,
          recipientModel: 'Affiliate',
          read: false,
        });

        // Unread in-app notifications for affiliate
        counts.unreadNotifications = await Notification.countDocuments({
          userId: user._id,
          read: false,
        });
      }
    } else if (user.role === 'customer') {
      // Customer notifications

      // Active orders (in transit)
      counts.activeOrders = await Order.countDocuments({
        userId: user._id,
        status: { $in: ['placed', 'paid', 'packed', 'shipped', 'out_for_delivery'] },
      });

      // Recent orders (last 24 hours)
      counts.newOrders = await Order.countDocuments({
        userId: user._id,
        createdAt: { $gte: last24Hours },
      });

      // Unread in-app notifications for customer
      counts.unreadNotifications = await Notification.countDocuments({
        userId: user._id,
        read: false,
      });
    }

    // Calculate total notifications
    counts.totalNotifications =
      counts.newOrders +
      counts.newUsers +
      counts.unreadMessages +
      (counts.unreadCommunications || 0) +
      counts.openTickets +
      counts.pendingVendors +
      counts.pendingAffiliates +
      counts.pendingCommissions +
      counts.pendingAds +
      counts.pendingProducts +
      counts.pendingKYC +
      counts.pendingReviews +
      counts.pendingVendorCommissions +
      counts.categoryDeleteRequests +
      counts.unreadNotifications;

    res.json({
      success: true,
      data: counts,
    });
  } catch (error) {
    logger.error('Error fetching notification counts:', error);
    next(error);
  }
};

/**
 * Get paginated notifications for the authenticated user
 * GET /api/notifications?page=1&limit=20&type=order&read=false
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const { user } = req;
    const { page = 1, limit = 20, type, read } = req.query;
    const { getPaginationMeta } = require('../utils/helpers');

    const cappedLimit = Math.min(parseInt(limit) || 20, 50);
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const skip = (pageNum - 1) * cappedLimit;

    const query = { userId: user._id };

    if (type) {
      const allowedTypes = [
        'order', 'payment', 'shipping', 'promotion', 'system',
        'message', 'ad', 'ticket', 'commission', 'vendor_approval',
        'affiliate_approval', 'kyc', 'product',
      ];
      if (allowedTypes.includes(type)) {
        query.type = type;
      }
    }

    if (read === 'true') query.read = true;
    else if (read === 'false') query.read = false;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(cappedLimit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: notifications,
      meta: getPaginationMeta(total, pageNum, cappedLimit),
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    next(error);
  }
};

/**
 * Mark notifications as read/seen
 */
exports.markNotificationsRead = async (req, res, next) => {
  try {
    const { type, notificationIds } = req.body;
    const { user } = req;

    // Mark specific notification IDs as read
    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      const cappedIds = notificationIds.slice(0, 100);
      await Notification.updateMany(
        { _id: { $in: cappedIds }, userId: user._id },
        { read: true, readAt: new Date() }
      );
    }

    // Mark all as read
    if (type === 'all') {
      await Notification.updateMany(
        { userId: user._id, read: false },
        { read: true, readAt: new Date() }
      );
    }

    // Legacy: mark messages as read (admin/vendor dashboard)
    if (type === 'messages') {
      if (user.role === 'admin') {
        await ContactSubmission.updateMany(
          { viewedAt: { $exists: false } },
          { viewedAt: new Date() }
        );
      } else if (user.role === 'vendor') {
        const Vendor = require('../models/Vendor');
        const vendor = await Vendor.findOne({ userId: user._id });

        if (vendor) {
          await Communication.updateMany(
            {
              recipientId: vendor._id,
              recipientModel: 'Vendor',
              read: false,
            },
            { read: true, readAt: new Date() }
          );
        }
      }
    }

    res.json({
      success: true,
      message: `${type || 'selected'} notifications marked as read`,
    });
  } catch (error) {
    logger.error('Error marking notifications as read:', error);
    next(error);
  }
};
