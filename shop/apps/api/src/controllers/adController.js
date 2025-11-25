// FILE: apps/api/src/controllers/adController.js
const AdCampaign = require('../models/AdCampaign');
const AdCreative = require('../models/AdCreative');
const AdEvent = require('../models/AdEvent');
const AdWallet = require('../models/AdWallet');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const { getPaginationMeta } = require('../utils/helpers');
const logger = require('../config/logger');
const crypto = require('crypto');

// Get campaigns
exports.getCampaigns = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    let query = {};

    // If user is admin, show all campaigns
    if (req.user && req.user.role === 'admin') {
      // Admin can see all campaigns
      if (status) query.status = status;
    } else {
      // Vendors only see their own campaigns
      const vendor = await Vendor.findOne({ userId: req.user._id });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Vendor profile not found',
          },
        });
      }

      query = { vendorId: vendor._id };
      if (status) query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [campaigns, total] = await Promise.all([
      AdCampaign.find(query)
        .populate('vendorId', 'businessName email')
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

// Create campaign
exports.createCampaign = async (req, res, next) => {
  try {
    let vendorId;

    // Admin can create campaign for any vendor
    if (req.user.role === 'admin') {
      // Admin must provide vendorId in request body
      if (!req.body.vendorId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'vendorId is required for admin to create campaigns',
          },
        });
      }
      vendorId = req.body.vendorId;
    } else {
      // Vendors create campaigns for themselves
      const vendor = await Vendor.findOne({ userId: req.user._id });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Vendor profile not found',
          },
        });
      }

      vendorId = vendor._id;

      // Check wallet balance for vendors (admin bypasses this check)
      const wallet = await AdWallet.findOne({ vendorId: vendor._id });
      const env = require('../config/env');
      const minBudget = env.AD_BUDGET_MIN || 100;

      if (!wallet || wallet.balance < minBudget) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_BALANCE',
            message: `Minimum balance of ${minBudget} required`,
          },
        });
      }
    }

    const campaign = await AdCampaign.create({
      ...req.body,
      vendorId: vendorId,
      status: req.body.status || 'draft', // Admin can set status directly
    });

    logger.info(`Ad campaign created: ${campaign.name}`);

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

// Get campaign by ID
exports.getCampaignById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = { _id: id };

    // If user is NOT admin, restrict to their own campaigns
    if (req.user.role !== 'admin') {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Vendor profile not found',
          },
        });
      }
      query.vendorId = vendor._id;
    }

    const campaign = await AdCampaign.findOne(query).populate('vendorId', 'businessName email');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found',
        },
      });
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

// Update campaign
exports.updateCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = { _id: id };

    // If user is NOT admin, restrict to their own campaigns
    if (req.user.role !== 'admin') {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (!vendor) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Vendor profile not found',
          },
        });
      }
      query.vendorId = vendor._id;
    }

    const campaign = await AdCampaign.findOne(query);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found',
        },
      });
    }

    // Admin can override vendorId if provided in request
    if (req.user.role === 'admin' && req.body.vendorId) {
      campaign.vendorId = req.body.vendorId;
    }

    Object.assign(campaign, req.body);
    await campaign.save();

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

// Delete campaign
exports.deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = { _id: id };

    // Admin can delete any campaign
    if (req.user.role === 'admin') {
      // Admin can delete any campaign (no restriction on status)
      const campaign = await AdCampaign.findByIdAndDelete(id);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Campaign not found',
          },
        });
      }

      logger.info(`Ad campaign deleted by admin: ${campaign.name}`);

      return res.json({
        success: true,
        message: 'Campaign deleted successfully',
      });
    }

    // Vendors can only delete their own draft campaigns
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Vendor profile not found',
        },
      });
    }

    const campaign = await AdCampaign.findOneAndDelete({
      _id: id,
      vendorId: vendor._id,
      status: 'draft', // Vendors can only delete draft campaigns
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found or cannot be deleted (only draft campaigns can be deleted)',
        },
      });
    }

    logger.info(`Ad campaign deleted: ${campaign.name}`);

    res.json({
      success: true,
      data: { message: 'Campaign deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};

// Get creatives
exports.getCreatives = async (req, res, next) => {
  try {
    const { campaignId } = req.params;

    const vendor = await Vendor.findOne({ userId: req.user._id });

    const campaign = await AdCampaign.findOne({
      _id: campaignId,
      vendorId: vendor._id,
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found',
        },
      });
    }

    const creatives = await AdCreative.find({ campaignId })
      .populate('productId', 'title images price')
      .lean();

    res.json({
      success: true,
      data: creatives,
    });
  } catch (error) {
    next(error);
  }
};

// Create creative
exports.createCreative = async (req, res, next) => {
  try {
    const { campaignId } = req.params;

    const vendor = await Vendor.findOne({ userId: req.user._id });

    const campaign = await AdCampaign.findOne({
      _id: campaignId,
      vendorId: vendor._id,
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found',
        },
      });
    }

    const creative = await AdCreative.create({
      ...req.body,
      campaignId,
    });

    res.status(201).json({
      success: true,
      data: creative,
    });
  } catch (error) {
    next(error);
  }
};

// Run auction (public - returns ads to display)
exports.runAuction = async (req, res, next) => {
  try {
    const {
      placement,
      keywords = [],
      categories = [],
      products = [],
      limit = 3,
    } = req.body;

    // Find eligible campaigns
    const now = new Date();
    const query = {
      status: 'active',
      startAt: { $lte: now },
      $or: [{ endAt: { $gte: now } }, { endAt: null }],
    };

    // Match by targeting
    if (keywords.length > 0) {
      query['targeting.keywords.keyword'] = { $in: keywords };
    }
    if (categories.length > 0) {
      query['targeting.categories'] = { $in: categories };
    }
    if (products.length > 0) {
      query['targeting.products'] = { $in: products };
    }

    const campaigns = await AdCampaign.find(query).lean();

    // Filter campaigns that can serve (budget check)
    const eligibleCampaigns = [];
    for (const campaign of campaigns) {
      const canServe = await AdCampaign.findById(campaign._id);
      if (canServe.canServe()) {
        eligibleCampaigns.push(campaign);
      }
    }

    if (eligibleCampaigns.length === 0) {
      return res.json({
        success: true,
        data: { ads: [] },
      });
    }

    // Get creatives for eligible campaigns
    const creativePromises = eligibleCampaigns.map(c =>
      AdCreative.find({
        campaignId: c._id,
        placement,
        status: 'active',
      })
        .populate('productId')
        .lean()
    );

    const creativesArrays = await Promise.all(creativePromises);
    const allCreatives = creativesArrays.flat();

    // Run auction: rank by bid × qualityScore
    const rankedCreatives = allCreatives.map(creative => {
      const campaign = eligibleCampaigns.find(c => c._id.toString() === creative.campaignId.toString());
      const score = campaign.bid * creative.qualityScore;
      return { ...creative, campaign, auctionScore: score };
    });

    rankedCreatives.sort((a, b) => b.auctionScore - a.auctionScore);

    // Return top N
    const winners = rankedCreatives.slice(0, limit).map(c => ({
      campaignId: c.campaignId,
      creativeId: c._id,
      product: c.productId,
      headline: c.headline,
      description: c.description,
      placement: c.placement,
      bannerImage: c.campaign.bannerImage, // Campaign banner image
      bannerAsset: c.bannerAsset, // Include banner asset for custom ad images
      url: c.productId ? `/product/${c.productId.slug}?ad_campaign=${c.campaignId}&ad_creative=${c._id}` : c.bannerAsset?.clickUrl,
    }));

    res.json({
      success: true,
      data: { ads: winners },
    });
  } catch (error) {
    next(error);
  }
};

// Track ad event (public)
exports.trackEvent = async (req, res, next) => {
  try {
    const { campaignId, creativeId, event, url, orderId, revenue } = req.body;

    const sessionId = req.cookies?.sessionId || crypto.randomBytes(16).toString('hex');
    const ipHash = crypto.createHash('sha256').update(req.ip).digest('hex');
const uaHash = crypto.createHash('sha256').update(req.headers['user-agent'] || '').digest('hex');

// Check for duplicate clicks in session (fraud prevention)
if (event === 'click') {
  const env = require('../config/env');
  const ttlMinutes = env.AD_CLICK_SESSION_TTL_MIN || 30;
  const recentClick = await AdEvent.findOne({
    campaignId,
    creativeId,
    sessionId,
    event: 'click',
    timestamp: { $gte: new Date(Date.now() - ttlMinutes * 60 * 1000) },
  });

  if (recentClick) {
    return res.json({
      success: true,
      data: { tracked: false, reason: 'duplicate_click' },
    });
  }
}

// Get campaign and creative
const [campaign, creative] = await Promise.all([
  AdCampaign.findById(campaignId),
  AdCreative.findById(creativeId),
]);

if (!campaign || !creative) {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Campaign or creative not found',
    },
  });
}

// Calculate cost
let cost = 0;
if (event === 'click' && campaign.pricing === 'CPC') {
  cost = campaign.bid;
} else if (event === 'impression' && campaign.pricing === 'CPM') {
  cost = campaign.bid / 1000;
}

// Check wallet balance
if (cost > 0) {
  const wallet = await AdWallet.findOne({ vendorId: campaign.vendorId });
  if (!wallet || wallet.balance < cost) {
    campaign.status = 'budget_exhausted';
    await campaign.save();
    
    return res.json({
      success: true,
      data: { tracked: false, reason: 'insufficient_balance' },
    });
  }

  // Deduct from wallet
  wallet.addTransaction('spend', cost, `Ad ${event}`, campaign._id.toString(), campaign._id);
  await wallet.save();

  // Update campaign daily spend
  const today = new Date().toISOString().split('T')[0];
  if (campaign.dailySpend.date?.toISOString().split('T')[0] !== today) {
    campaign.dailySpend.date = new Date();
    campaign.dailySpend.amount = 0;
  }
  campaign.dailySpend.amount += cost;

  // Check if daily budget exhausted
  if (campaign.dailySpend.amount >= campaign.dailyBudget) {
    campaign.status = 'budget_exhausted';
  }

  // Update campaign stats
  campaign.stats.spend += cost;
  await campaign.save();
}

// Track event
const adEvent = await AdEvent.create({
  campaignId,
  creativeId,
  userId: req.user?._id,
  sessionId,
  event,
  url,
  ipHash,
  uaHash,
  deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
  orderId,
  revenue,
  cost,
});

// Update stats
if (event === 'impression') {
  campaign.stats.impressions += 1;
  creative.stats.impressions += 1;
} else if (event === 'click') {
  campaign.stats.clicks += 1;
  creative.stats.clicks += 1;
} else if (event === 'conversion') {
  campaign.stats.conversions += 1;
  campaign.stats.revenue += revenue || 0;
  creative.stats.conversions += 1;
  
  // Update quality score based on conversion
  creative.qualityScore = Math.min(10, creative.qualityScore + 0.1);
}

campaign.stats.lastUpdated = new Date();
await Promise.all([campaign.save(), creative.save()]);

// Set session cookie
if (!req.cookies?.sessionId) {
  res.cookie('sessionId', sessionId, {
    maxAge: 30 * 60 * 1000, // 30 minutes
    httpOnly: true,
  });
}

logger.info(`Ad event tracked: ${event} - Campaign: ${campaignId}`);

res.json({
  success: true,
  data: { tracked: true },
});
} catch (error) {
next(error);
}
};
// Get campaign report
exports.getCampaignReport = async (req, res, next) => {
try {
const { id } = req.params;
const { startDate, endDate } = req.query;
const vendor = await Vendor.findOne({ userId: req.user._id });

const campaign = await AdCampaign.findOne({
  _id: id,
  vendorId: vendor._id,
});

if (!campaign) {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Campaign not found',
    },
  });
}

// Build event query
const eventQuery = { campaignId: campaign._id };
if (startDate || endDate) {
  eventQuery.timestamp = {};
  if (startDate) eventQuery.timestamp.$gte = new Date(startDate);
  if (endDate) eventQuery.timestamp.$lte = new Date(endDate);
}

// Aggregate event data
const events = await AdEvent.aggregate([
  { $match: eventQuery },
  {
    $group: {
      _id: '$event',
      count: { $sum: 1 },
      totalCost: { $sum: '$cost' },
      totalRevenue: { $sum: '$revenue' },
    },
  },
]);

const report = {
  campaignName: campaign.name,
  impressions: events.find(e => e._id === 'impression')?.count || 0,
  clicks: events.find(e => e._id === 'click')?.count || 0,
  conversions: events.find(e => e._id === 'conversion')?.count || 0,
  spend: events.reduce((sum, e) => sum + e.totalCost, 0),
  revenue: events.reduce((sum, e) => sum + e.totalRevenue, 0),
};

report.ctr = report.impressions > 0 ? ((report.clicks / report.impressions) * 100).toFixed(2) : 0;
report.cpc = report.clicks > 0 ? (report.spend / report.clicks).toFixed(2) : 0;
report.cpm = report.impressions > 0 ? ((report.spend / report.impressions) * 1000).toFixed(2) : 0;
report.conversionRate = report.clicks > 0 ? ((report.conversions / report.clicks) * 100).toFixed(2) : 0;
report.roas = report.spend > 0 ? (report.revenue / report.spend).toFixed(2) : 0;
report.acos = report.revenue > 0 ? ((report.spend / report.revenue) * 100).toFixed(2) : 0;

res.json({
  success: true,
  data: report,
});
} catch (error) {
next(error);
}
};
// Get wallet
exports.getWallet = async (req, res, next) => {
try {
const vendor = await Vendor.findOne({ userId: req.user._id });
if (!vendor) {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Vendor profile not found',
    },
  });
}

let wallet = await AdWallet.findOne({ vendorId: vendor._id });

if (!wallet) {
  wallet = await AdWallet.create({ vendorId: vendor._id });
}

res.json({
  success: true,
  data: wallet,
});
} catch (error) {
next(error);
}
};
// Recharge wallet
exports.rechargeWallet = async (req, res, next) => {
try {
const { amount } = req.body;
const vendor = await Vendor.findOne({ userId: req.user._id });

if (!vendor) {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Vendor profile not found',
    },
  });
}

let wallet = await AdWallet.findOne({ vendorId: vendor._id });

if (!wallet) {
  wallet = await AdWallet.create({ vendorId: vendor._id });
}

// In production, process payment here
// For now, just add the balance

const paymentRef = 'PAY-' + Date.now();
wallet.addTransaction('recharge', amount, 'Wallet recharge', paymentRef);
await wallet.save();

logger.info(`Ad wallet recharged: ${vendor.storeName} - ${amount}`);

res.json({
  success: true,
  data: wallet,
});
} catch (error) {
next(error);
}
};
// Get wallet transactions
exports.getWalletTransactions = async (req, res, next) => {
try {
const { page = 1, limit = 20 } = req.query;
const vendor = await Vendor.findOne({ userId: req.user._id });

const wallet = await AdWallet.findOne({ vendorId: vendor._id });

if (!wallet) {
  return res.json({
    success: true,
    data: [],
    meta: getPaginationMeta(0, 1, 20),
  });
}

const skip = (parseInt(page) - 1) * parseInt(limit);
const transactions = wallet.transactions
  .sort((a, b) => b.timestamp - a.timestamp)
  .slice(skip, skip + parseInt(limit));

res.json({
  success: true,
  data: transactions,
  meta: getPaginationMeta(wallet.transactions.length, parseInt(page), parseInt(limit)),
});
} catch (error) {
next(error);
}
};