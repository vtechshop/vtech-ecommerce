// FILE: apps/api/src/models/Ticket.js
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  description: String,
  attachments: [String], // Initial attachments when creating ticket
  category: {
    type: String,
    enum: ['order', 'payment', 'product', 'shipping', 'return', 'other'],
    default: 'other',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    message: String,
    attachments: [String],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  lastResponseBy: {
    type: String,
    enum: ['user', 'admin', null],
    default: 'user', // User created the ticket
  },
  lastResponseAt: {
    type: Date,
    default: Date.now,
  },
  adminViewed: {
    type: Boolean,
    default: false,
  },
  userViewed: {
    type: Boolean,
    default: true, // User created it, so they've seen it
  },
}, {
  timestamps: true,
});

// Indexes (ticketId already has unique: true, no need to add separate index)
ticketSchema.index({ userId: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);