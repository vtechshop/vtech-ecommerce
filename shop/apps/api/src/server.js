const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();

const { connectDB } = require('./config/db');
const { connectRedis, disconnectRedis } = require('./config/redis');
const app = require('./app');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

(async () => {
  try {
    // Connect to MongoDB
    await connectDB(process.env.MONGO_URI);

    // Connect to Redis (optional - continues if fails in development)
    await connectRedis();

    const PORT = Number(process.env.PORT) || 3000;
    const server = app.listen(PORT, () => console.log(`🚀 API listening on http://localhost:${PORT}`));

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await disconnectRedis();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await disconnectRedis();
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('❌ Startup error:', err.message);
    process.exit(1);
  }
})();
// Restart trigger


// restart
