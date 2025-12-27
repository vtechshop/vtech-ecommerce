// FILE: apps/api/src/controllers/adPlacementController.js
const AdCampaign = require('../models/AdCampaign');
const AdCreative = require('../models/AdCreative');
const AdPricingSettings = require('../models/AdPricingSettings');
const AdWallet = require('../models/AdWallet');
const Setting = require('../models/Setting');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');

/**
 * Check if daily spend should be reset (new day)
 * @param {Object} campaign - Campaign object
 * @returns {number} Current daily spend (0 if new day, existing amount if same day)
 */
function getDailySpendAmount(campaign) {
  if (!campaign.dailySpend || !campaign.dailySpend.date) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  const spendDate = new Date(campaign.dailySpend.date);
  spendDate.setHours(0, 0, 0, 0); // Start of spend date

  // If spend date is before today, reset to 0
  if (spendDate < today) {
    return 0;
  }

  // Same day, return existing amount
  return campaign.dailySpend.amount || 0;
}

/**
 * Run auction to select winning ads based on auction score (bid × quality score)
 * @param {Array} campaigns - Array of eligible campaigns
 * @param {Object} pricingSettings - Pricing settings for the placement
 * @param {Number} limit - Number of ads to return
 * @returns {Array} Winning campaigns with calculated actual CPC/CPM
 */
function runAdAuction(campaigns, pricingSettings, limit = 1) {
  if (!campaigns || campaigns.length === 0) return [];

  // Calculate auction score for each campaign
  const scoredCampaigns = campaigns.map(campaign => {
    // Ensure auction score is calculated
    if (!campaign.auctionScore) {
      campaign.auctionScore = campaign.bid * ((campaign.qualityScore?.overall || 5) / 10);
    }
    return campaign;
  });

  // Sort by auction score (descending)
  scoredCampaigns.sort((a, b) => b.auctionScore - a.auctionScore);

  // Select winners
  const winners = scoredCampaigns.slice(0, limit);

  // Apply second-price auction logic (if enabled)
  const auctionType = pricingSettings?.auctionType || 'second_price';

  if (auctionType === 'second_price' && winners.length > 0) {
    winners.forEach((winner, index) => {
      if (index < scoredCampaigns.length - 1) {
        // Winner pays slightly more than the next highest bid
        const nextBid = scoredCampaigns[index + 1]?.bid || winner.bid * 0.9;
        winner.actualCPC = Math.min(winner.bid, nextBid + 0.01);
        winner.actualCPM = Math.min(winner.bid, nextBid + 0.01);
      } else {
        // Last ad pays their full bid
        winner.actualCPC = winner.bid;
        winner.actualCPM = winner.bid;
      }
    });
  } else {
    // First-price auction - pay your bid
    winners.forEach(winner => {
      winner.actualCPC = winner.bid;
      winner.actualCPM = winner.bid;
    });
  }

  return winners;
}

/**
 * GET /ads/sponsored
 * Get sponsored ads for a placement (supports multiple ads)
 */
exports.getSponsoredAds = async (req, res) => {
  try {
    const { placement, limit = 3 } = req.query;

    if (!placement) {
      return res.status(400).json({
        success: false,
        message: 'Placement parameter is required'
      });
    }

    // Get pricing settings for this placement
    const pricingSettings = await AdPricingSettings.findOne({ placement, status: 'active' });

    // Build query - filter for active and approved campaigns
    const now = new Date();
    const query = {
      status: 'active',
      'approval.status': 'approved', // Only approved campaigns
      placement: placement,
      startAt: { $lte: now },
      $or: [
        { endAt: { $gte: now } },
        { endAt: null }
      ]
    };

    // Find eligible campaigns
    let campaigns = await AdCampaign.find(query).lean();

    // Filter campaigns that can actually serve (budget check + wallet balance check)
    const campaignsWithWallet = await Promise.all(campaigns.map(async (campaign) => {
      // Check daily budget (with automatic daily reset)
      const currentDailySpend = getDailySpendAmount(campaign);
      if (currentDailySpend >= campaign.dailyBudget) return null;
      // Check total budget
      if (campaign.totalBudget && campaign.stats?.spend >= campaign.totalBudget) return null;

      // 💰 CHECK WALLET BALANCE (Amazon-style)
      const wallet = await AdWallet.findOne({ vendorId: campaign.vendorId }).lean();
      if (!wallet || wallet.balance <= 0) {
        console.warn(`Campaign ${campaign._id} skipped - no wallet or zero balance`);
        return null;
      }

      // Check if wallet has enough for at least one impression/click
      const minCost = campaign.pricing === 'CPM' ? campaign.bid / 1000 : campaign.bid;
      if (wallet.balance < minCost) {
        console.warn(`Campaign ${campaign._id} skipped - insufficient wallet balance`);
        return null;
      }

      return campaign;
    }));

    campaigns = campaignsWithWallet.filter(c => c !== null);

    // Run auction to select winners
    const winners = runAdAuction(campaigns, pricingSettings, parseInt(limit));

    // Fetch creatives for all winners and format ads data
    const ads = await Promise.all(winners.map(async (campaign) => {
      let bannerImage = campaign.bannerImage;

      try {
        const creative = await AdCreative.findOne({
          campaignId: campaign._id,
          status: 'active'
        }).sort({ createdAt: -1 }).lean();

        if (creative && creative.bannerAsset && creative.bannerAsset.imageUrl) {
          bannerImage = creative.bannerAsset.imageUrl;
        }
      } catch (err) {
        console.error('Error fetching creative:', err);
      }

      return {
        _id: campaign._id,
        name: campaign.name,
        type: campaign.type,
        bannerImage: bannerImage,
        targetUrl: campaign.targetUrl || '#',
        position: campaign.position,
        bannerSize: campaign.bannerSize,
        targeting: campaign.targeting,
        bid: campaign.bid,
        pricing: campaign.pricing,
        qualityScore: campaign.qualityScore?.overall,
        auctionScore: campaign.auctionScore,
      };
    }));

    res.json({
      success: true,
      data: { ads }
    });
  } catch (error) {
    console.error('Get sponsored ads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sponsored ads',
      error: error.message
    });
  }
};

/**
 * GET /ads/placement/:placement
 * Get active ad for specific placement (uses auction algorithm)
 */
exports.getAdForPlacement = async (req, res) => {
  try {
    const { placement } = req.params;

    // Check if ads are globally enabled
    const adsEnabled = await Setting.get('ads.global.enabled', 'true');
    if (adsEnabled !== 'true' && adsEnabled !== true) {
      return res.json({ success: true, data: null, message: 'Ads disabled globally' });
    }

    // Check if this specific placement is enabled
    const placementEnabled = await Setting.get(`ads.placement.${placement}.enabled`, 'true');
    if (placementEnabled !== 'true' && placementEnabled !== true) {
      return res.json({ success: true, data: null, message: 'Ads disabled for this placement' });
    }

    // Get pricing settings for this placement
    const pricingSettings = await AdPricingSettings.findOne({ placement, status: 'active' });

    // Find active and approved campaigns for this placement
    const now = new Date();
    let campaigns = await AdCampaign.find({
      status: 'active',
      'approval.status': 'approved', // Only approved campaigns
      placement: placement,
      startAt: { $lte: now },
      $or: [
        { endAt: { $gte: now } },
        { endAt: null }
      ]
    }).lean();

    // Filter campaigns that can actually serve (budget check + wallet balance check)
    const campaignsWithWallet = await Promise.all(campaigns.map(async (campaign) => {
      // Check daily budget (with automatic daily reset)
      const currentDailySpend = getDailySpendAmount(campaign);
      if (currentDailySpend >= campaign.dailyBudget) return null;
      // Check total budget
      if (campaign.totalBudget && campaign.stats?.spend >= campaign.totalBudget) return null;

      // 💰 CHECK WALLET BALANCE (Amazon-style)
      const wallet = await AdWallet.findOne({ vendorId: campaign.vendorId }).lean();
      if (!wallet || wallet.balance <= 0) {
        console.warn(`Campaign ${campaign._id} skipped - no wallet or zero balance`);
        return null;
      }

      // Check if wallet has enough for at least one impression/click
      const minCost = campaign.pricing === 'CPM' ? campaign.bid / 1000 : campaign.bid;
      if (wallet.balance < minCost) {
        console.warn(`Campaign ${campaign._id} skipped - insufficient wallet balance`);
        return null;
      }

      return campaign;
    }));

    campaigns = campaignsWithWallet.filter(c => c !== null);

    if (campaigns.length === 0) {
      return res.json({ success: true, data: null, message: 'No active campaigns for this placement' });
    }

    // Run auction to select winner
    const winners = runAdAuction(campaigns, pricingSettings, 1);

    if (winners.length === 0) {
      return res.json({ success: true, data: null, message: 'No winning campaign in auction' });
    }

    const campaign = winners[0];

    // Get the first active creative for this campaign if exists
    let bannerImage = campaign.bannerImage;
    try {
      const creative = await AdCreative.findOne({
        campaignId: campaign._id,
        status: 'active'
      }).sort({ createdAt: -1 }).lean();

      if (creative && creative.bannerAsset && creative.bannerAsset.imageUrl) {
        bannerImage = creative.bannerAsset.imageUrl;
      }
    } catch (err) {
      console.error('Error fetching creative:', err);
      // Continue with campaign.bannerImage if creative fetch fails
    }

    // Format response with correct AdCampaign fields
    const adData = {
      _id: campaign._id,
      name: campaign.name,
      type: campaign.type,
      placement: campaign.placement,
      position: campaign.position,
      bannerSize: campaign.bannerSize,
      bannerImage: bannerImage,
      dimensions: campaign.dimensions,
      bid: campaign.bid,
      actualCPC: campaign.actualCPC,
      actualCPM: campaign.actualCPM,
      qualityScore: campaign.qualityScore?.overall,
      auctionScore: campaign.auctionScore,
      status: campaign.status,
      campaignId: campaign._id,
    };

    res.json({
      success: true,
      data: adData
    });
  } catch (error) {
    console.error('Get ad for placement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ad',
      error: error.message
    });
  }
};

/**
 * POST /ads/:id/impression
 * Track ad impression
 */
exports.trackImpression = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { placement } = req.body;

    // SECURITY: Validate id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid campaign ID', 400, 'INVALID_CAMPAIGN_ID'));
    }

    const campaign = await AdCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Increment impressions
    if (!campaign.stats) campaign.stats = {};
    campaign.stats.impressions = (campaign.stats.impressions || 0) + 1;

    // Deduct from budget if CPM-based
    if (campaign.pricing === 'CPM') {
      const costPerImpression = campaign.bid / 1000; // CPM = Cost Per Mille (1000 impressions)
      const cost = costPerImpression;

      campaign.stats.spend = (campaign.stats.spend || 0) + cost;

      // Daily spend with automatic reset
      const currentDailySpend = getDailySpendAmount(campaign);
      const today = new Date();
      campaign.dailySpend = {
        date: today,
        amount: currentDailySpend + cost
      };

      // 💰 DEDUCT FROM VENDOR'S AD WALLET (Amazon-style)
      const wallet = await AdWallet.findOne({ vendorId: campaign.vendorId });
      if (wallet) {
        // Check if wallet has sufficient balance
        if (wallet.balance >= cost) {
          // Deduct from wallet and record transaction
          wallet.addTransaction(
            'spend',
            cost,
            `CPM impression - ${campaign.name}`,
            `impression_${campaign._id}_${Date.now()}`,
            campaign._id
          );
          await wallet.save();
        } else {
          // Insufficient balance - pause campaign
          campaign.status = 'budget_exhausted';
          console.warn(`Campaign ${campaign._id} paused - insufficient wallet balance`);
        }
      }

      // Deactivate if budget exhausted
      if (campaign.dailySpend.amount >= campaign.dailyBudget ||
          (campaign.totalBudget && campaign.stats.spend >= campaign.totalBudget)) {
        campaign.status = 'budget_exhausted';
      }
    }

    await campaign.save();

    res.json({ success: true, message: 'Impression tracked' });
  } catch (error) {
    console.error('Track impression error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track impression',
      error: error.message
    });
  }
};

/**
 * POST /ads/:id/click
 * Track ad click
 */
exports.trackClick = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { placement } = req.body;

    // SECURITY: Validate id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid campaign ID', 400, 'INVALID_CAMPAIGN_ID'));
    }

    const campaign = await AdCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Increment clicks
    if (!campaign.stats) campaign.stats = {};
    campaign.stats.clicks = (campaign.stats.clicks || 0) + 1;

    // Deduct from budget if CPC-based
    if (campaign.pricing === 'CPC') {
      const cost = campaign.bid; // Bid is the cost per click

      campaign.stats.spend = (campaign.stats.spend || 0) + cost;

      // Daily spend with automatic reset
      const currentDailySpend = getDailySpendAmount(campaign);
      const today = new Date();
      campaign.dailySpend = {
        date: today,
        amount: currentDailySpend + cost
      };

      // 💰 DEDUCT FROM VENDOR'S AD WALLET (Amazon-style)
      const wallet = await AdWallet.findOne({ vendorId: campaign.vendorId });
      if (wallet) {
        // Check if wallet has sufficient balance
        if (wallet.balance >= cost) {
          // Deduct from wallet and record transaction
          wallet.addTransaction(
            'spend',
            cost,
            `CPC click - ${campaign.name}`,
            `click_${campaign._id}_${Date.now()}`,
            campaign._id
          );
          await wallet.save();
        } else {
          // Insufficient balance - pause campaign
          campaign.status = 'budget_exhausted';
          console.warn(`Campaign ${campaign._id} paused - insufficient wallet balance`);
        }
      }

      // Deactivate if budget exhausted
      if (campaign.dailySpend.amount >= campaign.dailyBudget ||
          (campaign.totalBudget && campaign.stats.spend >= campaign.totalBudget)) {
        campaign.status = 'budget_exhausted';
      }
    }

    await campaign.save();

    res.json({ success: true, message: 'Click tracked' });
  } catch (error) {
    console.error('Track click error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track click',
      error: error.message
    });
  }
};

/**
 * GET /settings/public
 * Get public settings (non-sensitive settings like ad placements)
 */
exports.getPublicSettings = async (req, res) => {
  try {
    const { category } = req.query;

    const query = { isPublic: true };
    if (category) {
      query.category = category;
    }

    // Also include ad settings regardless of isPublic flag (they're safe to expose)
    const settings = await Setting.find({
      $or: [
        query,
        { category: 'ads' }
      ]
    }).select('key value type category description');

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};

