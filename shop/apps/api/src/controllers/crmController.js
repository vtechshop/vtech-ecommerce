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
 * Get CRM dashboard statistics
 */
exports.getCRMStats = async (req, res) => {
  try {
    // Get total customers (excluding admins, vendors, affiliates)
    const totalCustomers = await User.countDocuments({
      role: 'customer',
      isActive: true
    });

    // Get all paid orders for revenue calculation
    const paidOrders = await Order.find({
      'payment.status': 'paid',
      isGuest: false
    });

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

    res.json({
      success: true,
      data: {
        totalCustomers,
        totalRevenue: Math.round(totalRevenue), // Convert to paise/whole number
        avgOrderValue: Math.round(avgOrderValue),
        activeThisMonth
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
