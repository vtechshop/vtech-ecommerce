// FILE: apps/api/src/controllers/crmController.js
const User = require('../models/User');
const Order = require('../models/Order');

/**
 * Calculate customer segment based on behavior
 * @param {Object} customerData - { orderCount, totalSpent, lastOrderDate, createdAt }
 * @returns {String} - Segment: vip, loyal, new, at-risk, inactive, regular
 */
const calculateSegment = (customerData) => {
  const { orderCount, totalSpent, lastOrderDate, createdAt } = customerData;

  const now = new Date();
  const daysSinceLastOrder = lastOrderDate
    ? Math.floor((now - new Date(lastOrderDate)) / (1000 * 60 * 60 * 24))
    : null;
  const daysSinceJoined = Math.floor((now - new Date(createdAt)) / (1000 * 60 * 60 * 24));

  // VIP: High spending (>50,000) OR many orders (>20)
  if (totalSpent > 50000 || orderCount > 20) {
    return 'vip';
  }

  // Loyal: Regular repeat customer (>5 orders) with recent activity (<60 days)
  if (orderCount > 5 && daysSinceLastOrder !== null && daysSinceLastOrder < 60) {
    return 'loyal';
  }

  // New: Recently joined (<30 days)
  if (daysSinceJoined < 30) {
    return 'new';
  }

  // At-Risk: Haven't ordered in 60-120 days
  if (daysSinceLastOrder !== null && daysSinceLastOrder >= 60 && daysSinceLastOrder < 120) {
    return 'at-risk';
  }

  // Inactive: No orders in >120 days OR never ordered
  if (daysSinceLastOrder === null || daysSinceLastOrder >= 120) {
    return 'inactive';
  }

  // Default: Regular customer
  return 'regular';
};

/**
 * GET /admin/crm/stats
 * Get CRM dashboard statistics with segment counts
 */
exports.getCRMStats = async (req, res) => {
  try {
    // Get all customers (excluding admins, vendors, affiliates)
    const customers = await User.find({
      role: 'customer',
      isActive: true
    }).select('_id createdAt').lean();

    const totalCustomers = customers.length;

    // Get all paid orders for revenue calculation
    const paidOrders = await Order.find({
      'payment.status': 'paid',
      isGuest: false
    }).select('userId totals createdAt').lean();

    // Calculate total revenue
    const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);

    // Calculate average order value
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    // Get active customers this month (placed at least one order in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeCustomerIds = await Order.distinct('userId', {
      createdAt: { $gte: thirtyDaysAgo },
      isGuest: false,
      'payment.status': 'paid'
    });

    const activeThisMonth = activeCustomerIds.length;

    // Calculate new customers this month
    const newThisMonth = customers.filter(c => new Date(c.createdAt) >= thirtyDaysAgo).length;

    // Calculate segment counts
    const segmentCounts = { vip: 0, loyal: 0, new: 0, 'at-risk': 0, inactive: 0, regular: 0 };

    // Create a map of customer order stats
    const customerOrderMap = {};
    for (const order of paidOrders) {
      const uid = order.userId?.toString();
      if (!uid) continue;
      if (!customerOrderMap[uid]) {
        customerOrderMap[uid] = { count: 0, total: 0, lastOrder: null };
      }
      customerOrderMap[uid].count++;
      customerOrderMap[uid].total += order.totals?.total || 0;
      const orderDate = new Date(order.createdAt);
      if (!customerOrderMap[uid].lastOrder || orderDate > customerOrderMap[uid].lastOrder) {
        customerOrderMap[uid].lastOrder = orderDate;
      }
    }

    // Calculate segments for each customer
    for (const customer of customers) {
      const uid = customer._id.toString();
      const orderData = customerOrderMap[uid] || { count: 0, total: 0, lastOrder: null };

      const segment = calculateSegment({
        orderCount: orderData.count,
        totalSpent: orderData.total,
        lastOrderDate: orderData.lastOrder,
        createdAt: customer.createdAt
      });

      segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        totalCustomers,
        totalRevenue: Math.round(totalRevenue),
        avgOrderValue: Math.round(avgOrderValue),
        activeThisMonth,
        newThisMonth,
        vipCount: segmentCounts.vip,
        loyalCount: segmentCounts.loyal,
        newCount: segmentCounts.new,
        atRiskCount: segmentCounts['at-risk'],
        inactiveCount: segmentCounts.inactive
      }
    });
  } catch (error) {
    console.error('Get CRM stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CRM statistics',
      error: error.message
    });
  }
};

/**
 * GET /admin/crm/customers
 * Get paginated customer list with analytics and filtering
 */
exports.getCRMCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const segment = req.query.segment || '';

    // Build query for customers only
    let query = { role: 'customer', isActive: true };

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get all customers matching search (we'll filter by segment after aggregation)
    const customers = await User.find(query)
      .select('name email phone addresses createdAt lastLogin')
      .sort({ createdAt: -1 })
      .lean();

    // Get order analytics for each customer
    const customerAnalytics = await Promise.all(
      customers.map(async (customer) => {
        // Get all paid orders for this customer
        const orders = await Order.find({
          userId: customer._id,
          'payment.status': 'paid'
        }).select('totals createdAt').sort({ createdAt: -1 }).lean();

        const orderCount = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
        const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
        const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null;

        // Calculate segment
        const customerSegment = calculateSegment({
          orderCount,
          totalSpent,
          lastOrderDate,
          createdAt: customer.createdAt
        });

        // Get location from default address
        const defaultAddress = customer.addresses?.find(addr => addr.isDefault) || customer.addresses?.[0];
        const location = defaultAddress
          ? `${defaultAddress.city || ''}${defaultAddress.city && defaultAddress.state ? ', ' : ''}${defaultAddress.state || ''}`
          : null;

        return {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone || null,
          location,
          segment: customerSegment,
          orderCount,
          totalSpent: Math.round(totalSpent),
          avgOrderValue: Math.round(avgOrderValue),
          lastOrderDate,
          createdAt: customer.createdAt,
          lastLogin: customer.lastLogin
        };
      })
    );

    // Filter by segment if specified
    let filteredCustomers = customerAnalytics;
    if (segment) {
      filteredCustomers = customerAnalytics.filter(c => c.segment === segment);
    }

    // Paginate filtered results
    const total = filteredCustomers.length;
    const paginatedCustomers = filteredCustomers.slice(skip, skip + limit);

    res.json({
      success: true,
      data: paginatedCustomers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get CRM customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
};

/**
 * GET /admin/crm/customers/:id/orders
 * Get order history for a specific customer
 */
exports.getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify customer exists
    const customer = await User.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get all orders for this customer
    const orders = await Order.find({ userId: id })
      .select('orderId totals status payment createdAt items')
      .sort({ createdAt: -1 })
      .lean();

    // Format orders for frontend
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      orderNumber: order.orderId,
      total: order.totals?.total || 0,
      status: order.status,
      paymentStatus: order.payment?.status,
      createdAt: order.createdAt,
      itemCount: order.items?.length || 0
    }));

    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer orders',
      error: error.message
    });
  }
};

// ============ TICKET MANAGEMENT ============
const Ticket = require('../models/Ticket');

/**
 * GET /admin/crm/tickets/stats
 * Get ticket statistics
 */
exports.getTicketStats = async (req, res) => {
  try {
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'in_progress' }),
      Ticket.countDocuments({ status: 'resolved' }),
      Ticket.countDocuments({ status: 'closed' }),
    ]);

    // Calculate average response time (from creation to first admin reply)
    const ticketsWithReplies = await Ticket.find({
      'messages.0': { $exists: true }
    }).select('createdAt messages').lean();

    let totalResponseTime = 0;
    let ticketsWithAdminReply = 0;

    for (const ticket of ticketsWithReplies) {
      // Find first admin message (not the user who created the ticket)
      const firstAdminMessage = ticket.messages?.find(m => {
        return m.sender?.toString() !== ticket.userId?.toString();
      });
      if (firstAdminMessage) {
        const responseTime = new Date(firstAdminMessage.timestamp) - new Date(ticket.createdAt);
        totalResponseTime += responseTime;
        ticketsWithAdminReply++;
      }
    }

    const avgResponseTimeHours = ticketsWithAdminReply > 0
      ? Math.round(totalResponseTime / ticketsWithAdminReply / (1000 * 60 * 60))
      : 0;

    // Calculate SLA compliance (tickets resolved within SLA time)
    const SLA_HOURS = { urgent: 4, high: 24, medium: 48, low: 72 };
    const resolvedTickets = await Ticket.find({
      status: { $in: ['resolved', 'closed'] }
    }).select('priority createdAt updatedAt').lean();

    let withinSLA = 0;
    for (const ticket of resolvedTickets) {
      const resolutionTime = (new Date(ticket.updatedAt) - new Date(ticket.createdAt)) / (1000 * 60 * 60);
      const slaLimit = SLA_HOURS[ticket.priority] || 48;
      if (resolutionTime <= slaLimit) withinSLA++;
    }

    const slaCompliance = resolvedTickets.length > 0
      ? Math.round((withinSLA / resolvedTickets.length) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        total,
        open,
        inProgress,
        resolved,
        closed,
        avgResponseTime: `${avgResponseTimeHours}h`,
        avgResolutionTime: '24h', // Placeholder
        slaCompliance,
        csat: 85 // Placeholder - would need feedback data
      }
    });
  } catch (error) {
    console.error('Get ticket stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket statistics',
      error: error.message
    });
  }
};

/**
 * GET /admin/crm/tickets
 * Get paginated ticket list with filtering
 */
exports.getTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, priority, category, search } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status === 'in-progress' ? 'in_progress' : status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ticket.countDocuments(query)
    ]);

    // Format for frontend
    const formattedTickets = tickets.map(t => ({
      _id: t._id,
      ticketNumber: t.ticketId,
      subject: t.subject,
      message: t.description,
      priority: t.priority,
      status: t.status === 'in_progress' ? 'in-progress' : t.status,
      category: t.category,
      customerId: t.userId,
      replies: t.messages?.map(m => ({
        message: m.message,
        adminId: m.sender,
        createdAt: m.timestamp
      })) || [],
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    res.json({
      success: true,
      data: formattedTickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
};

/**
 * PUT /admin/crm/tickets/:id/status
 * Update ticket status
 */
exports.updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    // Convert frontend status to model status
    if (status === 'in-progress') status = 'in_progress';

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { status, lastResponseBy: 'admin', lastResponseAt: new Date() },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket status',
      error: error.message
    });
  }
};

/**
 * PUT /admin/crm/tickets/:id/priority
 * Update ticket priority
 */
exports.updateTicketPriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { priority },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Update ticket priority error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket priority',
      error: error.message
    });
  }
};

/**
 * POST /admin/crm/tickets/:id/reply
 * Add admin reply to ticket
 */
exports.replyToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Add reply
    ticket.messages.push({
      sender: req.user._id,
      message: message.trim(),
      timestamp: new Date()
    });

    // Update ticket metadata
    ticket.lastResponseBy = 'admin';
    ticket.lastResponseAt = new Date();
    ticket.userViewed = false;

    // Auto-change status to in_progress if it was open
    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Reply to ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message
    });
  }
};
