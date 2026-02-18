// FILE: apps/api/src/controllers/affiliateController.js
const Affiliate = require('../models/Affiliate');
const Commission = require('../models/Commission');
const { generateAffiliateCode, getPaginationMeta } = require('../utils/helpers');
const logger = require('../config/logger');
const affiliateService = require('../services/affiliateService');

// Apply as affiliate
exports.apply = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { paymentMethod, paymentDetails } = req.body;

    // Check if user already has affiliate profile
    const existing = await Affiliate.findOne({ userId: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_AFFILIATE',
          message: 'User already has an affiliate profile',
        },
      });
    }

    // Get user to get their name
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    const affiliate = await Affiliate.create({
      userId: req.user._id,
      code: generateAffiliateCode(user.name || user.email),
      status: 'pending',
      paymentMethod,
      paymentDetails,
    });

    logger.info(`Affiliate application: ${affiliate.code}`);

    res.status(201).json({
      success: true,
      data: affiliate,
    });
  } catch (error) {
    next(error);
  }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Affiliate profile not found',
        },
      });
    }

    // Get monthly stats
    const Commission = require('../models/Commission');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthStats, lastMonthStats] = await Promise.all([
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            createdAt: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            clicks: { $sum: '$clicks' },
            conversions: { $sum: 1 },
            earnings: { $sum: '$amount' },
          },
        },
      ]),
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          },
        },
        {
          $group: {
            _id: null,
            earnings: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const thisMonth = thisMonthStats[0] || { clicks: 0, conversions: 0, earnings: 0 };
    const lastMonth = lastMonthStats[0] || { earnings: 0 };

    // Calculate month-over-month change
    const earningsChange = lastMonth.earnings > 0
      ? (((thisMonth.earnings - lastMonth.earnings) / lastMonth.earnings) * 100).toFixed(1)
      : thisMonth.earnings > 0 ? 100 : 0;

    const stats = {
      totalClicks: affiliate.totalClicks,
      totalConversions: affiliate.totalConversions,
      conversionRate: affiliate.totalClicks > 0
        ? ((affiliate.totalConversions / affiliate.totalClicks) * 100).toFixed(2)
        : 0,
      totalEarnings: affiliate.totalEarnings,
      pendingEarnings: affiliate.pendingEarnings,
      pendingCommissions: affiliate.pendingEarnings, // Alias for frontend compatibility
      paidEarnings: affiliate.paidEarnings,
      // Monthly stats
      thisMonthEarnings: thisMonth.earnings,
      thisMonthConversions: thisMonth.conversions,
      earningsChange: parseFloat(earningsChange),
      // Include status info for frontend
      status: affiliate.status,
      kycStatus: affiliate.kyc?.status || 'pending',
      code: affiliate.code,
      commissionPercentage: affiliate.commissionPercentage || 5,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// Get affiliate links
exports.getLinks = async (req, res, next) => {
  try {
    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Affiliate profile not found',
        },
      });
    }

    const env = require('../config/env');
    const baseUrl = env.CLIENT_URL;

    const links = [
      {
        type: 'homepage',
        url: `${baseUrl}?affId=${affiliate.code}`,
        description: 'Direct link to homepage with your affiliate code',
      },
      {
        type: 'search',
        url: `${baseUrl}/search?affId=${affiliate.code}`,
        description: 'Search page for product discovery',
      },
      {
        type: 'category',
        url: `${baseUrl}/category/[slug]?affId=${affiliate.code}`,
        description: 'Category page link (replace [slug] with category)',
      },
      {
        type: 'product',
        url: `${baseUrl}/product/[slug]?affId=${affiliate.code}`,
        description: 'Product page link (replace [slug] with product)',
      },
    ];

    res.json({
      success: true,
      data: {
        code: affiliate.code,
        commissionPercentage: affiliate.commissionPercentage || 5,
        totalClicks: affiliate.totalClicks,
        totalConversions: affiliate.totalConversions,
        totalEarnings: affiliate.totalEarnings,
        links,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Track click (public endpoint)
exports.trackClick = async (req, res, next) => {
  try {
    const { affId } = req.body;

    const affiliate = await Affiliate.findOne({ code: affId, status: 'active' });

    if (affiliate) {
      affiliate.totalClicks += 1;
      await affiliate.save();

      // Set cookie for attribution (30 days default)
      const env = require('../config/env');
      const days = env.AFFILIATE_WINDOW_DAYS || 30;
      
      // Note: Do NOT set httpOnly here - the frontend needs to read this cookie
      // to include affiliateCode in the order request body for commission tracking
      res.cookie('affiliate', affId, {
        maxAge: days * 24 * 60 * 60 * 1000,
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
      });
    }

    res.json({
      success: true,
      data: { tracked: !!affiliate },
    });
  } catch (error) {
    next(error);
  }
};

// Get commissions
exports.getCommissions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, dateRange } = req.query;

    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Affiliate profile not found',
        },
      });
    }

    const query = {
      subjectId: affiliate._id,
      type: 'affiliate',
    };
    if (status) query.status = status;

    // Apply date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        default:
          break;
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [commissions, total] = await Promise.all([
      Commission.find(query)
        .populate('orderId', 'orderId totals createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Commission.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: commissions,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get payouts
exports.getPayouts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Affiliate profile not found',
        },
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [commissions, total] = await Promise.all([
      Commission.find({
        subjectId: affiliate._id,
        type: 'affiliate',
        status: 'paid',
      })
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Commission.countDocuments({
        subjectId: affiliate._id,
        type: 'affiliate',
        status: 'paid',
      }),
    ]);

    res.json({
      success: true,
      data: commissions,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// KYC Methods
exports.getKYC = async (req, res, next) => {
  try {
    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Affiliate profile not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        kyc: affiliate.kyc,
        status: affiliate.status,
        panNumber: affiliate.panNumber,
        panVerified: affiliate.panVerified,
        paymentMethod: affiliate.paymentMethod,
        paymentDetails: affiliate.paymentDetails,
        bankVerified: affiliate.bankDetails?.verified || false,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateKYC = async (req, res, next) => {
  try {
    const {
      fullName,
      address,
      city,
      state,
      country,
      zipCode,
      phoneNumber,
      idType,
      idNumber,
      gstNumber,
      gstVerified,
      gstDetails,
      submit,
    } = req.body;

    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Affiliate profile not found',
        },
      });
    }

    // If submitting for review, validate mandatory fields
    if (submit) {
      const missing = [];
      if (!fullName?.trim() && !affiliate.kyc.fullName) missing.push('Full Name');
      if (!phoneNumber?.trim() && !affiliate.kyc.phoneNumber) missing.push('Phone Number');
      if (!idType && !affiliate.kyc.idType) missing.push('ID Type');
      if (!idNumber?.trim() && !affiliate.kyc.idNumber) missing.push('ID Number');
      if (!address?.trim() && !affiliate.kyc.address) missing.push('Address');
      if (!city?.trim() && !affiliate.kyc.city) missing.push('City');
      if (!state?.trim() && !affiliate.kyc.state) missing.push('State');
      if (!country?.trim() && !affiliate.kyc.country) missing.push('Country');
      // Check bank details
      if (!affiliate.bankDetails?.accountNumber) missing.push('Bank Account Number');
      if (!affiliate.bankDetails?.ifscCode) missing.push('IFSC Code');
      if (!affiliate.panNumber) missing.push('PAN Number');
      // Check documents
      const docs = affiliate.kyc.documents || [];
      const hasIdProof = docs.some(d => d.type === 'id_proof');
      if (!hasIdProof) missing.push('ID Proof Document');

      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: `Please complete the following before submitting: ${missing.join(', ')}`,
            missingFields: missing,
          },
        });
      }
    }

    // Update KYC fields
    if (fullName !== undefined) affiliate.kyc.fullName = fullName;
    if (address !== undefined) affiliate.kyc.address = address;
    if (city !== undefined) affiliate.kyc.city = city;
    if (state !== undefined) affiliate.kyc.state = state;
    if (country !== undefined) affiliate.kyc.country = country;
    if (zipCode !== undefined) affiliate.kyc.zipCode = zipCode;
    if (phoneNumber !== undefined) affiliate.kyc.phoneNumber = phoneNumber;
    if (idType !== undefined) affiliate.kyc.idType = idType;
    if (idNumber !== undefined) affiliate.kyc.idNumber = idNumber;
    if (gstNumber !== undefined) affiliate.kyc.gstNumber = gstNumber;
    if (gstVerified !== undefined) affiliate.kyc.gstVerified = gstVerified;
    if (gstDetails !== undefined) affiliate.kyc.gstDetails = gstDetails;

    // If KYC was rejected and user is updating, reset to pending
    if (affiliate.kyc.status === 'rejected') {
      affiliate.kyc.status = 'pending';
      affiliate.kyc.rejectionReason = undefined;
    }

    // If submitting for review, set status to pending
    if (submit && affiliate.kyc.status !== 'approved') {
      affiliate.kyc.status = 'pending';
    }

    await affiliate.save();

    logger.info(`KYC ${submit ? 'submitted' : 'updated'} for affiliate: ${affiliate.code}`);

    res.json({
      success: true,
      data: {
        kyc: affiliate.kyc,
        message: submit ? 'KYC submitted for review successfully' : 'KYC information updated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadKYCDocument = async (req, res, next) => {
  try {
    const { type, url, filename } = req.body;

    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Affiliate profile not found',
        },
      });
    }

    // Validate document type
    const validTypes = ['id_proof', 'address_proof', 'tax_document', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'Invalid document type',
        },
      });
    }

    // Add document to KYC documents array
    if (!affiliate.kyc.documents) {
      affiliate.kyc.documents = [];
    }

    affiliate.kyc.documents.push({
      type,
      url,
      filename,
      uploadedAt: new Date(),
    });

    // If KYC was rejected and user is uploading new documents, reset to pending
    if (affiliate.kyc.status === 'rejected') {
      affiliate.kyc.status = 'pending';
      affiliate.kyc.rejectionReason = undefined;
    }

    await affiliate.save();

    logger.info(`KYC document uploaded for affiliate: ${affiliate.code}`);

    res.json({
      success: true,
      data: {
        document: affiliate.kyc.documents[affiliate.kyc.documents.length - 1],
        message: 'Document uploaded successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteKYCDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Affiliate profile not found',
        },
      });
    }

    // Find and remove document
    const documentIndex = affiliate.kyc.documents?.findIndex(
      doc => doc._id.toString() === documentId
    );

    if (documentIndex === -1 || documentIndex === undefined) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document not found',
        },
      });
    }

    affiliate.kyc.documents.splice(documentIndex, 1);
    await affiliate.save();

    logger.info(`KYC document deleted for affiliate: ${affiliate.code}`);

    res.json({
      success: true,
      data: { message: 'Document deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};

// Generate product-specific affiliate link
exports.generateProductLink = async (req, res, next) => {
  try {
    const { productId, customCommissionRate } = req.body;
    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate profile not found' }
      });
    }

    const link = await affiliateService.generateProductLink(
      affiliate._id,
      productId || null,
      customCommissionRate
    );

    res.status(201).json({
      success: true,
      data: link,
    });
  } catch (error) {
    next(error);
  }
};

// Get all product links for the affiliate
exports.getProductLinks = async (req, res, next) => {
  try {
    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate profile not found' }
      });
    }

    const links = await affiliateService.getAffiliateLinks(affiliate._id);

    res.json({
      success: true,
      data: links,
    });
  } catch (error) {
    next(error);
  }
};

// Delete/deactivate affiliate link
exports.deleteAffiliateLink = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate profile not found' }
      });
    }

    // Verify link belongs to this affiliate
    const AffiliateLink = require('../models/AffiliateLink');
    const link = await AffiliateLink.findById(linkId);

    if (!link || link.affiliateId.toString() !== affiliate._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only delete your own links' }
      });
    }

    await affiliateService.deleteAffiliateLink(linkId);

    res.json({
      success: true,
      data: { message: 'Link deactivated successfully' },
    });
  } catch (error) {
    next(error);
  }
};

// Get affiliate profile
exports.getAffiliateProfile = async (req, res, next) => {
  try {
    const affiliate = await Affiliate.findOne({ userId: req.user._id })
      .populate('userId', 'name email')
      .lean();

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate profile not found' },
      });
    }

    res.json({ success: true, data: affiliate });
  } catch (error) {
    next(error);
  }
};

// Update payment details
exports.updatePaymentDetails = async (req, res, next) => {
  try {
    const { paymentMethod, paymentDetails } = req.body;

    const affiliate = await Affiliate.findOne({ userId: req.user._id });
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate profile not found' },
      });
    }

    // Update payment information
    affiliate.paymentMethod = paymentMethod;
    affiliate.paymentDetails = paymentDetails;

    // Also store in structured bankDetails for payouts
    if (paymentMethod === 'bank' && paymentDetails) {
      affiliate.bankDetails = affiliate.bankDetails || {};
      if (paymentDetails.accountHolderName) affiliate.bankDetails.accountHolderName = paymentDetails.accountHolderName;
      if (paymentDetails.bankName) affiliate.bankDetails.bankName = paymentDetails.bankName;
      if (paymentDetails.accountNumber) {
        affiliate.bankDetails.accountNumber = paymentDetails.accountNumber;
        affiliate.bankDetails.lastFourDigits = paymentDetails.accountNumber.slice(-4);
      }
      if (paymentDetails.ifscCode) affiliate.bankDetails.ifscCode = paymentDetails.ifscCode.toUpperCase();
      if (paymentDetails.upiId) affiliate.bankDetails.upiId = paymentDetails.upiId;
    }

    // Save PAN if provided
    if (req.body.panNumber) {
      affiliate.panNumber = req.body.panNumber.toUpperCase();
    }

    await affiliate.save();

    logger.info(`Payment details updated for affiliate: ${affiliate.code}`);

    res.json({
      success: true,
      data: { message: 'Payment details updated successfully' },
    });
  } catch (error) {
    next(error);
  }
};

// Get link-specific statistics
exports.getLinkStats = async (req, res, next) => {
  try {
    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate profile not found' },
      });
    }

    // Get performance stats by time period
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayStats, weekStats, monthStats, topProducts] = await Promise.all([
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            conversions: { $sum: 1 },
            earnings: { $sum: '$amount' },
          },
        },
      ]),
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            createdAt: { $gte: weekAgo },
          },
        },
        {
          $group: {
            _id: null,
            conversions: { $sum: 1 },
            earnings: { $sum: '$amount' },
          },
        },
      ]),
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            createdAt: { $gte: monthAgo },
          },
        },
        {
          $group: {
            _id: null,
            conversions: { $sum: 1 },
            earnings: { $sum: '$amount' },
          },
        },
      ]),
      // Top performing products
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
          },
        },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        { $unwind: '$order.items' },
        {
          $group: {
            _id: '$order.items.productId',
            productName: { $first: '$order.items.name' },
            conversions: { $sum: 1 },
            earnings: { $sum: '$amount' },
          },
        },
        { $sort: { earnings: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        today: todayStats[0] || { conversions: 0, earnings: 0 },
        week: weekStats[0] || { conversions: 0, earnings: 0 },
        month: monthStats[0] || { conversions: 0, earnings: 0 },
        topProducts: topProducts || [],
        cookieDuration: 30, // days
        commissionPercentage: affiliate.commissionPercentage || 5,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get product-specific stats for affiliate
exports.getProductStats = async (req, res, next) => {
  try {
    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate profile not found' },
      });
    }

    // Get product performance stats
    const [topSelling, topEarning, recentConversions, categoryStats] = await Promise.all([
      // Top selling products (by conversion count)
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
          },
        },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        { $unwind: '$order.items' },
        {
          $group: {
            _id: '$order.items.productId',
            productName: { $first: '$order.items.name' },
            productSlug: { $first: '$order.items.slug' },
            conversions: { $sum: 1 },
            totalEarnings: { $sum: '$amount' },
          },
        },
        { $sort: { conversions: -1 } },
        { $limit: 10 },
      ]),
      // Top earning products
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
          },
        },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        { $unwind: '$order.items' },
        {
          $group: {
            _id: '$order.items.productId',
            productName: { $first: '$order.items.name' },
            productSlug: { $first: '$order.items.slug' },
            totalEarnings: { $sum: '$amount' },
            conversions: { $sum: 1 },
          },
        },
        { $sort: { totalEarnings: -1 } },
        { $limit: 10 },
      ]),
      // Recent conversions with product details
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        {
          $project: {
            amount: 1,
            status: 1,
            createdAt: 1,
            orderTotal: '$order.totals.total',
            items: '$order.items',
          },
        },
      ]),
      // Category performance
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
          },
        },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        { $unwind: '$order.items' },
        {
          $lookup: {
            from: 'products',
            localField: 'order.items.productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'categories',
            localField: 'product.categoryId',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$category._id',
            categoryName: { $first: { $ifNull: ['$category.name', 'Uncategorized'] } },
            conversions: { $sum: 1 },
            earnings: { $sum: '$amount' },
          },
        },
        { $sort: { earnings: -1 } },
        { $limit: 5 },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        topSelling: topSelling || [],
        topEarning: topEarning || [],
        recentConversions: recentConversions || [],
        categoryStats: categoryStats || [],
        commissionPercentage: affiliate.commissionPercentage || 5,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get commission statistics for affiliate
exports.getCommissionStats = async (req, res, next) => {
  try {
    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate profile not found' },
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

    const [
      pendingStats,
      approvedStats,
      paidStats,
      thisMonthStats,
      lastMonthStats,
      quarterStats,
      monthlyBreakdown,
    ] = await Promise.all([
      // Pending commissions
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            status: 'pending',
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      // Approved commissions
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            status: 'approved',
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      // Paid commissions
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            status: 'paid',
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
            tdsAmount: { $sum: '$tds.amount' },
            netAmount: { $sum: '$tds.netAmount' },
          },
        },
      ]),
      // This month
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            createdAt: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      // Last month
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      // This quarter
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            createdAt: { $gte: startOfQuarter },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      // Monthly breakdown (last 6 months)
      Commission.aggregate([
        {
          $match: {
            subjectId: affiliate._id,
            type: 'affiliate',
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    // Calculate month-over-month change
    const thisMonthAmount = thisMonthStats[0]?.amount || 0;
    const lastMonthAmount = lastMonthStats[0]?.amount || 0;
    const monthChange = lastMonthAmount > 0
      ? (((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100).toFixed(1)
      : thisMonthAmount > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        pending: {
          count: pendingStats[0]?.count || 0,
          amount: pendingStats[0]?.amount || 0,
        },
        approved: {
          count: approvedStats[0]?.count || 0,
          amount: approvedStats[0]?.amount || 0,
        },
        paid: {
          count: paidStats[0]?.count || 0,
          amount: paidStats[0]?.amount || 0,
          tdsAmount: paidStats[0]?.tdsAmount || 0,
          netAmount: paidStats[0]?.netAmount || 0,
        },
        thisMonth: {
          count: thisMonthStats[0]?.count || 0,
          amount: thisMonthAmount,
          change: parseFloat(monthChange),
        },
        lastMonth: {
          count: lastMonthStats[0]?.count || 0,
          amount: lastMonthAmount,
        },
        thisQuarter: {
          count: quarterStats[0]?.count || 0,
          amount: quarterStats[0]?.amount || 0,
        },
        monthlyBreakdown: monthlyBreakdown.map(m => ({
          year: m._id.year,
          month: m._id.month,
          count: m.count,
          amount: m.amount,
        })),
        commissionPercentage: affiliate.commissionPercentage || 5,
        tierLevel: getTierLevel(thisMonthAmount),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper function for tier calculation
function getTierLevel(monthlyEarnings) {
  if (monthlyEarnings >= 100000) return { name: 'Platinum', rate: 8 };
  if (monthlyEarnings >= 50000) return { name: 'Gold', rate: 7 };
  if (monthlyEarnings >= 25000) return { name: 'Silver', rate: 6 };
  return { name: 'Bronze', rate: 5 };
}

// Get affiliate preferences
exports.getPreferences = async (req, res, next) => {
  try {
    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate profile not found' },
      });
    }

    // Return preferences with defaults
    const defaultPreferences = {
      emailNotifications: true,
      showEarnings: true,
      soundEnabled: true,
      weeklyReports: true,
      monthlyReports: true,
      promotionalEmails: false,
      currency: 'INR',
      language: 'en',
    };

    res.json({
      success: true,
      data: {
        ...defaultPreferences,
        ...affiliate.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update affiliate preferences
exports.updatePreferences = async (req, res, next) => {
  try {
    const {
      emailNotifications,
      showEarnings,
      soundEnabled,
      weeklyReports,
      monthlyReports,
      promotionalEmails,
      currency,
      language,
    } = req.body;

    let affiliate = await Affiliate.findOne({ userId: req.user._id });

    // Auto-create affiliate profile if user is an affiliate but profile doesn't exist
    if (!affiliate && req.user.role === 'affiliate') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);

      affiliate = await Affiliate.create({
        userId: req.user._id,
        code: generateAffiliateCode(user?.name || user?.email || 'affiliate'),
        status: 'active',
      });

      logger.info(`Auto-created affiliate profile for user ${req.user._id}: ${affiliate.code}`);
    }

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate profile not found' },
      });
    }

    // Initialize preferences if not exists
    if (!affiliate.preferences) {
      affiliate.preferences = {};
    }

    // Update preferences
    if (emailNotifications !== undefined) affiliate.preferences.emailNotifications = emailNotifications;
    if (showEarnings !== undefined) affiliate.preferences.showEarnings = showEarnings;
    if (soundEnabled !== undefined) affiliate.preferences.soundEnabled = soundEnabled;
    if (weeklyReports !== undefined) affiliate.preferences.weeklyReports = weeklyReports;
    if (monthlyReports !== undefined) affiliate.preferences.monthlyReports = monthlyReports;
    if (promotionalEmails !== undefined) affiliate.preferences.promotionalEmails = promotionalEmails;
    if (currency !== undefined) affiliate.preferences.currency = currency;
    if (language !== undefined) affiliate.preferences.language = language;

    await affiliate.save();

    logger.info(`Preferences updated for affiliate: ${affiliate.code}`);

    res.json({
      success: true,
      data: {
        preferences: affiliate.preferences,
        message: 'Preferences updated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};