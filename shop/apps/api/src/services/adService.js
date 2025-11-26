// FILE: apps/api/src/services/adService.js
const AdCampaign = require('../models/AdCampaign');
const AdCreative = require('../models/AdCreative');
const AdWallet = require('../models/AdWallet');
const logger = require('../config/logger');

class AdService {
  async runAuction(placement, filters = {}) {
    const now = new Date();

    // Find eligible campaigns
    const query = {
      status: 'active',
      startAt: { $lte: now },
      $or: [{ endAt: { $gte: now } }, { endAt: null }],
    };

    // Apply filters
    if (filters.keywords?.length > 0) {
      query['targeting.keywords.keyword'] = { $in: filters.keywords };
    }
    if (filters.categories?.length > 0) {
      query['targeting.categories'] = { $in: filters.categories };
    }
    if (filters.products?.length > 0) {
      query['targeting.products'] = { $in: filters.products };
    }

    const campaigns = await AdCampaign.find(query).lean();

    // Filter campaigns that can serve
    const eligibleCampaigns = [];
    for (const campaign of campaigns) {
      const canServe = await this.canCampaignServe(campaign);
      if (canServe) {
        eligibleCampaigns.push(campaign);
      }
    }

    if (eligibleCampaigns.length === 0) {
      return [];
    }

    // Get creatives
    const creativePromises = eligibleCampaigns.map((c) =>
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

    // Run auction: rank by bid × quality score
    const rankedCreatives = allCreatives
      .map((creative) => {
        const campaign = eligibleCampaigns.find(
          (c) => c._id.toString() === creative.campaignId.toString()
        );
        // Skip if campaign not found (shouldn't happen but be safe)
        if (!campaign) return null;
        const score = campaign.bid * creative.qualityScore;
        return { ...creative, campaign, auctionScore: score };
      })
      .filter(Boolean); // Remove nulls

    rankedCreatives.sort((a, b) => b.auctionScore - a.auctionScore);

    return rankedCreatives;
  }

  async canCampaignServe(campaign) {
    // Check wallet balance
    const wallet = await AdWallet.findOne({ vendorId: campaign.vendorId });
    if (!wallet || wallet.balance < campaign.bid) {
      return false;
    }

    // Check daily budget
    const today = new Date().toISOString().split('T')[0];
    const dailySpendDate = campaign.dailySpend?.date?.toISOString().split('T')[0];

    if (dailySpendDate === today && (campaign.dailySpend?.amount || 0) >= campaign.dailyBudget) {
      return false;
    }

    return true;
  }

  async calculateROAS(campaignId) {
    const campaign = await AdCampaign.findById(campaignId);
    if (!campaign) return 0;

    const { spend, revenue } = campaign.stats;
    return spend > 0 ? revenue / spend : 0;
  }

  async getTopPerformingAds(vendorId, limit = 5) {
    const campaigns = await AdCampaign.find({ vendorId })
      .sort({ 'stats.conversions': -1 })
      .limit(limit)
      .lean();

    return campaigns;
  }
}

module.exports = new AdService();