// FILE: apps/api/src/services/payoutService.js
const env = require('../config/env');
const logger = require('../config/logger');
const Commission = require('../models/Commission');
const Vendor = require('../models/Vendor');
const Affiliate = require('../models/Affiliate');

class PayoutService {
  constructor() {
    // Initialize Stripe if key is available
    this.stripe = env.STRIPE_KEY ? require('stripe')(env.STRIPE_KEY) : null;
  }

  /**
   * Calculate total pending commission for a vendor
   */
  async getVendorPendingBalance(vendorId) {
    const result = await Commission.aggregate([
      {
        $match: {
          subjectId: vendorId,
          type: 'vendor',
          status: 'approved', // Only approved commissions
        },
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      totalPending: result[0]?.totalPending || 0,
      count: result[0]?.count || 0,
    };
  }

  /**
   * Calculate total pending commission for an affiliate
   */
  async getAffiliatePendingBalance(affiliateId) {
    const result = await Commission.aggregate([
      {
        $match: {
          subjectId: affiliateId,
          type: 'affiliate',
          status: 'approved',
        },
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      totalPending: result[0]?.totalPending || 0,
      count: result[0]?.count || 0,
    };
  }

  /**
   * Process payout to vendor via Stripe
   * This requires Stripe Connect to be set up
   */
  async processVendorPayout(vendorId, amount, commissionIds) {
    try {
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Check if vendor has bank account configured
      if (!vendor.bank?.accountNumber || !vendor.bank?.ifscCode) {
        throw new Error('Vendor bank account not configured');
      }

      // In a real implementation with Stripe Connect:
      // 1. Vendor would have a connected Stripe account
      // 2. Use stripe.transfers.create() to send money

      if (this.stripe && vendor.stripeAccountId) {
        // Stripe Connect Transfer
        const transfer = await this.stripe.transfers.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'inr',
          destination: vendor.stripeAccountId,
          description: `Payout for commissions: ${commissionIds.join(', ')}`,
          metadata: {
            vendorId: vendorId.toString(),
            commissionIds: commissionIds.join(','),
          },
        });

        // Update commissions
        await Commission.updateMany(
          { _id: { $in: commissionIds } },
          {
            status: 'paid',
            paidAt: new Date(),
            paymentRef: transfer.id,
          }
        );

        // Update vendor stats
        vendor.totalEarnings = (vendor.totalEarnings || 0) + amount;
        vendor.pendingEarnings = Math.max(0, (vendor.pendingEarnings || 0) - amount);
        await vendor.save();

        logger.info(`Payout processed for vendor ${vendor.storeName}: ₹${amount}`);

        return {
          success: true,
          transferId: transfer.id,
          amount,
          vendor: vendor.storeName,
        };
      } else {
        // Manual payout (no Stripe Connect)
        // Mark as paid manually - admin needs to transfer via bank
        await Commission.updateMany(
          { _id: { $in: commissionIds } },
          {
            status: 'paid',
            paidAt: new Date(),
            paymentRef: 'MANUAL_TRANSFER',
            notes: 'Manual bank transfer - admin to process',
          }
        );

        vendor.totalEarnings = (vendor.totalEarnings || 0) + amount;
        vendor.pendingEarnings = Math.max(0, (vendor.pendingEarnings || 0) - amount);
        await vendor.save();

        logger.info(`Manual payout marked for vendor ${vendor.storeName}: ₹${amount}`);

        return {
          success: true,
          transferId: 'MANUAL',
          amount,
          vendor: vendor.storeName,
          note: 'Please transfer funds manually to vendor bank account',
          bankDetails: {
            accountNumber: vendor.bank.accountNumber,
            ifscCode: vendor.bank.ifscCode,
            accountHolder: vendor.bank.accountHolderName,
          },
        };
      }
    } catch (error) {
      logger.error('Payout failed:', error);
      throw error;
    }
  }

  /**
   * Process payout to affiliate
   */
  async processAffiliatePayout(affiliateId, amount, commissionIds) {
    try {
      const affiliate = await Affiliate.findById(affiliateId);
      if (!affiliate) {
        throw new Error('Affiliate not found');
      }

      // Check minimum payout threshold
      const MIN_PAYOUT = 500; // ₹500 minimum
      if (amount < MIN_PAYOUT) {
        throw new Error(`Minimum payout amount is ₹${MIN_PAYOUT}`);
      }

      // Manual payout for affiliates
      await Commission.updateMany(
        { _id: { $in: commissionIds } },
        {
          status: 'paid',
          paidAt: new Date(),
          paymentRef: 'MANUAL_TRANSFER',
        }
      );

      affiliate.totalEarnings = (affiliate.totalEarnings || 0) + amount;
      affiliate.pendingEarnings = Math.max(0, (affiliate.pendingEarnings || 0) - amount);
      await affiliate.save();

      logger.info(`Payout processed for affiliate ${affiliate.userId}: ₹${amount}`);

      return {
        success: true,
        amount,
        affiliate: affiliate.userId,
        paymentMethod: affiliate.paymentMethod || 'bank_transfer',
      };
    } catch (error) {
      logger.error('Affiliate payout failed:', error);
      throw error;
    }
  }

  /**
   * Auto-approve commissions based on order status
   * Call this when order is marked as "delivered"
   */
  async autoApproveCommissions(orderId) {
    try {
      const result = await Commission.updateMany(
        {
          orderId,
          status: 'pending',
        },
        {
          status: 'approved',
          approvedAt: new Date(),
          notes: 'Auto-approved after delivery',
        }
      );

      logger.info(`Auto-approved ${result.modifiedCount} commissions for order ${orderId}`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Auto-approve failed:', error);
      throw error;
    }
  }

  /**
   * Batch payout - Process all approved commissions for a vendor
   */
  async batchPayoutVendor(vendorId) {
    try {
      // Get all approved commissions
      const commissions = await Commission.find({
        subjectId: vendorId,
        type: 'vendor',
        status: 'approved',
      });

      if (commissions.length === 0) {
        throw new Error('No approved commissions to payout');
      }

      const totalAmount = commissions.reduce((sum, c) => sum + c.amount, 0);
      const commissionIds = commissions.map(c => c._id);

      return this.processVendorPayout(vendorId, totalAmount, commissionIds);
    } catch (error) {
      logger.error('Batch payout failed:', error);
      throw error;
    }
  }

  /**
   * Get payout history
   */
  async getPayoutHistory(subjectId, type, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [commissions, total] = await Promise.all([
      Commission.find({
        subjectId,
        type,
        status: 'paid',
      })
        .populate('orderId', 'orderId totals createdAt')
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Commission.countDocuments({
        subjectId,
        type,
        status: 'paid',
      }),
    ]);

    return {
      commissions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new PayoutService();
