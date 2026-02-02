const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();

const { connectDB } = require('./config/db');
const { connectRedis, disconnectRedis } = require('./config/redis');
const logger = require('./config/logger');
const app = require('./app');

// Handle uncaught exceptions - log but don't crash in development
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION DETAILS:', err);
  logger.error('UNCAUGHT EXCEPTION!', { name: err.name, message: err.message, stack: err.stack });
  // Only exit in production for critical errors
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  // In development, log and continue
  logger.warn('Server continuing after uncaught exception (development mode)');
});

// Handle unhandled promise rejections - log but don't crash
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION!', { name: err?.name, message: err?.message, stack: err?.stack });
  // Don't exit - just log the error and continue
  // This prevents the server from crashing on minor async errors
});

// Load tracking sync job at module level
const trackingSyncJob = require('./jobs/trackingSyncJob');

// Load cron for automated tasks
const cron = require('node-cron');

// Cron job setup function
function setupCronJobs() {
  try {
    const { AbandonedCartService } = require('./services/abandonedCartService');
    const inventoryAlertService = require('./services/inventoryAlertService');
    const loyaltyService = require('./services/loyaltyService');
    const gdprService = require('./services/gdprService');
    const reconcilePayments = require('./jobs/reconcilePayments');

    // Every 14 minutes - Self-ping to keep server awake (prevents Render sleep)
    // Also pings MongoDB to keep database connection alive
    cron.schedule('*/14 * * * *', async () => {
      try {
        // 1. Ping the API server
        const https = require('https');
        const apiUrl = process.env.APP_URL || 'https://api.vtechkitchen.com';
        https.get(`${apiUrl}/api/health`, (res) => {
          logger.info(`[Keep-Alive] Server ping successful: ${res.statusCode}`);
        }).on('error', (err) => {
          logger.warn(`[Keep-Alive] Server ping failed: ${err.message}`);
        });

        // 2. Ping MongoDB to keep connection alive
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
          const adminDb = mongoose.connection.db.admin();
          const result = await adminDb.ping();
          logger.info(`[Keep-Alive] MongoDB ping successful: ${JSON.stringify(result)}`);
        } else {
          logger.warn(`[Keep-Alive] MongoDB not connected (state: ${mongoose.connection.readyState})`);
        }
      } catch (error) {
        logger.warn('[Keep-Alive] Ping error:', error.message);
      }
    });

    // Every hour - Send abandoned cart recovery emails
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('[Cron] Running abandoned cart recovery emails...');
        await AbandonedCartService.sendRecoveryEmails();
      } catch (error) {
        logger.error('[Cron] Abandoned cart recovery failed:', error);
      }
    });

    // Daily at 9 AM - Check low stock inventory and send alerts
    cron.schedule('0 9 * * *', async () => {
      try {
        logger.info('[Cron] Running inventory low stock check...');
        await inventoryAlertService.checkLowStockProducts();
      } catch (error) {
        logger.error('[Cron] Inventory alert check failed:', error);
      }
    });

    // Daily at 2 AM - Expire old loyalty points
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('[Cron] Running loyalty points expiration...');
        await loyaltyService.expireOldPoints();
      } catch (error) {
        logger.error('[Cron] Loyalty points expiration failed:', error);
      }
    });

    // Daily at 3 AM - Process GDPR scheduled deletions
    cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('[Cron] Running GDPR scheduled deletions...');
        await gdprService.processScheduledDeletions();
      } catch (error) {
        logger.error('[Cron] GDPR deletion process failed:', error);
      }
    });

    // Every 5 minutes - Reconcile stuck payments (payments that succeeded on Razorpay but failed to update in DB)
    cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('[Cron] Running payment reconciliation...');
        await reconcilePayments();
      } catch (error) {
        logger.error('[Cron] Payment reconciliation failed:', error);
      }
    });

    // Daily at 10 AM - Auto-release held Razorpay Route transfers after 7-day return window
    cron.schedule('0 10 * * *', async () => {
      try {
        logger.info('[Cron] Running auto-release of held transfers...');
        const autoReleaseTransfers = require('./jobs/autoReleaseTransfers');
        await autoReleaseTransfers();
      } catch (error) {
        logger.error('[Cron] Auto-release transfers failed:', error);
      }
    });

    logger.info('✅ Cron jobs scheduled: Abandoned carts (hourly), Inventory alerts (9 AM), Loyalty expiration (2 AM), GDPR deletions (3 AM), Payment reconciliation (every 5 min), Auto-release transfers (10 AM)');
  } catch (error) {
    logger.error('Failed to set up cron jobs:', error);
  }
}

(async () => {
  try {
    // Connect to MongoDB
    await connectDB(process.env.MONGO_URI);

    // Connect to Redis (optional - continues if fails in development)
    await connectRedis();

    // Start tracking sync background job
    trackingSyncJob.start();
    logger.info('✅ Tracking sync background job started');

    // Set up automated cron jobs for platform features
    setupCronJobs();

    // One-time admin password reset/create if ADMIN_EMAIL and ADMIN_PASSWORD are set
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      try {
        const User = require('./models/User');
        const { hashPassword } = require('./utils/hash');

        let admin = await User.findOne({ email: process.env.ADMIN_EMAIL });
        if (admin) {
          admin.password = await hashPassword(process.env.ADMIN_PASSWORD);
          admin.failedLoginAttempts = 0;
          admin.lockUntil = null;
          admin.role = 'admin';
          await admin.save();
          logger.info(`✅ Admin password updated for: ${process.env.ADMIN_EMAIL}`);
        } else {
          // Create new admin if not exists
          admin = await User.create({
            name: 'Admin',
            email: process.env.ADMIN_EMAIL,
            password: await hashPassword(process.env.ADMIN_PASSWORD),
            role: 'admin',
            emailVerified: true,
          });
          logger.info(`✅ New admin created: ${process.env.ADMIN_EMAIL}`);
        }
      } catch (err) {
        logger.error('Admin password reset failed:', err.message);
      }
    }

    const PORT = Number(process.env.PORT) || 3000;
    const server = app.listen(PORT, () => logger.info(`API listening on port ${PORT}`));

    // Graceful shutdown helper
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        try {
          // Stop tracking sync job
          trackingSyncJob.stop();
          logger.info('Tracking sync job stopped');

          // Close MongoDB connection
          const mongoose = require('mongoose');
          await mongoose.connection.close();
          logger.info('MongoDB connection closed');

          // Close Redis connection
          await disconnectRedis();
          logger.info('Redis connection closed');

          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force exit after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    logger.error('Startup error', { message: err.message, stack: err.stack });
    process.exit(1);
  }
})();
