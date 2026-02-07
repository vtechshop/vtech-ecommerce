// FILE: apps/api/src/controllers/ticketController.js
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { getPaginationMeta } = require('../utils/helpers');
const logger = require('../config/logger');
const notificationHelper = require('../services/notificationHelper');

// Generate unique ticket ID
const generateTicketId = async () => {
  const count = await Ticket.countDocuments();
  const id = `TICK-${String(count + 1).padStart(5, '0')}`;
  return id;
};

// Create a new ticket (Customer, Vendor, Affiliate)
exports.createTicket = async (req, res, next) => {
  try {
    const { subject, description, category, priority, relatedOrder, attachments } = req.body;

    // Validation
    if (!subject || !description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Subject and description are required',
        },
      });
    }

    // Generate ticket ID
    const ticketId = await generateTicketId();

    // Create ticket
    const ticket = await Ticket.create({
      ticketId,
      userId: req.user._id,
      subject: subject.trim(),
      description: description.trim(),
      category: category || 'other',
      priority: priority || 'medium',
      relatedOrder,
      attachments: attachments || [], // Support initial attachments
      status: 'open',
    });

    // Populate user info
    await ticket.populate('userId', 'name email');

    logger.info(`Ticket created: ${ticketId} by user ${req.user._id}`);

    // Notify admin of new ticket
    try {
      await notificationHelper.notifyAdminNewTicket({
        ticket: {
          _id: ticket._id,
          ticketNumber: ticketId,
          subject: ticket.subject,
          priority: ticket.priority,
        },
        userEmail: ticket.userId.email || req.user.email || 'Unknown',
      });
      logger.info(`Admin notified of new ticket: ${ticketId}`);
    } catch (notifError) {
      logger.error('Failed to notify admin of new ticket:', notifError);
    }

    res.status(201).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// Get all tickets (with filters)
exports.getTickets = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      search,
    } = req.query;

    // Build query based on user role
    let query = {};

    if (req.user.role === 'customer') {
      // Customers can only see their own tickets
      query.userId = req.user._id;
    } else if (req.user.role === 'vendor') {
      // Vendors can only see their own tickets
      query.userId = req.user._id;
    } else if (req.user.role === 'affiliate') {
      // Affiliates can only see their own tickets
      query.userId = req.user._id;
    }
    // Admin can see all tickets (no filter)

    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    // Search in subject and description
    // SECURITY: Escape special regex characters to prevent RegExp injection
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { subject: new RegExp(escapedSearch, 'i') },
        { description: new RegExp(escapedSearch, 'i') },
        { ticketId: new RegExp(escapedSearch, 'i') },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('userId', 'name email role')
        .populate('assignedTo', 'name email')
        .populate('relatedOrder', 'orderId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Ticket.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: tickets,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get single ticket by ID
exports.getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id)
      .populate('userId', 'name email role phone')
      .populate('assignedTo', 'name email')
      .populate('relatedOrder', 'orderId total status')
      .populate('messages.sender', 'name email role')
      .lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        },
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && ticket.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this ticket',
        },
      });
    }

    // Mark as viewed
    if (req.user.role === 'admin') {
      await Ticket.findByIdAndUpdate(id, { adminViewed: true });
      ticket.adminViewed = true;
    } else {
      await Ticket.findByIdAndUpdate(id, { userViewed: true });
      ticket.userViewed = true;
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// Add message to ticket
exports.addMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, attachments } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message is required',
        },
      });
    }

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        },
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && ticket.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to add messages to this ticket',
        },
      });
    }

    // Add message
    ticket.messages.push({
      sender: req.user._id,
      message: message.trim(),
      attachments: attachments || [],
      timestamp: new Date(),
    });

    // Update last response tracking
    if (req.user.role === 'admin') {
      ticket.lastResponseBy = 'admin';
      ticket.userViewed = false; // Admin replied, user hasn't seen it yet
      ticket.adminViewed = true;
    } else {
      ticket.lastResponseBy = 'user';
      ticket.adminViewed = false; // User replied, admin hasn't seen it yet
      ticket.userViewed = true;
    }
    ticket.lastResponseAt = new Date();

    // Update ticket status if it was closed
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    // Populate the new message
    await ticket.populate('messages.sender', 'name email role');

    logger.info(`Message added to ticket ${ticket.ticketId} by user ${req.user._id}`);

    // Notify user if admin replied
    if (req.user.role === 'admin') {
      try {
        await notificationHelper.notifyUserTicketReply({
          userId: ticket.userId,
          ticket: {
            _id: ticket._id,
            ticketNumber: ticket.ticketId,
          },
          repliedBy: req.user.name || 'Support Team',
        });
        logger.info(`User notified of ticket reply: ${ticket.ticketId}`);
      } catch (notifError) {
        logger.error('Failed to notify user of ticket reply:', notifError);
      }
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// Update ticket status (Admin only)
exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid status',
        },
      });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('userId', 'name email role');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        },
      });
    }

    logger.info(`Ticket ${ticket.ticketId} status updated to ${status} by admin ${req.user._id}`);

    // Notify user of status change
    try {
      if (status !== 'open') {
        await notificationHelper.notifyUserTicketStatusChange({
          userId: ticket.userId._id || ticket.userId,
          ticket: {
            _id: ticket._id,
            ticketNumber: ticket.ticketId,
          },
          status,
        });
        logger.info(`User notified of ticket status change: ${ticket.ticketId} -> ${status}`);
      }
    } catch (notifError) {
      logger.error('Failed to notify user of ticket status change:', notifError);
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// Assign ticket to admin (Admin only)
exports.assignTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    // Verify assignedTo is an admin
    if (assignedTo) {
      const admin = await User.findById(assignedTo);
      if (!admin || admin.role !== 'admin') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Can only assign tickets to admin users',
          },
        });
      }
    }

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { assignedTo: assignedTo || null },
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email role')
      .populate('assignedTo', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        },
      });
    }

    logger.info(`Ticket ${ticket.ticketId} assigned to ${assignedTo || 'unassigned'}`);

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// Update ticket priority (Admin only)
exports.updatePriority = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid priority',
        },
      });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { priority },
      { new: true, runValidators: true }
    ).populate('userId', 'name email role');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        },
      });
    }

    logger.info(`Ticket ${ticket.ticketId} priority updated to ${priority}`);

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// Get user-specific ticket statistics
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [
      totalCount,
      openCount,
      inProgressCount,
      resolvedCount,
      closedCount,
      unreadCount,
      byCategory,
      avgResponseTime,
    ] = await Promise.all([
      Ticket.countDocuments({ userId }),
      Ticket.countDocuments({ userId, status: 'open' }),
      Ticket.countDocuments({ userId, status: 'in_progress' }),
      Ticket.countDocuments({ userId, status: 'resolved' }),
      Ticket.countDocuments({ userId, status: 'closed' }),
      Ticket.countDocuments({ userId, lastResponseBy: 'admin', userViewed: false }),
      Ticket.aggregate([
        { $match: { userId: req.user._id } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $match: { userId: req.user._id, 'messages.1': { $exists: true } } },
        {
          $project: {
            firstAdminResponse: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$messages',
                    cond: { $ne: ['$$this.sender', req.user._id] }
                  }
                },
                0
              ]
            },
            createdAt: 1
          }
        },
        {
          $project: {
            responseTime: {
              $subtract: ['$firstAdminResponse.timestamp', '$createdAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' }
          }
        }
      ]),
    ]);

    const avgResponseHours = avgResponseTime[0]?.avgResponseTime
      ? Math.round(avgResponseTime[0].avgResponseTime / (1000 * 60 * 60))
      : null;

    res.json({
      success: true,
      data: {
        total: totalCount,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        closed: closedCount,
        unread: unreadCount,
        active: openCount + inProgressCount,
        avgResponseTime: avgResponseHours ? `${avgResponseHours}h` : 'N/A',
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get ticket statistics (Admin only)
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalCount,
      openCount,
      inProgressCount,
      resolvedCount,
      closedCount,
      byCategory,
      byPriority,
      recentTickets,
    ] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'in_progress' }),
      Ticket.countDocuments({ status: 'resolved' }),
      Ticket.countDocuments({ status: 'closed' }),
      Ticket.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Ticket.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Ticket.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total: totalCount,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        closed: closedCount,
        recent24h: recentTickets,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete ticket (Admin only)
exports.deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findByIdAndDelete(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Ticket not found',
        },
      });
    }

    logger.info(`Ticket ${ticket.ticketId} deleted by admin ${req.user._id}`);

    res.json({
      success: true,
      data: { message: 'Ticket deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
