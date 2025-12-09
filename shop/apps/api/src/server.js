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

(async () => {
  try {
    // Connect to MongoDB
    await connectDB(process.env.MONGO_URI);

    // Connect to Redis (optional - continues if fails in development)
    await connectRedis();

    // Start tracking sync background job
    trackingSyncJob.start();
    logger.info('✅ Tracking sync background job started');

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
