// FILE: apps/api/src/services/notificationHelper.js
const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * Notification Helper Service
 * Centralized service for creating notifications across the application
 */

/**
 * Create a notification for a user
 * @param {Object} params - Notification parameters
 * @param {String} params.userId - User ID to notify
 * @param {String} params.type - Notification type
 * @param {String} params.title - Notification title
 * @param {String} params.message - Notification message
 * @param {Object} params.data - Additional data
 * @param {String} params.link - Link to related resource
 * @returns {Promise<Notification>}
 */
async function createNotification({ userId, type, title, message, data = {}, link = null }) {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      link,
    });

    logger.info(`Notification created for user ${userId}: ${type} - ${title}`);
    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notifications for multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Array>}
 */
async function createBulkNotifications(userIds, notificationData) {
  try {
    const notifications = userIds.map(userId => ({
      userId,
      ...notificationData,
    }));

    const created = await Notification.insertMany(notifications);
    logger.info(`Bulk notifications created for ${userIds.length} users: ${notificationData.type}`);
    return created;
  } catch (error) {
    logger.error('Error creating bulk notifications:', error);
    throw error;
  }
}

/**
 * Notify admin users
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Array>}
 */
async function notifyAdmins(notificationData) {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id').lean();
    if (admins.length === 0) {
      logger.warn('No admin users found to notify');
      return [];
    }

    const adminIds = admins.map(admin => admin._id);
    return createBulkNotifications(adminIds, notificationData);
  } catch (error) {
    logger.error('Error notifying admins:', error);
    throw error;
  }
}

// ============ AD CAMPAIGN NOTIFICATIONS ============

/**
 * Notify admin when vendor creates a new ad campaign
 */
async function notifyAdminNewAdCampaign({ campaign, vendor }) {
  return notifyAdmins({
    type: 'ad',
    title: 'New Ad Campaign Created',
    message: `${vendor.businessName} created a new ad campaign: ${campaign.name}`,
    data: {
      campaignId: campaign._id,
      vendorId: vendor._id,
      placement: campaign.placement,
      status: campaign.status,
    },
    link: `/admin-dashboard/ads`,
  });
}

/**
 * Notify vendor when ad campaign is approved/rejected
 */
async function notifyVendorAdStatusChange({ vendorUserId, campaign, status, rejectionReason = null }) {
  const messages = {
    approved: `Your ad campaign "${campaign.name}" has been approved and is now live!`,
    rejected: `Your ad campaign "${campaign.name}" was rejected. ${rejectionReason || 'Please review and resubmit.'}`,
  };

  return createNotification({
    userId: vendorUserId,
    type: 'ad',
    title: `Ad Campaign ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    message: messages[status],
    data: {
      campaignId: campaign._id,
      status,
      rejectionReason,
    },
    link: `/vendor-dashboard/ads`,
  });
}

/**
 * Notify vendor when ad budget is running low
 */
async function notifyVendorLowAdBudget({ vendorUserId, campaign, remainingBudget }) {
  return createNotification({
    userId: vendorUserId,
    type: 'ad',
    title: 'Low Ad Budget Warning',
    message: `Your ad campaign "${campaign.name}" has only ₹${remainingBudget} remaining. Please top up to continue.`,
    data: {
      campaignId: campaign._id,
      remainingBudget,
    },
    link: `/vendor-dashboard/ads/wallet`,
  });
}

// ============ ORDER NOTIFICATIONS ============

/**
 * Notify vendor of new order
 */
async function notifyVendorNewOrder({ vendorUserId, order, items }) {
  const itemCount = items.length;
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return createNotification({
    userId: vendorUserId,
    type: 'order',
    title: 'New Order Received',
    message: `You have a new order #${order.orderNumber} with ${itemCount} item(s) worth ₹${totalAmount.toFixed(2)}`,
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      itemCount,
      totalAmount,
    },
    link: `/vendor-dashboard/orders/${order._id}`,
  });
}

/**
 * Notify admin of new order
 */
async function notifyAdminNewOrder({ order, vendorName = 'Unknown Vendor' }) {
  return notifyAdmins({
    type: 'order',
    title: 'New Order Placed',
    message: `New order #${order.orderNumber} placed by ${order.shippingAddress?.name || 'Customer'} (Vendor: ${vendorName})`,
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
    },
    link: `/admin-dashboard/orders/${order._id}`,
  });
}

/**
 * Notify customer of order status change
 */
async function notifyCustomerOrderStatus({ userId, order, status }) {
  const statusMessages = {
    processing: 'Your order is being processed',
    shipped: 'Your order has been shipped',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled',
  };

  return createNotification({
    userId,
    type: 'order',
    title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `${statusMessages[status]} - Order #${order.orderNumber}`,
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status,
    },
    link: `/customer-dashboard/orders/${order._id}`,
  });
}

// ============ SUPPORT TICKET NOTIFICATIONS ============

/**
 * Notify admin of new support ticket
 */
async function notifyAdminNewTicket({ ticket, userEmail }) {
  return notifyAdmins({
    type: 'ticket',
    title: 'New Support Ticket',
    message: `New support ticket #${ticket.ticketNumber} from ${userEmail}: ${ticket.subject}`,
    data: {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      priority: ticket.priority,
    },
    link: `/admin-dashboard/tickets/${ticket._id}`,
  });
}

/**
 * Notify user of ticket status change
 */
async function notifyUserTicketStatusChange({ userId, ticket, status }) {
  const statusMessages = {
    in_progress: 'Your support ticket is being reviewed',
    resolved: 'Your support ticket has been resolved',
    closed: 'Your support ticket has been closed',
  };

  return createNotification({
    userId,
    type: 'ticket',
    title: 'Ticket Status Update',
    message: `${statusMessages[status]} - Ticket #${ticket.ticketNumber}`,
    data: {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      status,
    },
    link: `/dashboard/support/${ticket._id}`,
  });
}

/**
 * Notify user of new ticket reply
 */
async function notifyUserTicketReply({ userId, ticket, repliedBy }) {
  return createNotification({
    userId,
    type: 'ticket',
    title: 'New Reply on Your Ticket',
    message: `${repliedBy} replied to your ticket #${ticket.ticketNumber}`,
    data: {
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
    },
    link: `/dashboard/support/${ticket._id}`,
  });
}

// ============ VENDOR/AFFILIATE APPROVAL NOTIFICATIONS ============

/**
 * Notify admin of new vendor registration
 */
async function notifyAdminNewVendor({ vendor, userEmail }) {
  return notifyAdmins({
    type: 'vendor_approval',
    title: 'New Vendor Registration',
    message: `New vendor application from ${vendor.businessName} (${userEmail})`,
    data: {
      vendorId: vendor._id,
      businessName: vendor.businessName,
      email: userEmail,
    },
    link: `/admin-dashboard/vendors/${vendor._id}`,
  });
}

/**
 * Notify vendor of approval status change
 */
async function notifyVendorApprovalStatus({ vendorUserId, vendor, status, rejectionReason = null }) {
  const messages = {
    approved: `Your vendor account "${vendor.businessName}" has been approved! You can now start selling.`,
    rejected: `Your vendor application was rejected. ${rejectionReason || 'Please contact support for details.'}`,
  };

  return createNotification({
    userId: vendorUserId,
    type: 'vendor_approval',
    title: `Vendor ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    message: messages[status],
    data: {
      vendorId: vendor._id,
      status,
      rejectionReason,
    },
    link: `/vendor-dashboard`,
  });
}

/**
 * Notify admin of new affiliate registration
 */
async function notifyAdminNewAffiliate({ affiliate, userEmail }) {
  return notifyAdmins({
    type: 'affiliate_approval',
    title: 'New Affiliate Registration',
    message: `New affiliate application from ${affiliate.name || userEmail}`,
    data: {
      affiliateId: affiliate._id,
      email: userEmail,
    },
    link: `/admin-dashboard/affiliates/${affiliate._id}`,
  });
}

/**
 * Notify affiliate of approval status change
 */
async function notifyAffiliateApprovalStatus({ affiliateUserId, status, rejectionReason = null }) {
  const messages = {
    approved: 'Your affiliate account has been approved! You can now start earning commissions.',
    rejected: `Your affiliate application was rejected. ${rejectionReason || 'Please contact support for details.'}`,
  };

  return createNotification({
    userId: affiliateUserId,
    type: 'affiliate_approval',
    title: `Affiliate ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    message: messages[status],
    data: {
      status,
      rejectionReason,
    },
    link: `/affiliate-dashboard`,
  });
}

// ============ COMMISSION NOTIFICATIONS ============

/**
 * Notify affiliate of new commission earned
 */
async function notifyAffiliateNewCommission({ affiliateUserId, commission, orderNumber }) {
  return createNotification({
    userId: affiliateUserId,
    type: 'commission',
    title: 'New Commission Earned',
    message: `You earned ₹${commission.amount.toFixed(2)} commission from order #${orderNumber}`,
    data: {
      commissionId: commission._id,
      amount: commission.amount,
      orderNumber,
    },
    link: `/affiliate-dashboard/commissions`,
  });
}

/**
 * Notify affiliate when commission is paid
 */
async function notifyAffiliateCommissionPaid({ affiliateUserId, commission, amount }) {
  return createNotification({
    userId: affiliateUserId,
    type: 'commission',
    title: 'Commission Payment Processed',
    message: `Your commission payment of ₹${amount.toFixed(2)} has been processed`,
    data: {
      commissionId: commission._id,
      amount,
    },
    link: `/affiliate-dashboard/commissions`,
  });
}

/**
 * Notify admin of pending commission payments
 */
async function notifyAdminPendingCommissions({ count, totalAmount }) {
  return notifyAdmins({
    type: 'commission',
    title: 'Pending Commission Payments',
    message: `${count} commission payment(s) pending (Total: ₹${totalAmount.toFixed(2)})`,
    data: {
      count,
      totalAmount,
    },
    link: `/admin-dashboard/affiliate-commissions`,
  });
}

// ============ PRODUCT NOTIFICATIONS ============

/**
 * Notify admin of new product submission
 */
async function notifyAdminNewProduct({ product, vendorName }) {
  return notifyAdmins({
    type: 'product',
    title: 'New Product Submitted',
    message: `${vendorName} submitted a new product: ${product.title}`,
    data: {
      productId: product._id,
      vendorName,
    },
    link: `/admin-dashboard/products`,
  });
}

/**
 * Notify vendor when product is approved/rejected
 */
async function notifyVendorProductStatus({ vendorUserId, product, status, rejectionReason = null }) {
  const messages = {
    approved: `Your product "${product.title}" has been approved and is now live!`,
    rejected: `Your product "${product.title}" was rejected. ${rejectionReason || 'Please review and resubmit.'}`,
  };

  return createNotification({
    userId: vendorUserId,
    type: 'product',
    title: `Product ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    message: messages[status],
    data: {
      productId: product._id,
      status,
      rejectionReason,
    },
    link: `/vendor-dashboard/products`,
  });
}

// ============ KYC NOTIFICATIONS ============

/**
 * Notify admin of new KYC submission
 */
async function notifyAdminNewKYC({ vendor, userEmail }) {
  return notifyAdmins({
    type: 'kyc',
    title: 'New KYC Submission',
    message: `${vendor.businessName} submitted KYC documents for review`,
    data: {
      vendorId: vendor._id,
      email: userEmail,
    },
    link: `/admin-dashboard/kyc/${vendor._id}`,
  });
}

/**
 * Notify vendor of KYC status change
 */
async function notifyVendorKYCStatus({ vendorUserId, status, rejectionReason = null }) {
  const messages = {
    approved: 'Your KYC documents have been approved!',
    rejected: `Your KYC documents were rejected. ${rejectionReason || 'Please resubmit correct documents.'}`,
    pending: 'Your KYC documents are under review. This may take 1-2 business days.',
  };

  return createNotification({
    userId: vendorUserId,
    type: 'kyc',
    title: `KYC ${status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Under Review'}`,
    message: messages[status],
    data: {
      status,
      rejectionReason,
    },
    link: `/vendor-dashboard/kyc`,
  });
}

// ============ PAYMENT NOTIFICATIONS ============

/**
 * Notify user of payment success
 */
async function notifyUserPaymentSuccess({ userId, order, amount }) {
  return createNotification({
    userId,
    type: 'payment',
    title: 'Payment Successful',
    message: `Your payment of ₹${amount.toFixed(2)} for order #${order.orderNumber} was successful`,
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount,
    },
    link: `/customer-dashboard/orders/${order._id}`,
  });
}

/**
 * Notify user of payment failure
 */
async function notifyUserPaymentFailed({ userId, order, amount }) {
  return createNotification({
    userId,
    type: 'payment',
    title: 'Payment Failed',
    message: `Your payment of ₹${amount.toFixed(2)} for order #${order.orderNumber} failed. Please try again.`,
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount,
    },
    link: `/customer-dashboard/orders/${order._id}`,
  });
}

// Export all functions
module.exports = {
  // Core functions
  createNotification,
  createBulkNotifications,
  notifyAdmins,

  // Ad notifications
  notifyAdminNewAdCampaign,
  notifyVendorAdStatusChange,
  notifyVendorLowAdBudget,

  // Order notifications
  notifyVendorNewOrder,
  notifyAdminNewOrder,
  notifyCustomerOrderStatus,

  // Ticket notifications
  notifyAdminNewTicket,
  notifyUserTicketStatusChange,
  notifyUserTicketReply,

  // Vendor/Affiliate approval notifications
  notifyAdminNewVendor,
  notifyVendorApprovalStatus,
  notifyAdminNewAffiliate,
  notifyAffiliateApprovalStatus,

  // Commission notifications
  notifyAffiliateNewCommission,
  notifyAffiliateCommissionPaid,
  notifyAdminPendingCommissions,

  // Product notifications
  notifyAdminNewProduct,
  notifyVendorProductStatus,

  // KYC notifications
  notifyAdminNewKYC,
  notifyVendorKYCStatus,

  // Payment notifications
  notifyUserPaymentSuccess,
  notifyUserPaymentFailed,
};
