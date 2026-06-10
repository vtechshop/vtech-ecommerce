// FILE: apps/api/src/services/socketService.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

let io = null;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'https://www.vtechkitchen.com',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow unauthenticated connections (guest users won't get notifications)
      socket.userId = null;
      return next();
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id || payload._id || payload.userId;
      socket.userRole = payload.role;
      socket.vendorId = payload.vendorId || null;
      next();
    } catch {
      // Invalid token — allow connection but no userId
      socket.userId = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    if (socket.userId) {
      socket.join(`user_${socket.userId}`);
      if (socket.vendorId) {
        socket.join(`vendor_${socket.vendorId}`);
      }
      if (socket.userRole === 'admin') {
        socket.join('admin');
      }
      logger.info(`[Socket] Connected: user_${socket.userId} (role: ${socket.userRole})`);
    }

    socket.on('disconnect', () => {
      if (socket.userId) {
        logger.info(`[Socket] Disconnected: user_${socket.userId}`);
      }
    });
  });

  logger.info('✅ Socket.io initialized');
  return io;
}

function getIO() {
  return io;
}

function emitToUser(userId, event, data) {
  if (!io || !userId) return;
  io.to(`user_${userId}`).emit(event, data);
}

function emitToVendor(vendorId, event, data) {
  if (!io || !vendorId) return;
  io.to(`vendor_${vendorId}`).emit(event, data);
}

function emitToAdmin(event, data) {
  if (!io) return;
  io.to('admin').emit(event, data);
}

module.exports = { init, getIO, emitToUser, emitToVendor, emitToAdmin };
