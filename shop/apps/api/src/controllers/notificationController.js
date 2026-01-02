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
 * Mark notifications as read/seen
 */
exports.markNotificationsRead = async (req, res, next) => {
  try {
    const { type } = req.body; // 'orders', 'users', 'messages', 'tickets'
    const { user } = req;

    // Update read status based on notification type
    if (type === 'messages') {
      if (user.role === 'admin') {
        // Mark all contact submissions as viewed
        await ContactSubmission.updateMany(
          { viewedAt: { $exists: false } },
          { viewedAt: new Date() }
        );
      } else if (user.role === 'vendor') {
        // Mark vendor communications as read
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
      message: `${type} notifications marked as read`,
    });
  } catch (error) {
    logger.error('Error marking notifications as read:', error);
    next(error);
  }
};
