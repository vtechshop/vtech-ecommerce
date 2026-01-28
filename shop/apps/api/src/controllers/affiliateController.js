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

    const stats = {
      totalClicks: affiliate.totalClicks,
      totalConversions: affiliate.totalConversions,
      conversionRate: affiliate.totalClicks > 0
        ? ((affiliate.totalConversions / affiliate.totalClicks) * 100).toFixed(2)
        : 0,
      totalEarnings: affiliate.totalEarnings,
      pendingEarnings: affiliate.pendingEarnings,
      paidEarnings: affiliate.paidEarnings,
      // Include status info for frontend
      status: affiliate.status,
      kycStatus: affiliate.kyc?.status || 'pending',
      code: affiliate.code,
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
        description: 'Homepage link',
      },
      {
        type: 'search',
        url: `${baseUrl}/search?affId=${affiliate.code}`,
        description: 'Search page link',
      },
      {
        type: 'product',
        url: `${baseUrl}/product/[slug]?affId=${affiliate.code}`,
        description: 'Product page link (replace [slug] with actual product slug)',
      },
    ];

    res.json({
      success: true,
      data: {
        code: affiliate.code,
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
    const { page = 1, limit = 20, status } = req.query;

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

    // If KYC was rejected and user is updating, reset to pending
    if (affiliate.kyc.status === 'rejected') {
      affiliate.kyc.status = 'pending';
      affiliate.kyc.rejectionReason = undefined;
    }

    await affiliate.save();

    logger.info(`KYC updated for affiliate: ${affiliate.code}`);

    res.json({
      success: true,
      data: {
        kyc: affiliate.kyc,
        message: 'KYC information updated successfully',
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