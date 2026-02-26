// FILE: apps/api/src/jobs/reviewRequestJob.js
// Send review request emails 3 days after delivery
const logger = require('../config/logger');
const Order = require('../models/Order');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

async function sendReviewRequests() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // Find delivered orders from 3+ days ago that haven't received a review email
  const orders = await Order.find({
    status: 'delivered',
    'shipment.deliveredAt': { $lte: threeDaysAgo },
    reviewEmailSent: { $ne: true },
    isVendorOrder: { $ne: true }, // Only parent/main orders, not vendor sub-orders
  }).limit(50).lean();

  if (orders.length === 0) {
    logger.info('[ReviewRequest] No eligible orders found');
    return { sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const order of orders) {
    try {
      // Get user email
      let userInfo = null;
      if (order.userId) {
        userInfo = await User.findById(order.userId).select('name email').lean();
      }
      if (!userInfo && order.guestEmail) {
        userInfo = { name: order.shipTo?.fullName || 'Customer', email: order.guestEmail };
      }
      if (!userInfo?.email) {
        skipped++;
        continue;
      }

      const result = await notificationService.sendReviewRequestEmail(userInfo, order);

      if (result?.success) {
        await Order.updateOne(
          { _id: order._id },
          { $set: { reviewEmailSent: true, reviewEmailSentAt: new Date() } }
        );
        sent++;
      } else {
        skipped++;
      }
    } catch (err) {
      logger.error(`[ReviewRequest] Error processing order ${order.orderId}:`, err.message);
      skipped++;
    }
  }

  logger.info(`[ReviewRequest] Done. Checked: ${orders.length}, Sent: ${sent}, Skipped: ${skipped}`);
  return { sent, skipped };
}

module.exports = sendReviewRequests;
