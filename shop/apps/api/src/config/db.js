const mongoose = require('mongoose');
const logger = require('./logger');

// Configure mongoose settings for better stability
mongoose.set('strictQuery', false);

// Prevent multiple connection attempts
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY = 5000; // 5 seconds

const connectDB = async () => {
  // Prevent concurrent connection attempts
  if (isConnecting) {
    logger.warn('Connection attempt already in progress, skipping...');
    return;
  }

  // Log connection string format (hide password)
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';
  const maskedUri = mongoUri.replace(/:([^@]+)@/, ':****@');
  logger.info(`Attempting to connect to: ${maskedUri}`);

  // Check if already connected
  if (mongoose.connection.readyState === 1) {
    logger.info('MongoDB already connected');
    return;
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shop', {
      // Connection pool settings - optimized for performance
      maxPoolSize: 50, // Handle more concurrent requests
      minPoolSize: 5,  // Keep connections ready

      // Timeout settings - faster failure detection
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 5000,

      // Automatic reconnection
      retryWrites: true,
      retryReads: true,

      // Heartbeat settings
      heartbeatFrequencyMS: 10000,

      // Performance optimizations
      maxIdleTimeMS: 30000, // Close idle connections after 30s
      compressors: ['zlib'], // Enable wire compression for faster data transfer
    });

    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
    connectionAttempts = 0; // Reset counter on successful connection
    isConnecting = false;

  } catch (error) {
    isConnecting = false;
    connectionAttempts++;

    // Extract the most useful error information
    const errorInfo = {
      name: error.name,
      message: error.message,
      code: error.code,
      codeName: error.codeName,
    };

    // MongoDB driver errors often have nested reason
    if (error.reason) {
      errorInfo.reason = error.reason.message || String(error.reason);
      if (error.reason.servers) {
        // Topology errors - show server connection failures
        const serverErrors = [];
        error.reason.servers.forEach((desc, address) => {
          if (desc.error) {
            serverErrors.push(`${address}: ${desc.error.message || desc.error}`);
          }
        });
        if (serverErrors.length > 0) {
          errorInfo.serverErrors = serverErrors;
        }
      }
    }

    // Check for authentication errors specifically
    if (error.message?.includes('authentication') || error.code === 18 || error.codeName === 'AuthenticationFailed') {
      errorInfo.hint = 'Authentication failed - check username/password in MONGO_URI';
    }

    logger.error(`❌ MongoDB connection error (attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS}): ${error.message || 'Unknown error'}`);
    logger.error('Full error details: ' + JSON.stringify(errorInfo, null, 2));

    // Retry logic
    if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
      logger.info(`🔄 Retrying connection in ${RETRY_DELAY / 1000} seconds...`);
      setTimeout(() => connectDB(), RETRY_DELAY);
    } else {
      logger.error('💀 Max connection attempts reached. Exiting...');
      process.exit(1);
    }
  }
};

// Handle connection events - never crash on connection errors
mongoose.connection.on('error', (err) => {
  logger.error('❌ MongoDB connection error:', err.message);
  // Reset connection flag to allow reconnection attempts
  isConnecting = false;
  // Don't crash - mongoose will auto-reconnect
});

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected. Auto-reconnect will attempt...');
  // Reset connection flag to allow reconnection
  isConnecting = false;
});

// Handle connection timeout
mongoose.connection.on('timeout', () => {
  logger.warn('⚠️ MongoDB connection timeout');
  isConnecting = false;
});

mongoose.connection.on('reconnected', () => {
  logger.info('✅ MongoDB reconnected successfully');
  connectionAttempts = 0; // Reset counter on reconnection
});

mongoose.connection.on('connecting', () => {
  logger.info('🔄 MongoDB connecting...');
});

mongoose.connection.on('connected', () => {
  logger.info('✅ MongoDB connected event triggered');
});

// Note: SIGINT handling is done in server.js to coordinate all shutdowns

module.exports = { connectDB };
