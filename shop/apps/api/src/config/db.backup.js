const mongoose = require('mongoose');
const logger = require('./logger');

// Configure mongoose settings for better stability
mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shop', {
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,

      // Timeout settings
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,

      // Automatic reconnection
      retryWrites: true,
      retryReads: true,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };