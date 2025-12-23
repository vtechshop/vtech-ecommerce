// FILE: apps/api/src/controllers/adminAdsController.js
const AdCampaign = require('../models/AdCampaign');
const AdPricingSettings = require('../models/AdPricingSettings');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const { getPaginationMeta } = require('../utils/helpers');
const logger = require('../config/logger');

// ==================== PRICING SETTINGS ====================

// Get all pricing settings
exports.getPricingSettings = async (req, res, next) => {
  try {
    const settings = await AdPricingSettings.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// Get pricing settings by placement
exports.getPricingSettingByPlacement = async (req, res, next) => {
  try {
    const { placement } = req.params;

    const setting = await AdPricingSettings.findOne({ placement });

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Pricing settings not found for this placement',
        },
      });
    }

    res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

// Create or update pricing settings
exports.upsertPricingSettings = async (req, res, next) => {
  try {
    const {
      placement,
      displayName,
      description,
      pricingType,
      minBid,
      maxBid,
      recommendedBid,
      floorPrice,
      dailyBudgetMin,
      qualityScoreEnabled,
      qualityScoreWeights,
      auctionType,
      requiresApproval,
      autoApproveThreshold,
      maxCampaignsPerVendor,
      status,
    } = req.body;

    // Validation
    if (minBid > maxBid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Minimum bid cannot be greater than maximum bid',
        },
      });
    }

    if (floorPrice > maxBid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Floor price cannot be greater than maximum bid',
        },
      });
    }

    const setting = await AdPricingSettings.findOneAndUpdate(
      { placement },
      {
        placement,
        displayName,
        description,
        pricingType,
        minBid,
        maxBid,
        recommendedBid,
        floorPrice,
        dailyBudgetMin,
        qualityScoreEnabled,
        qualityScoreWeights,
        auctionType,
        requiresApproval,
        autoApproveThreshold,
        maxCampaignsPerVendor,
        status,
        updatedBy: req.user._id,
      },
      { upsert: true, new: true, runValidators: true }
    );

    logger.info(`Ad pricing settings updated for placement: ${placement} by admin ${req.user.email}`);

    res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

// Initialize default pricing settings
exports.initializeDefaultPricingSettings = async (req, res, next) => {
  try {
    const defaultSettings = [
      {
        placement: 'homepage_banner',
        displayName: 'Homepage Banner',
        description: 'Large banner at the top of homepage - Premium placement',
        pricingType: 'CPM',
        minBid: 100,
        maxBid: 500,
        recommendedBid: 250,
        floorPrice: 150,
        dailyBudgetMin: 1000,
      },
      {
        placement: 'search_sponsored_products',
        displayName: 'Search Sponsored Products',
        description: 'Sponsored products in search results',
        pricingType: 'CPC',
        minBid: 5,
        maxBid: 50,
        recommendedBid: 15,
        floorPrice: 8,
        dailyBudgetMin: 500,
      },
      {
        placement: 'category_top_banner',
        displayName: 'Category Top Banner',
        description: 'Banner at the top of category pages',
        pricingType: 'CPM',
        minBid: 50,
        maxBid: 300,
        recommendedBid: 150,
        floorPrice: 75,
        dailyBudgetMin: 750,
      },
      {
        placement: 'product_sidebar',
        displayName: 'Product Page Sidebar',
        description: 'Sidebar ad on product detail pages',
        pricingType: 'CPC',
        minBid: 3,
        maxBid: 30,
        recommendedBid: 10,
        floorPrice: 5,
        dailyBudgetMin: 300,
      },
    ];

    const created = [];
    for (const setting of defaultSettings) {
      const existing = await AdPricingSettings.findOne({ placement: setting.placement });
      if (!existing) {
        const newSetting = await AdPricingSettings.create({
          ...setting,
          createdBy: req.user._id,
        });
        created.push(newSetting);
      }
    }

    res.json({
      success: true,
      message: `Initialized ${created.length} default pricing settings`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== CAMPAIGN MANAGEMENT ====================

// Get all campaigns (admin view)
exports.getAllCampaigns = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, approvalStatus, vendorId } = req.query;

    const query = {};

    if (status) query.status = status;
    if (approvalStatus) query['approval.status'] = approvalStatus;
    if (vendorId) query.vendorId = vendorId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [campaigns, total] = await Promise.all([
      AdCampaign.find(query)
        .populate('vendorId', 'storeName email businessName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AdCampaign.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: campaigns,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get campaigns pending approval
exports.getPendingCampaigns = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Get all campaigns with approval.status === 'pending' regardless of campaign status
    const query = {
      'approval.status': 'pending',
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [campaigns, total] = await Promise.all([
      AdCampaign.find(query)
        .populate('vendorId', 'storeName email businessName')
        .populate('targeting.products', 'title images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AdCampaign.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: campaigns,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Approve campaign
exports.approveCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const campaign = await AdCampaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found',
        },
      });
    }

    // Update campaign
    campaign.status = 'approved';
    campaign.approval = {
      status: 'approved',
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      adminNotes: adminNotes || '',
    };

    // Calculate auction score
    campaign.calculateAuctionScore();

    await campaign.save();

    logger.info(`Campaign ${campaign._id} approved by admin ${req.user.email}`);

    // Populate vendor info for response
    await campaign.populate('vendorId', 'storeName email');

    res.json({
      success: true,
      data: campaign,
      message: 'Campaign approved successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Reject campaign
exports.rejectCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Rejection reason is required',
        },
      });
    }

    const campaign = await AdCampaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found',
        },
      });
    }

    // Update campaign
    campaign.status = 'rejected';
    campaign.approval = {
      status: 'rejected',
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      rejectionReason,
      adminNotes: adminNotes || '',
    };

    await campaign.save();

    logger.info(`Campaign ${campaign._id} rejected by admin ${req.user.email}: ${rejectionReason}`);

    // Populate vendor info for response
    await campaign.populate('vendorId', 'storeName email');

    res.json({
      success: true,
      data: campaign,
      message: 'Campaign rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Pause campaign (admin override)
exports.pauseCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const campaign = await AdCampaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found',
        },
      });
    }

    campaign.status = 'paused';
    if (reason) {
      campaign.approval.adminNotes = (campaign.approval.adminNotes || '') + `\n[Paused by admin]: ${reason}`;
    }

    await campaign.save();

    logger.info(`Campaign ${campaign._id} paused by admin ${req.user.email}`);

    res.json({
      success: true,
      data: campaign,
      message: 'Campaign paused successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get campaign stats summary
exports.getCampaignStatsSummary = async (req, res, next) => {
  try {
    const [
      totalCampaigns,
      activeCampaigns,
      pendingCampaigns,
      approvedCampaigns,
      rejectedCampaigns,
      totalSpend,
      totalRevenue,
    ] = await Promise.all([
      AdCampaign.countDocuments(),
      AdCampaign.countDocuments({ status: 'active' }),
      AdCampaign.countDocuments({ 'approval.status': 'pending' }),
      AdCampaign.countDocuments({ 'approval.status': 'approved' }),
      AdCampaign.countDocuments({ 'approval.status': 'rejected' }),
      AdCampaign.aggregate([
        { $group: { _id: null, total: { $sum: '$stats.spend' } } },
      ]),
      AdCampaign.aggregate([
        { $group: { _id: null, total: { $sum: '$stats.revenue' } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total: totalCampaigns,
        active: activeCampaigns,
        pending: pendingCampaigns,
        approved: approvedCampaigns,
        rejected: rejectedCampaigns,
        totalSpend: totalSpend[0]?.total || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
