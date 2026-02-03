// FILE: apps/api/src/services/gdprService.js
const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const LoyaltyPoints = require('../models/LoyaltyPoints');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const Newsletter = require('../models/Newsletter');
const Notification = require('../models/Notification');
const Ticket = require('../models/Ticket');
const LoginActivity = require('../models/LoginActivity');
const logger = require('../config/logger');

class GDPRService {
  /**
   * Export all user data (GDPR Article 20 - Right to Data Portability)
   */
  static async exportUserData(userId) {
    try {
      logger.info(`[GDPR] Starting data export for user: ${userId}`);

      // FIX: Use correct field names for each model (userId vs user)
      const user = await User.findById(userId).select('-password -refreshToken').lean();

      const [
        orders,
        reviews,
        cart,
        wishlist,
        loyaltyPoints,
        loyaltyTransactions,
        newsletter,
        notifications,
        tickets,
        loginActivity,
      ] = await Promise.all([
        Order.find({ userId: userId }).populate('items.productId', 'title sku').lean(),
        Review.find({ userId: userId }).populate('productId', 'title').lean(),
        Cart.findOne({ userId: userId }).populate('items.productId', 'title price').lean(),
        Wishlist.findOne({ userId: userId }).populate('products', 'title price images').lean(),
        LoyaltyPoints.findOne({ user: userId }).lean(), // LoyaltyPoints uses 'user'
        LoyaltyTransaction.find({ user: userId }).sort({ createdAt: -1 }).lean(), // uses 'user'
        Newsletter.findOne({ email: user?.email }).lean(),
        Notification.find({ userId: userId }).sort({ createdAt: -1 }).limit(100).lean(),
        Ticket.find({ userId: userId }).populate('assignedTo', 'name').lean(),
        LoginActivity.find({ userId: userId }).sort({ createdAt: -1 }).limit(50).lean(),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        exportVersion: '1.0',
        user: {
          personalInformation: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          addresses: user.addresses || [],
          preferences: user.emailPreferences || {},
          emailVerified: user.emailVerified || false, // FIX: correct field name
          isActive: user.isActive,
        },
        orders: {
          total: orders.length,
          data: orders.map(order => ({
            orderNumber: order.orderNumber,
            status: order.status,
            total: order.total,
            subtotal: order.subtotal,
            tax: order.tax,
            shippingFee: order.shippingFee,
            discount: order.discount,
            items: order.items,
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
            deliveredAt: order.deliveredAt,
          })),
        },
        reviews: {
          total: reviews.length,
          data: reviews.map(review => ({
            product: review.productId?.title, // FIX: correct field name
            rating: review.rating,
            comment: review.comment,
            status: review.status,
            helpfulCount: review.helpfulCount || 0,
            createdAt: review.createdAt,
          })),
        },
        cart: cart ? {
          items: cart.items,
          total: cart.total,
          updatedAt: cart.updatedAt,
        } : null,
        wishlist: wishlist ? {
          products: wishlist.products,
          createdAt: wishlist.createdAt,
        } : null,
        loyaltyProgram: loyaltyPoints ? {
          currentBalance: {
            totalPoints: loyaltyPoints.totalPoints,
            availablePoints: loyaltyPoints.availablePoints,
            usedPoints: loyaltyPoints.usedPoints,
            lifetimePoints: loyaltyPoints.lifetimePoints,
            tier: loyaltyPoints.tier,
          },
          transactions: loyaltyTransactions.map(t => ({
            type: t.type,
            points: t.points,
            reason: t.reason,
            description: t.description,
            balanceAfter: t.balanceAfter,
            createdAt: t.createdAt,
          })),
        } : null,
        newsletter: newsletter ? {
          email: newsletter.email,
          status: newsletter.status,
          preferences: newsletter.preferences,
          subscribedAt: newsletter.createdAt,
          unsubscribedAt: newsletter.unsubscribedAt,
        } : null,
        notifications: {
          total: notifications.length,
          recent: notifications.slice(0, 20).map(n => ({
            type: n.type,
            title: n.title,
            message: n.message,
            read: n.read,
            createdAt: n.createdAt,
          })),
        },
        supportTickets: {
          total: tickets.length,
          data: tickets.map(t => ({
            subject: t.subject,
            category: t.category,
            status: t.status,
            priority: t.priority,
            messagesCount: t.messages?.length || 0,
            createdAt: t.createdAt,
            resolvedAt: t.resolvedAt,
          })),
        },
        loginActivity: {
          total: loginActivity.length,
          recent: loginActivity.slice(0, 20).map(l => ({
            ip: l.ip,
            userAgent: l.userAgent,
            timestamp: l.timestamp,
            success: l.success,
          })),
        },
        dataProtectionRights: {
          rightToAccess: 'You have the right to access your personal data',
          rightToRectification: 'You have the right to correct inaccurate data',
          rightToErasure: 'You have the right to request deletion of your data',
          rightToRestriction: 'You have the right to restrict processing',
          rightToPortability: 'You have the right to receive your data in a structured format',
          rightToObject: 'You have the right to object to processing',
        },
      };

      logger.info(`[GDPR] Data export completed for user: ${userId}`);

      return exportData;
    } catch (error) {
      logger.error(`[GDPR] Error exporting user data:`, error);
      throw error;
    }
  }

  /**
   * Anonymize user data (GDPR Article 17 - Right to Erasure)
   * Keeps data for legal/accounting purposes but removes PII
   */
  static async anonymizeUserData(userId) {
    try {
      logger.info(`[GDPR] Starting data anonymization for user: ${userId}`);

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate anonymous identifiers
      const anonymousId = `deleted_user_${Date.now()}`;
      const anonymousEmail = `${anonymousId}@deleted.local`;

      // Anonymize user record - FIX: Use correct field names
      user.name = 'Deleted User';
      user.email = anonymousEmail;
      user.phone = null;
      user.avatar = null;
      user.addresses = [];
      user.emailPreferences = {};
      user.emailVerified = false;
      user.isActive = false;
      user.deletedAt = new Date();
      await user.save();

      // Anonymize orders (keep for accounting) - FIX: Use correct field name
      await Order.updateMany(
        { userId: userId },
        {
          $set: {
            'shippingAddress.name': 'Deleted User',
            'shippingAddress.email': anonymousEmail,
            'shippingAddress.phone': 'DELETED',
            'billingAddress.name': 'Deleted User',
            'billingAddress.email': anonymousEmail,
            'billingAddress.phone': 'DELETED',
          },
        }
      );

      // Delete reviews - FIX: Use correct field name
      await Review.deleteMany({ userId: userId });

      // Delete cart - FIX: Use correct field name
      await Cart.deleteMany({ userId: userId });

      // Delete wishlist - FIX: Use correct field name
      await Wishlist.deleteMany({ userId: userId });

      // Keep loyalty points for accounting, but mark as deleted
      await LoyaltyPoints.updateMany(
        { user: userId },
        { $set: { deletedAt: new Date() } }
      );

      // Unsubscribe from newsletter
      await Newsletter.updateOne(
        { email: user.email },
        { $set: { status: 'unsubscribed', unsubscribedAt: new Date() } }
      );

      // Delete notifications - FIX: Use correct field name
      await Notification.deleteMany({ userId: userId });

      // Anonymize tickets - FIX: Use correct field name
      await Ticket.updateMany(
        { userId: userId },
        { $set: { 'userId': null, anonymized: true } }
      );

      // Delete login activity - FIX: Use correct field name
      await LoginActivity.deleteMany({ userId: userId });

      logger.info(`[GDPR] Data anonymization completed for user: ${userId}`);

      return {
        success: true,
        message: 'User data has been anonymized successfully',
        anonymizedAt: new Date(),
      };
    } catch (error) {
      logger.error(`[GDPR] Error anonymizing user data:`, error);
      throw error;
    }
  }

  /**
   * Permanently delete user account (complete erasure)
   * WARNING: This is irreversible and should only be used when legally required
   */
  static async permanentlyDeleteUser(userId) {
    try {
      logger.warn(`[GDPR] PERMANENT DELETION requested for user: ${userId}`);

      // Delete user
      await User.findByIdAndDelete(userId);

      // Delete all associated data - FIX: Use correct field names for each model
      await Promise.all([
        Order.deleteMany({ userId: userId }),
        Review.deleteMany({ userId: userId }),
        Cart.deleteMany({ userId: userId }),
        Wishlist.deleteMany({ userId: userId }),
        LoyaltyPoints.deleteMany({ user: userId }), // uses 'user'
        LoyaltyTransaction.deleteMany({ user: userId }), // uses 'user'
        Notification.deleteMany({ userId: userId }),
        Ticket.deleteMany({ userId: userId }),
        LoginActivity.deleteMany({ userId: userId }),
      ]);

      logger.warn(`[GDPR] PERMANENT DELETION completed for user: ${userId}`);

      return {
        success: true,
        message: 'User account and all data have been permanently deleted',
        deletedAt: new Date(),
      };
    } catch (error) {
      logger.error(`[GDPR] Error permanently deleting user:`, error);
      throw error;
    }
  }

  /**
   * Request data deletion (initiates deletion process with grace period)
   */
  static async requestDataDeletion(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Set deletion request date (30-day grace period)
      user.deletionRequestedAt = new Date();
      user.deletionScheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await user.save();

      logger.info(`[GDPR] Deletion request submitted for user: ${userId}. Scheduled for: ${user.deletionScheduledFor}`);

      return {
        success: true,
        message: 'Your account is scheduled for deletion in 30 days. You can cancel this request before then.',
        scheduledFor: user.deletionScheduledFor,
      };
    } catch (error) {
      logger.error(`[GDPR] Error requesting data deletion:`, error);
      throw error;
    }
  }

  /**
   * Cancel data deletion request
   */
  static async cancelDataDeletion(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.deletionRequestedAt = null;
      user.deletionScheduledFor = null;
      await user.save();

      logger.info(`[GDPR] Deletion request cancelled for user: ${userId}`);

      return {
        success: true,
        message: 'Your account deletion request has been cancelled',
      };
    } catch (error) {
      logger.error(`[GDPR] Error cancelling data deletion:`, error);
      throw error;
    }
  }

  /**
   * Process scheduled deletions (run daily via cron)
   */
  static async processScheduledDeletions() {
    try {
      const now = new Date();
      const usersToDelete = await User.find({
        deletionScheduledFor: { $lte: now },
        deletedAt: null,
      });

      logger.info(`[GDPR] Found ${usersToDelete.length} users scheduled for deletion`);

      for (const user of usersToDelete) {
        await this.anonymizeUserData(user._id);
      }

      return {
        success: true,
        processed: usersToDelete.length,
      };
    } catch (error) {
      logger.error(`[GDPR] Error processing scheduled deletions:`, error);
      throw error;
    }
  }
}

module.exports = GDPRService;
