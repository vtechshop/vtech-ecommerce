// FILE: apps/api/src/jobs/trackingSyncJob.js
const cron = require('node-cron');
const Order = require('../models/Order');
const trackingSyncService = require('../services/trackingSyncService');
const logger = require('../config/logger');

/**
 * Background Job: Automatic Tracking Synchronization
 * Runs every 30 minutes to sync tracking data from carriers
 */
class TrackingSyncJob {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.stats = {
      totalRuns: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      statusChanges: 0
    };
  }

  /**
   * Start the cron job
   * Runs every 30 minutes (default schedule)
   * For testing, set TRACKING_SYNC_CRON env variable
   */
  start() {
    const cronSchedule = process.env.TRACKING_SYNC_CRON || '*/30 * * * *';

    logger.info(`🚀 Starting tracking sync job with schedule: ${cronSchedule}`);

    this.job = cron.schedule(cronSchedule, async () => {
      await this.run();
    });

    logger.info('✅ Tracking sync job started successfully');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      logger.info('⏹️  Tracking sync job stopped');
    }
  }

  /**
   * Run the sync job manually
   */
  async run() {
    if (this.isRunning) {
      logger.warn('⚠️  Tracking sync already running, skipping this run');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();
    this.stats.totalRuns++;

    try {
      logger.info('🔄 Starting automatic tracking sync...');

      // Find all orders that need tracking sync
      const orders = await this.getOrdersToSync();

      if (orders.length === 0) {
        logger.info('✅ No orders need tracking sync at this time');
        return;
      }

      logger.info(`📦 Found ${orders.length} orders to sync`);

      // Sync each order
      for (const order of orders) {
        try {
          const syncResult = await trackingSyncService.syncOrderTracking(order);

          if (syncResult.success) {
            this.stats.successfulSyncs++;

            // Update order with tracking data
            if (syncResult.tracking) {
              order.shipment.carrierStatus = syncResult.tracking.status;
              order.shipment.currentLocation = syncResult.tracking.currentLocation;
              order.shipment.estimatedDelivery = syncResult.tracking.estimatedDelivery;
              order.shipment.trackingLastSynced = syncResult.tracking.lastUpdated;
              order.shipment.events = syncResult.tracking.events;
            }

            // Update order status if changed
            if (syncResult.statusChanged) {
              this.stats.statusChanges++;

              const oldStatus = order.status;
              order.status = syncResult.newStatus;

              // Add status change event
              order.events.push({
                status: syncResult.newStatus,
                description: `Status automatically updated from carrier: ${syncResult.tracking.status}`,
                timestamp: new Date()
              });

              // Set deliveredAt timestamp if delivered
              if (syncResult.newStatus === 'delivered' && !order.shipment.deliveredAt) {
                order.shipment.deliveredAt = new Date();
              }

              logger.info(`✅ Order ${order.orderId}: ${oldStatus} → ${syncResult.newStatus}`);
            }

            await order.save();
          } else {
            this.stats.failedSyncs++;
            logger.warn(`⚠️  Failed to sync order ${order.orderId}: ${syncResult.message}`);
          }
        } catch (error) {
          this.stats.failedSyncs++;
          logger.error(`❌ Error syncing order ${order.orderId}:`, error.message);
        }

        // Small delay to avoid rate limiting (100ms between requests)
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(`✅ Tracking sync complete: ${this.stats.successfulSyncs} synced, ${this.stats.statusChanges} status changes, ${this.stats.failedSyncs} failed`);
    } catch (error) {
      logger.error('❌ Tracking sync job error:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get orders that need tracking sync
   * - Orders that are shipped but not delivered/cancelled
   * - Orders that haven't been synced in the last 30 minutes
   */
  async getOrdersToSync() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const orders = await Order.find({
      // Order must have shipment details
      'shipment.awb': { $exists: true, $ne: null },
      'shipment.carrier': { $exists: true, $ne: null },

      // Order must be in active shipping state
      status: { $in: ['shipped', 'packed', 'out_for_delivery'] },

      // Either never synced OR last sync was over 30 minutes ago
      $or: [
        { 'shipment.trackingLastSynced': { $exists: false } },
        { 'shipment.trackingLastSynced': null },
        { 'shipment.trackingLastSynced': { $lt: thirtyMinutesAgo } }
      ]
    })
    .limit(100) // Process max 100 orders per run to avoid overload
    .sort({ 'shipment.shippedAt': -1 }); // Newest shipments first

    return orders;
  }

  /**
   * Get job statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastRun: this.lastRun
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRuns: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      statusChanges: 0
    };
    logger.info('📊 Tracking sync statistics reset');
  }
}

// Export singleton instance
module.exports = new TrackingSyncJob();
