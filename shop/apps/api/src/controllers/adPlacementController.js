// FILE: apps/api/src/controllers/adPlacementController.js
const AdCampaign = require('../models/AdCampaign');
const AdPricingSettings = require('../models/AdPricingSettings');
const Setting = require('../models/Setting');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');

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

    // Filter campaigns that can actually serve (budget check)
    campaigns = campaigns.filter(campaign => {
      // Check daily budget
      if (campaign.dailySpend?.amount >= campaign.dailyBudget) return false;
      // Check total budget
      if (campaign.totalBudget && campaign.stats?.spend >= campaign.totalBudget) return false;
      return true;
    });

    // Run auction to select winners
    const winners = runAdAuction(campaigns, pricingSettings, parseInt(limit));

    // Format ads data
    const ads = winners.map(campaign => ({
      _id: campaign._id,
      name: campaign.name,
      type: campaign.type,
      bannerImage: campaign.bannerImage,
      targetUrl: campaign.targetUrl || '#',
      position: campaign.position,
      bannerSize: campaign.bannerSize,
      targeting: campaign.targeting,
      bid: campaign.bid,
      pricing: campaign.pricing,
      qualityScore: campaign.qualityScore?.overall,
      auctionScore: campaign.auctionScore,
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

    // Filter campaigns that can actually serve (budget check)
    campaigns = campaigns.filter(campaign => {
      // Check daily budget
      if (campaign.dailySpend?.amount >= campaign.dailyBudget) return false;
      // Check total budget
      if (campaign.totalBudget && campaign.stats?.spend >= campaign.totalBudget) return false;
      return true;
    });

    if (campaigns.length === 0) {
      return res.json({ success: true, data: null, message: 'No active campaigns for this placement' });
    }

    // Run auction to select winner
    const winners = runAdAuction(campaigns, pricingSettings, 1);

    if (winners.length === 0) {
      return res.json({ success: true, data: null, message: 'No winning campaign in auction' });
    }

    const campaign = winners[0];

    // Format response with correct AdCampaign fields
    const adData = {
      _id: campaign._id,
      name: campaign.name,
      type: campaign.type,
      placement: campaign.placement,
      position: campaign.position,
      bannerSize: campaign.bannerSize,
      bannerImage: campaign.bannerImage,
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
      campaign.dailySpend.amount = (campaign.dailySpend.amount || 0) + cost;

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
      campaign.dailySpend.amount = (campaign.dailySpend.amount || 0) + cost;

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

