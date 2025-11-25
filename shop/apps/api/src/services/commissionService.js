// FILE: apps/api/src/services/commissionService.js
const Commission = require('../models/Commission');
const Affiliate = require('../models/Affiliate');
const Vendor = require('../models/Vendor');
const env = require('../config/env');
const logger = require('../config/logger');

class CommissionService {
  async createCommission(orderId, subjectId, type, amount, percentage) {
    const commission = await Commission.create({
      orderId,
      subjectId,
      type,
      amount,
      percentage,
      status: 'pending',
    });

    logger.info(`Commission created: ${type} - ${amount}`);

    return commission;
  }

  async approveCommission(commissionId) {
    const commission = await Commission.findById(commissionId);

    if (!commission) {
      throw new Error('Commission not found');
    }

    if (commission.status !== 'pending') {
      throw new Error('Commission already processed');
    }

    commission.status = 'approved';
    commission.approvedAt = new Date();

    await commission.save();

    logger.info(`Commission approved: ${commissionId}`);

    return commission;
  }

  async payCommission(commissionId, paymentRef) {
    const commission = await Commission.findById(commissionId);

    if (!commission) {
      throw new Error('Commission not found');
    }

    if (commission.status !== 'approved') {
      throw new Error('Commission must be approved first');
    }

    commission.status = 'paid';
    commission.paidAt = new Date();
    commission.paymentRef = paymentRef;

    await commission.save();

    // Update affiliate/vendor stats
    if (commission.type === 'affiliate') {
      await Affiliate.findByIdAndUpdate(commission.subjectId, {
        $inc: {
          paidEarnings: commission.amount,
          pendingEarnings: -commission.amount,
        },
      });
    } else if (commission.type === 'vendor') {
      await Vendor.findByIdAndUpdate(commission.subjectId, {
        $inc: {
          totalEarnings: commission.amount,
        },
      });
    }

    logger.info(`Commission paid: ${commissionId} - ${paymentRef}`);

    return commission;
  }

  async calculateVendorCommission(orderId, vendorId) {
    const Order = require('../models/Order');
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // Calculate vendor's portion from the order
    const vendorItems = order.items.filter(
      (item) => item.vendorId.toString() === vendorId.toString()
    );

    const vendorSubtotal = vendorItems.reduce(
      (sum, item) => sum + item.priceSnapshot * item.qty,
      0
    );

    // Platform takes 15% commission
    const commissionPercentage = env.VENDOR_COMMISSION_PERCENTAGE || 15;
    const platformCommission = (vendorSubtotal * commissionPercentage) / 100;
    const vendorEarnings = vendorSubtotal - platformCommission;

    return {
      vendorSubtotal,
      platformCommission,
      vendorEarnings,
      commissionPercentage,
    };
  }

  async getPendingCommissions(type = null) {
    const query = { status: 'pending' };
    if (type) query.type = type;

    const commissions = await Commission.find(query)
      .populate('orderId', 'orderId totals')
      .populate('subjectId')
      .sort({ createdAt: -1 })
      .lean();

    return commissions;
  }

  async getCommissionStats(subjectId, type) {
    const [pending, approved, paid] = await Promise.all([
      Commission.aggregate([
        { $match: { subjectId, type, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Commission.aggregate([
        { $match: { subjectId, type, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Commission.aggregate([
        { $match: { subjectId, type, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      pending: pending[0]?.total || 0,
      approved: approved[0]?.total || 0,
      paid: paid[0]?.total || 0,
      total: (pending[0]?.total || 0) + (approved[0]?.total || 0) + (paid[0]?.total || 0),
    };
  }
}

module.exports = new CommissionService();