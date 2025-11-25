// FILE: apps/api/src/services/affiliateService.js
const Affiliate = require('../models/Affiliate');
const AffiliateLink = require('../models/AffiliateLink');
const Commission = require('../models/Commission');
const User = require('../models/User');
const Product = require('../models/Product');
const logger = require('../config/logger');

class AffiliateService {
  async trackClick(affiliateCode, metadata = {}) {
    const affiliate = await Affiliate.findOne({ code: affiliateCode, status: 'active' });

    if (!affiliate) {
      return { tracked: false, reason: 'invalid_code' };
    }

    // Increment click count
    affiliate.totalClicks += 1;
    await affiliate.save();

    logger.info(`Affiliate click tracked: ${affiliateCode}`);

    return {
      tracked: true,
      affiliateId: affiliate._id,
      code: affiliateCode,
    };
  }

  async trackConversion(userId, orderId, orderAmount) {
    const user = await User.findById(userId);

    if (!user?.affiliateCode) {
      return null;
    }

    const affiliate = await Affiliate.findOne({
      code: user.affiliateCode,
      status: 'active',
    });

    if (!affiliate) {
      return null;
    }

    // Calculate commission
    const commissionAmount = (orderAmount * affiliate.commissionPercentage) / 100;

    // Create commission record
    const commission = await Commission.create({
      orderId,
      subjectId: affiliate._id,
      type: 'affiliate',
      amount: commissionAmount,
      percentage: affiliate.commissionPercentage,
      status: 'pending',
    });

    // Update affiliate stats
    affiliate.totalConversions += 1;
    affiliate.pendingEarnings += commissionAmount;
    await affiliate.save();

    logger.info(`Affiliate conversion tracked: ${affiliate.code} - ${commissionAmount}`);

    return commission;
  }

  async calculateConversionRate(affiliateId) {
    const affiliate = await Affiliate.findById(affiliateId);
    if (!affiliate || affiliate.totalClicks === 0) return 0;

    return (affiliate.totalConversions / affiliate.totalClicks) * 100;
  }

  async getTopAffiliates(limit = 10) {
    const affiliates = await Affiliate.find({ status: 'active' })
      .sort({ totalEarnings: -1 })
      .limit(limit)
      .populate('userId', 'name email')
      .lean();

    return affiliates;
  }

  /**
   * Generate a product-specific affiliate link
   * @param {String} affiliateId - Affiliate ObjectId
   * @param {String} productId - Product ObjectId (null for store-wide link)
   * @param {Number} customCommissionRate - Optional custom commission rate
   */
  async generateProductLink(affiliateId, productId = null, customCommissionRate = null) {
    // Verify affiliate exists and is active
    const affiliate = await Affiliate.findById(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }
    if (affiliate.status !== 'active') {
      throw new Error('Affiliate is not active');
    }

    // If productId provided, verify product exists
    let product = null;
    if (productId) {
      product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }
    }

    // Check if link already exists
    const existingLink = await AffiliateLink.findOne({
      affiliateId,
      productId: productId || null
    });

    if (existingLink) {
      return existingLink;
    }

    // Generate unique link code
    const linkCode = await AffiliateLink.generateLinkCode();

    // Generate URL
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const url = productId
      ? `${baseUrl}/product/${product.slug}?ref=${linkCode}`
      : `${baseUrl}?ref=${linkCode}`;

    // Create affiliate link
    const affiliateLink = await AffiliateLink.create({
      affiliateId,
      productId: productId || null,
      linkCode,
      url,
      customCommissionRate,
      isActive: true,
    });

    logger.info(`Generated affiliate link: ${linkCode} for affiliate ${affiliateId}`);

    return affiliateLink;
  }

  /**
   * Get all links for an affiliate
   */
  async getAffiliateLinks(affiliateId, includeInactive = false) {
    const query = { affiliateId };
    if (!includeInactive) {
      query.isActive = true;
    }

    const links = await AffiliateLink.find(query)
      .populate('productId', 'title slug images price')
      .sort({ createdAt: -1 })
      .lean();

    return links;
  }

  /**
   * Track click on a product-specific affiliate link
   */
  async trackProductLinkClick(linkCode, metadata = {}) {
    const link = await AffiliateLink.findOne({ linkCode, isActive: true });

    if (!link) {
      return { tracked: false, reason: 'invalid_link' };
    }

    // Increment click count on link
    link.clicks += 1;
    await link.save();

    // Also increment total clicks on affiliate
    await Affiliate.findByIdAndUpdate(link.affiliateId, {
      $inc: { totalClicks: 1 }
    });

    logger.info(`Product link click tracked: ${linkCode}`);

    return {
      tracked: true,
      affiliateId: link.affiliateId,
      productId: link.productId,
      linkCode,
    };
  }

  /**
   * Delete/deactivate an affiliate link
   */
  async deleteAffiliateLink(linkId) {
    const link = await AffiliateLink.findById(linkId);
    if (!link) {
      throw new Error('Link not found');
    }

    // Soft delete - deactivate instead of removing
    link.isActive = false;
    await link.save();

    logger.info(`Deactivated affiliate link: ${linkId}`);
    return link;
  }
}

module.exports = new AffiliateService();