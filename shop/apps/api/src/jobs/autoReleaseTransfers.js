// FILE: apps/api/src/jobs/autoReleaseTransfers.js
// Auto-release held Razorpay Route transfers after 7-day return window
const logger = require('../config/logger');
const Order = require('../models/Order');
const Commission = require('../models/Commission');

async function autoReleaseTransfers() {
  const { releaseHeldTransfers } = require('../controllers/razorpayController');

  // Find commissions with held transfers that are approved (delivered)
  const heldCommissions = await Commission.find({
    'transfer.transferId': { $exists: true },
    'transfer.status': { $in: ['created', 'pending'] },
    status: 'approved',
  }).distinct('orderId');

  if (heldCommissions.length === 0) {
    return { processed: 0, released: 0, skipped: 0 };
  }

  let released = 0;
  let skipped = 0;

  for (const orderId of heldCommissions) {
    try {
      const order = await Order.findById(orderId);
      if (!order || order.status !== 'delivered') {
        skipped++;
        continue;
      }

      // Check if 7 days have passed since delivery
      const deliveredEvent = order.events?.find(e => e.status === 'delivered');
      if (!deliveredEvent) {
        skipped++;
        continue;
      }

      const daysSinceDelivery = Math.floor(
        (Date.now() - new Date(deliveredEvent.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceDelivery < 7) {
        skipped++;
        continue;
      }

      // 7 days passed — release transfers
      const result = await releaseHeldTransfers(orderId);
      if (result.success && result.released > 0) {
        released += result.released;
        logger.info(`[AutoRelease] Released ${result.released} transfer(s) for order ${orderId} (${daysSinceDelivery} days post-delivery)`);
      }
    } catch (err) {
      logger.error(`[AutoRelease] Error processing order ${orderId}:`, err.message);
    }
  }

  logger.info(`[AutoRelease] Done. Orders checked: ${heldCommissions.length}, Released: ${released}, Skipped: ${skipped}`);
  return { processed: heldCommissions.length, released, skipped };
}

module.exports = autoReleaseTransfers;
