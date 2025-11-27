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

(async () => {
  try {
    // Connect to MongoDB
    await connectDB(process.env.MONGO_URI);

    // Connect to Redis (optional - continues if fails in development)
    await connectRedis();

    const PORT = Number(process.env.PORT) || 3000;
    const server = app.listen(PORT, () => logger.info(`API listening on port ${PORT}`));

    // Graceful shutdown helper
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        try {
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
