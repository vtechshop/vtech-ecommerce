// FILE: apps/api/src/services/analyticsService.js
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

class AnalyticsService {
  async getDashboardStats(startDate, endDate) {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const [totalRevenue, totalOrders, newUsers, topProducts] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: dateFilter, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totals.total' } } },
      ]),
      Order.countDocuments({ createdAt: dateFilter }),
      User.countDocuments({ createdAt: dateFilter }),
      this.getTopSellingProducts(5, startDate, endDate),
    ]);

    return {
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOrders,
      newUsers,
      topProducts,
    };
  }

  async getTopSellingProducts(limit = 10, startDate, endDate) {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const topProducts = await Order.aggregate([
      { $match: { createdAt: dateFilter, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.qty', '$items.priceSnapshot'] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
    ]);

    return topProducts;
  }

  async getRevenueByDate(startDate, endDate, groupBy = 'day') {
    const dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };

    const groupFormat = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $isoWeek: '$createdAt' },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
    };

    const revenue = await Order.aggregate([
      { $match: { createdAt: dateFilter, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: groupFormat[groupBy],
          revenue: { $sum: '$totals.total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return revenue;
  }

  async getVendorPerformance(vendorId, startDate, endDate) {
    const dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };

    const [orders, revenue, topProducts] = await Promise.all([
      Order.countDocuments({
        'items.vendorId': vendorId,
        createdAt: dateFilter,
      }),
      Order.aggregate([
        {
          $match: {
            'items.vendorId': vendorId,
            createdAt: dateFilter,
            status: { $ne: 'cancelled' },
          },
        },
        { $unwind: '$items' },
        { $match: { 'items.vendorId': vendorId } },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$items.qty', '$items.priceSnapshot'] } },
          },
        },
      ]),
      Product.countDocuments({ vendorId }),
    ]);

    return {
      totalOrders: orders,
      totalRevenue: revenue[0]?.total || 0,
      totalProducts: topProducts,
    };
  }
}

module.exports = new AnalyticsService();