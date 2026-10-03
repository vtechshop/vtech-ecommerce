// FILE: apps/api/src/services/trackingSyncService.js
const shippingService = require('./shippingService');
const logger = require('../config/logger');

// Order statuses as defined in models/Order.js, in the order a shipment moves through them
const STATUS_ORDER = ['pending', 'pending_payment', 'placed', 'paid', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const FINAL_STATUSES = ['delivered', 'cancelled', 'returned'];

/**
 * Automatic Tracking Synchronization Service
 * Syncs order status from carrier APIs automatically
 */
class TrackingSyncService {
  /**
   * Map a carrier's tracking status to an Order status.
   * Returns one of the values in the Order schema ('shipped', 'out_for_delivery', 'delivered'),
   * or null when the carrier status should not change the order (created, pending, unknown,
   * and also RTO / cancelled / undelivered: those need a person, because cancelling an order
   * has stock and refund consequences).
   */
  mapCarrierStatusToOrderStatus(carrierStatus) {
    if (carrierStatus === null || carrierStatus === undefined) return null;
    const normalized = String(carrierStatus).toLowerCase().trim().replace(/[_-]+/g, ' ');

    // Never auto-advance on a return, a failed delivery or a cancellation
    if (/\b(rto|return|undelivered|not delivered|cancel|cancell?ed|lost|damaged)\b/.test(normalized)) return null;

    if (normalized === 'delivered') return 'delivered';
    if (normalized === 'out for delivery') return 'out_for_delivery';
    if (['in transit', 'intransit', 'shipped', 'dispatched'].includes(normalized)) return 'shipped';

    return null;
  }

  /**
   * Sync tracking data for a single order
   * Returns updated tracking data and new order status
   */
  async syncOrderTracking(order) {
    try {
      // Only sync if order has AWB and carrier assigned (stored under order.shipment)
      const awb = order.shipment?.awb;
      const carrier = order.shipment?.carrier;
      if (!awb || !carrier) {
        return {
          success: false,
          message: 'Order missing AWB or carrier information'
        };
      }

      // Don't sync already delivered or cancelled orders
      if (FINAL_STATUSES.includes(order.status)) {
        return {
          success: false,
          message: `Order already ${order.status}`
        };
      }

      logger.info(`🔄 Syncing tracking for order ${order.orderId} (AWB: ${awb})`);

      // Fetch tracking data from carrier
      const tracking = await shippingService.trackShipment(awb, carrier);

      if (!tracking || !tracking.status) {
        return {
          success: false,
          message: 'No tracking data available from carrier'
        };
      }

      // Map carrier status to order status. The order only ever moves forward:
      // a late "in transit" scan cannot pull a delivered order back.
      const mappedStatus = this.mapCarrierStatusToOrderStatus(tracking.status);
      const statusChanged = mappedStatus !== null
        && STATUS_ORDER.indexOf(mappedStatus) > STATUS_ORDER.indexOf(order.status);
      const newOrderStatus = statusChanged ? mappedStatus : order.status;

      // Log if status changed
      if (statusChanged) {
        logger.info(`📦 Order ${order.orderId} status changed: ${order.status} → ${newOrderStatus}`);
      }

      return {
        success: true,
        statusChanged,
        oldStatus: order.status,
        newStatus: newOrderStatus,
        tracking: {
          status: tracking.status,
          currentLocation: tracking.currentLocation || 'Unknown',
          estimatedDelivery: tracking.estimatedDelivery,
          lastUpdated: new Date(),
          events: tracking.events || []
        }
      };
    } catch (error) {
      logger.error(`❌ Failed to sync tracking for order ${order.orderId}:`, error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Sync multiple orders in batch
   */
  async syncMultipleOrders(orders) {
    const results = {
      total: orders.length,
      synced: 0,
      statusChanged: 0,
      failed: 0,
      details: []
    };

    for (const order of orders) {
      const result = await this.syncOrderTracking(order);

      if (result.success) {
        results.synced++;
        if (result.statusChanged) {
          results.statusChanged++;
        }
      } else {
        results.failed++;
      }

      results.details.push({
        orderId: order.orderId,
        ...result
      });
    }

    logger.info(`📊 Batch sync complete: ${results.synced}/${results.total} synced, ${results.statusChanged} status changes`);

    return results;
  }

  /**
   * Check if order needs tracking sync
   * Don't sync too frequently to avoid rate limits
   */
  shouldSyncOrder(order, minIntervalMinutes = 30) {
    // Don't sync delivered, cancelled or returned orders
    if (FINAL_STATUSES.includes(order.status)) {
      return false;
    }

    // Always sync if never synced before
    const lastSynced = order.shipment?.trackingLastSynced;
    if (!lastSynced) {
      return true;
    }

    // Check if enough time has passed since last sync
    const lastSyncTime = new Date(lastSynced);
    const minutesSinceSync = (Date.now() - lastSyncTime) / 1000 / 60;

    return minutesSinceSync >= minIntervalMinutes;
  }
}

// Export singleton instance
module.exports = new TrackingSyncService();
