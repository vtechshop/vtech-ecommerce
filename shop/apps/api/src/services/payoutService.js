// FILE: apps/api/src/services/payoutService.js
const env = require('../config/env');
const logger = require('../config/logger');
const Commission = require('../models/Commission');
const Vendor = require('../models/Vendor');
const Affiliate = require('../models/Affiliate');
const { createPayout, isConfigured: razorpayConfigured } = require('../utils/razorpay');

class PayoutService {
  /**
   * Calculate total pending commission for a vendor
   */
  async getVendorPendingBalance(vendorId) {
    const result = await Commission.aggregate([
      {
        $match: {
          subjectId: vendorId,
          type: 'vendor',
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
   * Process payout to vendor via Razorpay (RazorpayX) or manual
   */
  async processVendorPayout(vendorId, amount, commissionIds) {
    try {
      const vendor = await Vendor.findById(vendorId).select('+bank.accountNumber');
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      if (!vendor.bank?.accountNumber || !vendor.bank?.ifscCode) {
        throw new Error('Vendor bank account not configured. Please ask the vendor to add bank details in Settings.');
      }

      // KYC verification gate - PAN required for TDS compliance
      if (!vendor.panNumber) {
        throw new Error('Vendor PAN not provided. PAN is mandatory for payouts (TDS compliance). Please ask the vendor to add PAN in Settings.');
      }

      // Bank verification check
      if (vendor.bank.verified === false && vendor.panVerified === false) {
        logger.warn(`Vendor ${vendor.storeName}: Bank/PAN not verified yet. Proceeding with payout (admin-initiated).`);
      }

      // Try Razorpay payout first
      if (razorpayConfigured && process.env.RAZORPAY_ACCOUNT_NUMBER) {
        const referenceId = `vendor_${vendorId}_${Date.now()}`;

        const payoutResult = await createPayout({
          amount,
          beneficiaryName: vendor.bank.accountHolderName || vendor.storeName,
          beneficiaryAccountNumber: vendor.bank.accountNumber,
          beneficiaryIfsc: vendor.bank.ifscCode,
          referenceId,
          mode: amount >= 200000 ? 'RTGS' : 'IMPS',
          purpose: 'payout',
          narration: `Commission payout for ${vendor.storeName}`,
        });

        if (payoutResult.success) {
          await Commission.updateMany(
            { _id: { $in: commissionIds } },
            {
              status: 'paid',
              paidAt: new Date(),
              paymentRef: payoutResult.payoutId,
              notes: `Razorpay payout: ${payoutResult.payoutId}`,
            }
          );

          vendor.totalEarnings = (vendor.totalEarnings || 0) + amount;
          vendor.pendingEarnings = Math.max(0, (vendor.pendingEarnings || 0) - amount);
          await vendor.save();

          logger.info(`Razorpay payout processed for vendor ${vendor.storeName}: ₹${amount} (${payoutResult.payoutId})`);

          return {
            success: true,
            method: 'razorpay',
            transferId: payoutResult.payoutId,
            amount,
            vendor: vendor.storeName,
            status: payoutResult.status,
          };
        } else {
          logger.warn(`Razorpay payout failed for vendor ${vendor.storeName}: ${payoutResult.error}. Falling back to manual.`);
        }
      }

      // Manual payout fallback
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
        method: 'manual',
        transferId: 'MANUAL',
        amount,
        vendor: vendor.storeName,
        note: 'Razorpay payout not available. Please transfer funds manually to vendor bank account.',
        bankDetails: {
          accountNumber: vendor.bank.accountNumber,
          ifscCode: vendor.bank.ifscCode,
          accountHolder: vendor.bank.accountHolderName,
        },
      };
    } catch (error) {
      logger.error('Vendor payout failed:', error);
      throw error;
    }
  }

  /**
   * Process payout to affiliate via Razorpay or manual
   */
  async processAffiliatePayout(affiliateId, amount, commissionIds) {
    try {
      const affiliate = await Affiliate.findById(affiliateId).select('+bankDetails.accountNumber').populate('userId', 'name email');
      if (!affiliate) {
        throw new Error('Affiliate not found');
      }

      const MIN_PAYOUT = 500;
      if (amount < MIN_PAYOUT) {
        throw new Error(`Minimum payout amount is ₹${MIN_PAYOUT}`);
      }

      if (!affiliate.bankDetails?.accountNumber || !affiliate.bankDetails?.ifscCode) {
        throw new Error('Affiliate bank account not configured. Please ask the affiliate to add bank details.');
      }

      // KYC verification gate - PAN required for TDS compliance
      if (!affiliate.panNumber) {
        throw new Error('Affiliate PAN not provided. PAN is mandatory for payouts (TDS compliance). Please ask the affiliate to add PAN in KYC settings.');
      }

      // Calculate 2% TDS (Tax Deducted at Source) as per Indian Income Tax rules
      const TDS_RATE = 2;
      const tdsAmount = Math.round((amount * TDS_RATE) / 100 * 100) / 100; // Round to 2 decimals
      const netAmount = Math.round((amount - tdsAmount) * 100) / 100;

      logger.info(`Affiliate payout: Gross ₹${amount}, TDS (${TDS_RATE}%): ₹${tdsAmount}, Net: ₹${netAmount}`);

      // Update commission records with TDS info
      const tdsUpdate = {
        'tds.rate': TDS_RATE,
        'tds.amount': tdsAmount,
        'tds.netAmount': netAmount,
      };

      // Try Razorpay payout (send net amount after TDS)
      if (razorpayConfigured && process.env.RAZORPAY_ACCOUNT_NUMBER) {
        const referenceId = `affiliate_${affiliateId}_${Date.now()}`;

        const payoutResult = await createPayout({
          amount: netAmount, // Send net amount after TDS deduction
          beneficiaryName: affiliate.bankDetails.accountHolderName || affiliate.userId?.name || 'Affiliate',
          beneficiaryAccountNumber: affiliate.bankDetails.accountNumber,
          beneficiaryIfsc: affiliate.bankDetails.ifscCode,
          referenceId,
          mode: netAmount >= 200000 ? 'RTGS' : 'IMPS',
          purpose: 'payout',
          narration: `Affiliate commission payout - ${affiliate.code} (TDS ${TDS_RATE}% deducted)`,
        });

        if (payoutResult.success) {
          await Commission.updateMany(
            { _id: { $in: commissionIds } },
            {
              status: 'paid',
              paidAt: new Date(),
              paymentRef: payoutResult.payoutId,
              notes: `Razorpay payout: ${payoutResult.payoutId} | TDS ${TDS_RATE}%: ₹${tdsAmount} | Net paid: ₹${netAmount}`,
              ...tdsUpdate,
            }
          );

          affiliate.totalEarnings = (affiliate.totalEarnings || 0) + netAmount;
          affiliate.pendingEarnings = Math.max(0, (affiliate.pendingEarnings || 0) - amount);
          await affiliate.save();

          logger.info(`Razorpay payout processed for affiliate ${affiliate.code}: Gross ₹${amount}, TDS ₹${tdsAmount}, Net ₹${netAmount}`);

          return {
            success: true,
            method: 'razorpay',
            transferId: payoutResult.payoutId,
            grossAmount: amount,
            tdsRate: TDS_RATE,
            tdsAmount,
            netAmount,
            amount: netAmount,
            affiliate: affiliate.code,
            status: payoutResult.status,
          };
        } else {
          logger.warn(`Razorpay payout failed for affiliate ${affiliate.code}: ${payoutResult.error}. Falling back to manual.`);
        }
      }

      // Manual payout fallback (net amount after TDS)
      await Commission.updateMany(
        { _id: { $in: commissionIds } },
        {
          status: 'paid',
          paidAt: new Date(),
          paymentRef: 'MANUAL_TRANSFER',
          notes: `Manual transfer | TDS ${TDS_RATE}%: ₹${tdsAmount} | Net to pay: ₹${netAmount}`,
          ...tdsUpdate,
        }
      );

      affiliate.totalEarnings = (affiliate.totalEarnings || 0) + netAmount;
      affiliate.pendingEarnings = Math.max(0, (affiliate.pendingEarnings || 0) - amount);
      await affiliate.save();

      logger.info(`Manual payout marked for affiliate ${affiliate.code}: Gross ₹${amount}, TDS ₹${tdsAmount}, Net ₹${netAmount}`);

      return {
        success: true,
        method: 'manual',
        grossAmount: amount,
        tdsRate: TDS_RATE,
        tdsAmount,
        netAmount,
        amount: netAmount,
        affiliate: affiliate.code,
        note: 'Razorpay payout not available. Please transfer funds manually (net amount after TDS).',
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
