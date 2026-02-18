const Warranty = require('../models/Warranty');
const User = require('../models/User');

class WarrantyService {
  /**
   * Generate warranty from purchase data
   * @param {Object} purchaseData - Purchase information
   * @returns {Object} Complete warranty card with admin view and notifications
   */
  async generateWarranty(purchaseData) {
    const {
      purchaseId,
      orderId,
      user,
      product,
      purchaseDate,
      warrantyPeriodDays,
      warrantyType = 'manufacturer',
      extraInfo = {}
    } = purchaseData;

    // Generate unique warranty ID
    const warrantyId = await Warranty.generateWarrantyId();

    // Calculate dates
    const startDate = new Date(purchaseDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + warrantyPeriodDays);

    // Calculate days
    const now = new Date();
    const daysSincePurchase = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    // Determine status
    let status;
    if (warrantyPeriodDays === 0) {
      status = 'no_warranty';
    } else if (daysRemaining < 0) {
      status = 'expired';
    } else if (daysRemaining <= 30) {
      status = 'expiring_soon';
    } else {
      status = 'active';
    }

    // Create warranty record
    const warranty = new Warranty({
      warrantyId,
      purchaseId,
      orderId,
      userId: user.id || undefined,
      // Store guest info for manual/in-store orders without registered user
      customerName: !user.id ? user.name : undefined,
      customerEmail: !user.id ? user.email : undefined,
      customerPhone: !user.id ? user.phone : undefined,
      productId: product.id,
      product: {
        name: product.name,
        model: product.model,
        serial: product.serial,
        category: product.category,
      },
      purchaseDate: startDate,
      warrantyStartDate: startDate,
      warrantyEndDate: endDate,
      warrantyPeriodDays,
      warrantyType,
      status,
      extraInfo,
    });

    await warranty.save();

    // Generate notifications
    const notifications = this._generateNotifications(daysRemaining, status, product.name, endDate);

    // Build response
    return {
      warrantyCard: {
        warrantyId,
        product: product.name,
        productModel: product.model || '',
        purchaseDate: startDate.toISOString().split('T')[0],
        warrantyStartDate: startDate.toISOString().split('T')[0],
        warrantyEndDate: endDate.toISOString().split('T')[0],
        daysSincePurchase,
        daysRemaining,
        status,
        warrantyType,
        visibleToUser: true,
      },
      adminView: {
        warrantyId,
        purchaseId,
        orderId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone || '',
        productId: product.id,
        productName: product.name,
        productModel: product.model || '',
        productSerial: product.serial || '',
        productCategory: product.category || '',
        purchaseDate: startDate.toISOString().split('T')[0],
        warrantyStartDate: startDate.toISOString().split('T')[0],
        warrantyEndDate: endDate.toISOString().split('T')[0],
        warrantyPeriodDays,
        warrantyType,
        daysSincePurchase,
        daysRemaining,
        status,
        extraInfo,
        lastNotificationSent: null,
        visibleToAdminOnly: true,
      },
      notifications,
      summaryText: this._generateSummaryText(product.name, endDate, status),
    };
  }

  /**
   * Get warranty by ID
   * @param {String} warrantyId - Warranty ID
   * @param {String} userRole - User role (for access control)
   * @returns {Object} Warranty data
   */
  async getWarranty(warrantyId, userRole) {
    const warranty = await Warranty.findOne({ warrantyId }).populate('userId', 'name email phone');

    if (!warranty) {
      throw new Error('Warranty not found');
    }

    // Update status
    warranty.updateStatus();
    await warranty.save();

    if (userRole === 'admin') {
      return {
        warranty: warranty.toAdminView(),
        notifications: this._generateNotifications(
          warranty.daysRemaining,
          warranty.status,
          warranty.product.name,
          warranty.warrantyEndDate
        ),
      };
    } else {
      return {
        warranty: warranty.toUserView(),
        summaryText: this._generateSummaryText(
          warranty.product.name,
          warranty.warrantyEndDate,
          warranty.status
        ),
      };
    }
  }

  /**
   * Get user's warranties
   * @param {String} userId - User ID
   * @returns {Array} List of warranties
   */
  async getUserWarranties(userId) {
    const warranties = await Warranty.find({ userId, isActive: true })
      .sort({ warrantyEndDate: -1 });

    // Update statuses
    for (const warranty of warranties) {
      warranty.updateStatus();
      await warranty.save();
    }

    return warranties.map(w => w.toUserView());
  }

  /**
   * Get all warranties (admin only)
   * @param {Object} filters - Filter options
   * @returns {Object} Paginated warranties
   */
  async getAllWarranties(filters = {}) {
    const {
      status,
      page = 1,
      limit = 20,
      search,
      expiringIn,
    } = filters;

    const query = { isActive: true };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { warrantyId: new RegExp(search, 'i') },
        { 'product.name': new RegExp(search, 'i') },
        { purchaseId: new RegExp(search, 'i') },
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

    const skip = (page - 1) * limit;

    const [warranties, total] = await Promise.all([
      Warranty.find(query)
        .populate('userId', 'name email phone')
        .sort({ warrantyEndDate: 1 })
        .skip(skip)
        .limit(limit),
      Warranty.countDocuments(query),
    ]);

    // Update statuses
    for (const warranty of warranties) {
      warranty.updateStatus();
    }

    return {
      warranties: warranties.map(w => w.toAdminView()),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check and send warranty notifications
   */
  async checkAndSendNotifications() {
    const now = new Date();

    // Find warranties expiring in 30 days
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const warranties = await Warranty.find({
      status: { $in: ['active', 'expiring_soon'] },
      warrantyEndDate: { $lte: thirtyDaysFromNow },
      isActive: true,
    }).populate('userId', 'name email phone');

    const notificationsToSend = [];

    for (const warranty of warranties) {
      const daysRemaining = warranty.daysRemaining;
      let notificationType = null;

      // Check if notification should be sent
      if (daysRemaining <= 0 && !this._hasNotification(warranty, 'expired')) {
        notificationType = 'expired';
      } else if (daysRemaining === 7 && !this._hasNotification(warranty, '7_days_before')) {
        notificationType = '7_days_before';
      } else if (daysRemaining === 30 && !this._hasNotification(warranty, '30_days_before')) {
        notificationType = '30_days_before';
      }

      if (notificationType) {
        // Add notification record
        warranty.notifications.push({
          type: notificationType,
          sentAt: now,
          sentTo: warranty.userId.email,
        });
        warranty.lastNotificationSent = now;
        await warranty.save();

        notificationsToSend.push({
          warrantyId: warranty.warrantyId,
          userId: warranty.userId._id,
          userEmail: warranty.userId.email,
          type: notificationType,
          product: warranty.product.name,
          daysRemaining,
          endDate: warranty.warrantyEndDate,
        });
      }
    }

    return notificationsToSend;
  }

  /**
   * Private helper methods
   */
  _hasNotification(warranty, type) {
    return warranty.notifications.some(n => n.type === type);
  }

  _generateNotifications(daysRemaining, status, productName, endDate) {
    const notifications = [];
    const endDateStr = endDate.toISOString().split('T')[0];

    if (status === 'expired') {
      notifications.push({
        for: 'user',
        when: 'on_expiry',
        message: `Your warranty for ${productName} has expired on ${endDateStr}. Contact support for extended warranty options.`,
      });
      notifications.push({
        for: 'admin',
        when: 'on_expiry',
        message: `Warranty expired for ${productName} (${daysRemaining * -1} days ago)`,
      });
    } else if (daysRemaining <= 7 && daysRemaining > 0) {
      notifications.push({
        for: 'user',
        when: '7_days_before',
        message: `Your warranty for ${productName} expires in ${daysRemaining} days on ${endDateStr}. Consider renewing now.`,
      });
      notifications.push({
        for: 'admin',
        when: '7_days_before',
        message: `Warranty expiring soon for ${productName} - ${daysRemaining} days remaining`,
      });
    } else if (daysRemaining <= 30 && daysRemaining > 7) {
      notifications.push({
        for: 'user',
        when: '30_days_before',
        message: `Your warranty for ${productName} expires in ${daysRemaining} days on ${endDateStr}. Plan ahead for renewal.`,
      });
      notifications.push({
        for: 'admin',
        when: '30_days_before',
        message: `Warranty expiring in 30 days for ${productName}`,
      });
    }

    return notifications;
  }

  _generateSummaryText(productName, endDate, status) {
    const endDateStr = endDate.toISOString().split('T')[0];

    const statusTexts = {
      active: `Your ${productName} warranty is active until ${endDateStr}`,
      expiring_soon: `Your ${productName} warranty expires soon on ${endDateStr}`,
      expired: `Your ${productName} warranty expired on ${endDateStr}`,
      no_warranty: `No warranty available for ${productName}`,
    };

    return statusTexts[status] || `Warranty for ${productName} - expires ${endDateStr}`;
  }
}

module.exports = new WarrantyService();
