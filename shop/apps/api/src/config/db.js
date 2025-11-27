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

  // Check if already connected
  if (mongoose.connection.readyState === 1) {
    logger.info('MongoDB already connected');
    return;
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shop', {
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,

      // Timeout settings
      serverSelectionTimeoutMS: 10000, // Increased from 5s to 10s
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000, // Added explicit connect timeout

      // Automatic reconnection
      retryWrites: true,
      retryReads: true,

      // Heartbeat settings for better connection monitoring
      heartbeatFrequencyMS: 10000, // Check connection every 10s
    });

    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
    connectionAttempts = 0; // Reset counter on successful connection
    isConnecting = false;

  } catch (error) {
    isConnecting = false;
    connectionAttempts++;

    logger.error(`❌ MongoDB connection error (attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS}):`, error.message);

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
