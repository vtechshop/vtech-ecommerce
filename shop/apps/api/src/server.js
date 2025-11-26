const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();

const { connectDB } = require('./config/db');
const { connectRedis, disconnectRedis } = require('./config/redis');
const logger = require('./config/logger');
const app = require('./app');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', { name: err.name, message: err.message, stack: err.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', { name: err.name, message: err.message, stack: err.stack });
  process.exit(1);
});

(async () => {
  try {
    // Connect to MongoDB
    await connectDB(process.env.MONGO_URI);

    // Connect to Redis (optional - continues if fails in development)
    await connectRedis();

    const PORT = Number(process.env.PORT) || 3000;
    const server = app.listen(PORT, () => logger.info(`API listening on port ${PORT}`));

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await disconnectRedis();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await disconnectRedis();
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error('Startup error', { message: err.message, stack: err.stack });
    process.exit(1);
  }
})();
