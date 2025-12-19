// FILE: apps/api/src/controllers/razorpayAccountController.js
const { createLinkedAccount, fetchLinkedAccount } = require('../utils/razorpay');
const Vendor = require('../models/Vendor');
const Affiliate = require('../models/Affiliate');
const logger = require('../config/logger');

/**
 * Create Razorpay linked account for vendor
 * POST /api/vendors/razorpay/connect
 */
exports.createVendorLinkedAccount = async (req, res, next) => {
  try {
    const vendorId = req.user._id;
    const vendor = await Vendor.findOne({ userId: vendorId });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    // Check if already connected
    if (vendor.razorpay?.accountId) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CONNECTED', message: 'Razorpay account already connected' },
      });
    }

    // Get vendor details from request
    const { email, phone, contactName } = req.body;

    // Create linked account on Razorpay
    const accountData = {
      email: email || vendor.kyc?.phoneNumber,
      phone: phone || vendor.kyc?.phoneNumber,
      businessName: vendor.kyc?.businessName || vendor.storeName,
      businessType: vendor.kyc?.businessType || 'individual',
      contactName: contactName || vendor.storeName,
      reference_id: `vendor_${vendor._id}`,
      category: 'ecommerce',
      subcategory: 'retail',
    };

    const result = await createLinkedAccount(accountData);

    if (!result.success) {
      logger.error(`Failed to create Razorpay account for vendor ${vendor._id}: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: { code: 'ACCOUNT_CREATION_FAILED', message: result.error },
      });
    }

    // Update vendor with Razorpay account details
    vendor.razorpay = {
      accountId: result.account.id,
      accountStatus: result.account.status || 'created',
      accountEmail: result.account.email,
      accountPhone: result.account.phone,
      kycStatus: 'pending',
      settlementPercentage: vendor.razorpay?.settlementPercentage || 85,
      settlementSchedule: 'instant',
      connectedAt: new Date(),
    };

    await vendor.save();

    logger.info(`Razorpay account created for vendor ${vendor._id}: ${result.account.id}`);

    res.json({
      success: true,
      data: {
        accountId: result.account.id,
        accountStatus: result.account.status,
        message: 'Razorpay account connected successfully',
      },
    });
  } catch (error) {
    logger.error('Create vendor linked account error:', error);
    next(error);
  }
};

/**
 * Create Razorpay linked account for affiliate
 * POST /api/affiliates/razorpay/connect
 */
exports.createAffiliateLinkedAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const affiliate = await Affiliate.findOne({ userId });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'AFFILIATE_NOT_FOUND', message: 'Affiliate profile not found' },
      });
    }

    // Check if already connected
    if (affiliate.razorpay?.accountId) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_CONNECTED', message: 'Razorpay account already connected' },
      });
    }

    // Get affiliate details from request
    const { email, phone, contactName } = req.body;

    // Create linked account on Razorpay
    const accountData = {
      email: email || affiliate.kyc?.phoneNumber,
      phone: phone || affiliate.kyc?.phoneNumber,
      businessName: `Affiliate ${affiliate.code}`,
      businessType: 'individual',
      contactName: contactName || affiliate.kyc?.fullName,
      reference_id: `affiliate_${affiliate._id}`,
      category: 'ecommerce',
      subcategory: 'affiliate_marketing',
    };

    const result = await createLinkedAccount(accountData);

    if (!result.success) {
      logger.error(`Failed to create Razorpay account for affiliate ${affiliate._id}: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: { code: 'ACCOUNT_CREATION_FAILED', message: result.error },
      });
    }

    // Update affiliate with Razorpay account details
    affiliate.razorpay = {
      accountId: result.account.id,
      accountStatus: result.account.status || 'created',
      accountEmail: result.account.email,
      accountPhone: result.account.phone,
      settlementSchedule: 'weekly',
      connectedAt: new Date(),
    };

    await affiliate.save();

    logger.info(`Razorpay account created for affiliate ${affiliate._id}: ${result.account.id}`);

    res.json({
      success: true,
      data: {
        accountId: result.account.id,
        accountStatus: result.account.status,
        message: 'Razorpay account connected successfully',
      },
    });
  } catch (error) {
    logger.error('Create affiliate linked account error:', error);
    next(error);
  }
};

/**
 * Get Razorpay linked account status for vendor
 * GET /api/vendors/razorpay/status
 */
exports.getVendorAccountStatus = async (req, res, next) => {
  try {
    const vendorId = req.user._id;
    const vendor = await Vendor.findOne({ userId: vendorId });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    if (!vendor.razorpay?.accountId) {
      return res.json({
        success: true,
        data: {
          connected: false,
          message: 'No Razorpay account connected',
        },
      });
    }

    // Fetch latest status from Razorpay
    const result = await fetchLinkedAccount(vendor.razorpay.accountId);

    if (result.success) {
      // Update local status
      vendor.razorpay.accountStatus = result.account.status;
      await vendor.save();
    }

    res.json({
      success: true,
      data: {
        connected: true,
        accountId: vendor.razorpay.accountId,
        accountStatus: vendor.razorpay.accountStatus,
        kycStatus: vendor.razorpay.kycStatus,
        settlementPercentage: vendor.razorpay.settlementPercentage,
        totalEarnings: vendor.totalEarnings,
        pendingEarnings: vendor.pendingEarnings,
      },
    });
  } catch (error) {
    logger.error('Get vendor account status error:', error);
    next(error);
  }
};

/**
 * Get Razorpay linked account status for affiliate
 * GET /api/affiliates/razorpay/status
 */
exports.getAffiliateAccountStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const affiliate = await Affiliate.findOne({ userId });

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'AFFILIATE_NOT_FOUND', message: 'Affiliate profile not found' },
      });
    }

    if (!affiliate.razorpay?.accountId) {
      return res.json({
        success: true,
        data: {
          connected: false,
          message: 'No Razorpay account connected',
        },
      });
    }

    // Fetch latest status from Razorpay
    const result = await fetchLinkedAccount(affiliate.razorpay.accountId);

    if (result.success) {
      // Update local status
      affiliate.razorpay.accountStatus = result.account.status;
      await affiliate.save();
    }

    res.json({
      success: true,
      data: {
        connected: true,
        accountId: affiliate.razorpay.accountId,
        accountStatus: affiliate.razorpay.accountStatus,
        totalEarnings: affiliate.totalEarnings,
        pendingEarnings: affiliate.pendingEarnings,
        paidEarnings: affiliate.paidEarnings,
      },
    });
  } catch (error) {
    logger.error('Get affiliate account status error:', error);
    next(error);
  }
};
