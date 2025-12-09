// FILE: apps/api/src/services/trackingSyncService.js
const shippingService = require('./shippingService');
const logger = require('../config/logger');

/**
 * Automatic Tracking Synchronization Service
 * Syncs order status from carrier APIs automatically
 */
class TrackingSyncService {
  /**
   * Map carrier tracking status to order status
   */
  mapCarrierStatusToOrderStatus(carrierStatus) {
    const statusMap = {
      // Delhivery statuses
      'Shipment Created': 'Processing',
      'In Transit': 'Shipped',
      'Out For Delivery': 'Shipped',
      'Delivered': 'Delivered',
      'RTO': 'Cancelled',
      'RTO-Delivered': 'Cancelled',
      'Cancelled': 'Cancelled',

      // Shiprocket statuses
      'NEW': 'Processing',
      'SHIPPED': 'Shipped',
      'DELIVERED': 'Delivered',
      'CANCELED': 'Cancelled',
      'RTO_DELIVERED': 'Cancelled',

      // BlueDart statuses
      'BOOKED': 'Processing',
      'INTRANSIT': 'Shipped',
      'DELIVERED': 'Delivered',
      'UNDELIVERED': 'Processing',

      // Generic statuses
      'created': 'Processing',
      'in_transit': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'pending': 'Pending'
    };

    // Normalize status string
    const normalized = carrierStatus.toLowerCase().trim();

    // Check exact matches first
    for (const [carrierStat, orderStat] of Object.entries(statusMap)) {
      if (carrierStat.toLowerCase() === normalized) {
        return orderStat;
      }
    }

    // Check partial matches for flexibility
    if (normalized.includes('deliver')) return 'Delivered';
    if (normalized.includes('transit') || normalized.includes('ship')) return 'Shipped';
    if (normalized.includes('cancel') || normalized.includes('rto')) return 'Cancelled';
    if (normalized.includes('pending') || normalized.includes('await')) return 'Pending';

    // Default to Processing if unknown
    return 'Processing';
  }

  /**
   * Sync tracking data for a single order
   * Returns updated tracking data and new order status
   */
  async syncOrderTracking(order) {
    try {
      // Only sync if order has AWB and carrier assigned
      if (!order.awb || !order.carrier) {
        return {
          success: false,
          message: 'Order missing AWB or carrier information'
        };
      }

      // Don't sync already delivered or cancelled orders
      if (['Delivered', 'Cancelled'].includes(order.status)) {
        return {
          success: false,
          message: `Order already ${order.status.toLowerCase()}`
        };
      }

      logger.info(`🔄 Syncing tracking for order ${order.orderId} (AWB: ${order.awb})`);

      // Fetch tracking data from carrier
      const tracking = await shippingService.trackShipment(order.awb, order.carrier);

      if (!tracking || !tracking.status) {
        return {
          success: false,
          message: 'No tracking data available from carrier'
        };
      }

      // Map carrier status to order status
      const newOrderStatus = this.mapCarrierStatusToOrderStatus(tracking.status);

      // Log if status changed
      const statusChanged = order.status !== newOrderStatus;
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
    // Always sync if never synced before
    if (!order.trackingLastSynced) {
      return true;
    }

    // Don't sync delivered or cancelled orders
    if (['Delivered', 'Cancelled'].includes(order.status)) {
      return false;
    }

    // Check if enough time has passed since last sync
    const lastSyncTime = new Date(order.trackingLastSynced);
    const minutesSinceSync = (Date.now() - lastSyncTime) / 1000 / 60;

    return minutesSinceSync >= minIntervalMinutes;
  }
}

// Export singleton instance
module.exports = new TrackingSyncService();
