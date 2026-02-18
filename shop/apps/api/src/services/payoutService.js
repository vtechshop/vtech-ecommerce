// FILE: apps/api/src/services/payoutService.js
const env = require('../config/env');
const logger = require('../config/logger');
const Commission = require('../models/Commission');
const Vendor = require('../models/Vendor');
const Affiliate = require('../models/Affiliate');
const { createPayout, isConfigured: razorpayConfigured } = require('../utils/razorpay');
const AppError = require('../utils/AppError');

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
  async processVendorPayout(vendorId, amount, commissionIds, manualPayment = null) {
    try {
      const vendor = await Vendor.findById(vendorId).select('+bank.accountNumber');
      if (!vendor) {
        throw AppError.notFound('Vendor');
      }

      // Bank verification check
      if (vendor.bank.verified === false && vendor.panVerified === false) {
        logger.warn(`Vendor ${vendor.storeName}: Bank/PAN not verified yet. Proceeding with payout (admin-initiated).`);
      }

      // Manual payment flow (UPI/NEFT/IMPS etc.)
      if (manualPayment) {
        const { paymentMethod, paymentRef, paymentProof } = manualPayment;

        if (!paymentRef) {
          throw AppError.badRequest('Payment reference (UTR/Transaction ID) is required for manual payouts.', 'PAYMENT_REF_REQUIRED');
        }

        await Commission.updateMany(
          { _id: { $in: commissionIds } },
          {
            status: 'paid',
            paidAt: new Date(),
            paymentRef,
            paymentMethod: paymentMethod || 'other',
            paymentProof: paymentProof || null,
            notes: `Manual payout via ${paymentMethod || 'other'} | Ref: ${paymentRef}`,
          }
        );

        await Vendor.findByIdAndUpdate(vendor._id, {
          $inc: { totalEarnings: amount, pendingEarnings: -amount }
        });

        logger.info(`Manual payout processed for vendor ${vendor.storeName}: ₹${amount} via ${paymentMethod} (${paymentRef})`);

        return {
          success: true,
          method: paymentMethod || 'manual',
          transferId: paymentRef,
          amount,
          vendor: vendor.storeName,
          status: 'processed',
          bankDetails: {
            accountNumber: vendor.bank?.accountNumber,
            ifscCode: vendor.bank?.ifscCode,
            accountHolderName: vendor.bank?.accountHolderName || vendor.storeName,
            bankName: vendor.bank?.bankName,
            upiId: vendor.bank?.upiId,
          },
        };
      }

      // Razorpay automatic payout flow
      if (!vendor.bank?.accountNumber || !vendor.bank?.ifscCode) {
        throw AppError.badRequest('Vendor bank account not configured. Please ask the vendor to add bank details in Settings.', 'BANK_NOT_CONFIGURED');
      }

      if (!vendor.panNumber) {
        throw AppError.badRequest('Vendor PAN not provided. PAN is mandatory for payouts (TDS compliance). Please ask the vendor to add PAN in Settings.', 'PAN_NOT_PROVIDED');
      }

      if (!razorpayConfigured || !process.env.RAZORPAY_ACCOUNT_NUMBER) {
        throw AppError.badRequest(
          'RazorpayX is not configured. Use manual payment to process this payout.',
          'RAZORPAYX_NOT_CONFIGURED'
        );
      }

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

      if (!payoutResult.success) {
        throw AppError.badRequest(
          `Razorpay payout failed: ${payoutResult.error}. Please try again or contact support.`,
          'PAYOUT_FAILED'
        );
      }

      await Commission.updateMany(
        { _id: { $in: commissionIds } },
        {
          status: 'paid',
          paidAt: new Date(),
          paymentRef: payoutResult.payoutId,
          paymentMethod: 'razorpay',
          notes: `Razorpay payout: ${payoutResult.payoutId}`,
        }
      );

      await Vendor.findByIdAndUpdate(vendor._id, {
        $inc: { totalEarnings: amount, pendingEarnings: -amount }
      });

      logger.info(`Razorpay payout processed for vendor ${vendor.storeName}: ₹${amount} (${payoutResult.payoutId})`);

      return {
        success: true,
        method: 'razorpay',
        transferId: payoutResult.payoutId,
        amount,
        vendor: vendor.storeName,
        status: payoutResult.status,
      };
    } catch (error) {
      logger.error('Vendor payout failed:', error);
      throw error;
    }
  }

  /**
   * Process payout to affiliate via Razorpay or manual
   */
  async processAffiliatePayout(affiliateId, amount, commissionIds, manualPayment = null) {
    try {
      const affiliate = await Affiliate.findById(affiliateId).select('+bankDetails.accountNumber').populate('userId', 'name email');
      if (!affiliate) {
        throw AppError.notFound('Affiliate');
      }

      const MIN_PAYOUT = 500;
      if (amount < MIN_PAYOUT) {
        throw AppError.badRequest(`Minimum payout amount is ₹${MIN_PAYOUT}`, 'MIN_PAYOUT_NOT_MET');
      }

      // Calculate 2% TDS (Tax Deducted at Source) as per Indian Income Tax rules
      const TDS_RATE = 2;
      const tdsAmount = Math.round((amount * TDS_RATE) / 100 * 100) / 100;
      const netAmount = Math.round((amount - tdsAmount) * 100) / 100;

      logger.info(`Affiliate payout: Gross ₹${amount}, TDS (${TDS_RATE}%): ₹${tdsAmount}, Net: ₹${netAmount}`);

      const tdsUpdate = {
        'tds.rate': TDS_RATE,
        'tds.amount': tdsAmount,
        'tds.netAmount': netAmount,
      };

      // Manual payment flow
      if (manualPayment) {
        const { paymentMethod, paymentRef, paymentProof } = manualPayment;

        if (!paymentRef) {
          throw AppError.badRequest('Payment reference (UTR/Transaction ID) is required for manual payouts.', 'PAYMENT_REF_REQUIRED');
        }

        await Commission.updateMany(
          { _id: { $in: commissionIds } },
          {
            status: 'paid',
            paidAt: new Date(),
            paymentRef,
            paymentMethod: paymentMethod || 'other',
            paymentProof: paymentProof || null,
            notes: `Manual payout via ${paymentMethod || 'other'} | Ref: ${paymentRef} | TDS ${TDS_RATE}%: ₹${tdsAmount} | Net paid: ₹${netAmount}`,
            ...tdsUpdate,
          }
        );

        await Affiliate.findByIdAndUpdate(affiliate._id, {
          $inc: { totalEarnings: netAmount, pendingEarnings: -amount }
        });

        logger.info(`Manual payout processed for affiliate ${affiliate.code}: Gross ₹${amount}, TDS ₹${tdsAmount}, Net ₹${netAmount} via ${paymentMethod} (${paymentRef})`);

        return {
          success: true,
          method: paymentMethod || 'manual',
          transferId: paymentRef,
          grossAmount: amount,
          tdsRate: TDS_RATE,
          tdsAmount,
          netAmount,
          amount: netAmount,
          affiliate: affiliate.code,
          status: 'processed',
          bankDetails: {
            accountNumber: affiliate.bankDetails?.accountNumber,
            ifscCode: affiliate.bankDetails?.ifscCode,
            accountHolderName: affiliate.bankDetails?.accountHolderName || affiliate.userId?.name,
            bankName: affiliate.bankDetails?.bankName,
            upiId: affiliate.bankDetails?.upiId,
          },
        };
      }

      // Razorpay automatic payout flow
      if (!affiliate.bankDetails?.accountNumber || !affiliate.bankDetails?.ifscCode) {
        throw AppError.badRequest('Affiliate bank account not configured. Please ask the affiliate to add bank details.', 'BANK_NOT_CONFIGURED');
      }

      if (!affiliate.panNumber) {
        throw AppError.badRequest('Affiliate PAN not provided. PAN is mandatory for payouts (TDS compliance). Please ask the affiliate to add PAN in KYC settings.', 'PAN_NOT_PROVIDED');
      }

      if (!razorpayConfigured || !process.env.RAZORPAY_ACCOUNT_NUMBER) {
        throw AppError.badRequest(
          'RazorpayX is not configured. Use manual payment to process this payout.',
          'RAZORPAYX_NOT_CONFIGURED'
        );
      }

      const referenceId = `affiliate_${affiliateId}_${Date.now()}`;

      const payoutResult = await createPayout({
        amount: netAmount,
        beneficiaryName: affiliate.bankDetails.accountHolderName || affiliate.userId?.name || 'Affiliate',
        beneficiaryAccountNumber: affiliate.bankDetails.accountNumber,
        beneficiaryIfsc: affiliate.bankDetails.ifscCode,
        referenceId,
        mode: netAmount >= 200000 ? 'RTGS' : 'IMPS',
        purpose: 'payout',
        narration: `Affiliate commission payout - ${affiliate.code} (TDS ${TDS_RATE}% deducted)`,
      });

      if (!payoutResult.success) {
        throw AppError.badRequest(
          `Razorpay payout failed: ${payoutResult.error}. Please try again or contact support.`,
          'PAYOUT_FAILED'
        );
      }

      await Commission.updateMany(
        { _id: { $in: commissionIds } },
        {
          status: 'paid',
          paidAt: new Date(),
          paymentRef: payoutResult.payoutId,
          paymentMethod: 'razorpay',
          notes: `Razorpay payout: ${payoutResult.payoutId} | TDS ${TDS_RATE}%: ₹${tdsAmount} | Net paid: ₹${netAmount}`,
          ...tdsUpdate,
        }
      );

      await Affiliate.findByIdAndUpdate(affiliate._id, {
        $inc: { totalEarnings: netAmount, pendingEarnings: -amount }
      });

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
        throw AppError.badRequest('No approved commissions to payout', 'NO_COMMISSIONS');
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
