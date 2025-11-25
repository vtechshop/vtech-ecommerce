// FILE: apps/api/src/controllers/adPlacementController.js
const AdCampaign = require('../models/AdCampaign');
const Setting = require('../models/Setting');

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

    // Build query - now filter directly by placement field
    const now = new Date();
    const query = {
      status: 'active',
      placement: placement, // Direct placement matching
      startAt: { $lte: now },
      $or: [
        { endAt: { $gte: now } },
        { endAt: null }
      ]
    };

    // Find active campaigns matching placement
    const campaigns = await AdCampaign.find(query)
      .sort({ bid: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Format ads data
    const ads = campaigns.map(campaign => ({
      _id: campaign._id,
      name: campaign.name,
      type: campaign.type,
      bannerImage: campaign.bannerImage,
      targetUrl: campaign.targetUrl || '#',
      position: campaign.position,
      bannerSize: campaign.bannerSize,
      targeting: campaign.targeting,
      bid: campaign.bid,
      pricing: campaign.pricing
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
 * Get active ad for specific placement
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

    // Find active campaigns for this placement
    const now = new Date();
    const campaigns = await AdCampaign.find({
      status: 'active',
      placement: placement,
      startAt: { $lte: now },
      $or: [
        { endAt: { $gte: now } },
        { endAt: null }
      ]
    })
      .sort({ bid: -1, createdAt: -1 })
      .limit(1);

    if (campaigns.length === 0) {
      return res.json({ success: true, data: null, message: 'No active campaigns for this placement' });
    }

    const campaign = campaigns[0];

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
exports.trackImpression = async (req, res) => {
  try {
    const { id } = req.params;
    const { placement } = req.body;

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
exports.trackClick = async (req, res) => {
  try {
    const { id } = req.params;
    const { placement } = req.body;

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

