// FILE: apps/api/src/controllers/newsletterController.js
const Newsletter = require('../models/Newsletter');
const NewsletterCampaign = require('../models/NewsletterCampaign');
const emailService = require('../services/emailService');
const logger = require('../config/logger');
const crypto = require('crypto');

// Subscribe to newsletter (public endpoint)
exports.subscribe = async (req, res, next) => {
  try {
    const { email, name, source = 'website_footer', tags = [] } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Email is required' },
      });
    }

    // Check if already subscribed
    let subscriber = await Newsletter.findOne({ email: email.toLowerCase() });

    if (subscriber) {
      // Re-subscribe if previously unsubscribed
      if (subscriber.status === 'unsubscribed') {
        subscriber.status = 'subscribed';
        subscriber.confirmedAt = new Date();
        subscriber.unsubscribedAt = null;
        await subscriber.save();

        logger.info(`Newsletter re-subscription: ${email}`);
        return res.json({
          success: true,
          message: 'Successfully re-subscribed to newsletter!',
          data: subscriber,
        });
      }

      // Already subscribed
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_SUBSCRIBED', message: 'Email already subscribed' },
      });
    }

    // Create new subscriber
    subscriber = await Newsletter.create({
      email: email.toLowerCase(),
      name,
      source,
      tags,
      status: 'subscribed',
      confirmedAt: new Date(),
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer,
      },
    });

    logger.info(`New newsletter subscription: ${email}`);

    // Send welcome email (non-blocking)
    emailService.sendNewsletterWelcomeEmail(email, subscriber.unsubscribeToken).catch(err => {
      logger.error('Failed to send newsletter welcome email:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter!',
      data: subscriber,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_SUBSCRIBED', message: 'Email already subscribed' },
      });
    }
    next(error);
  }
};

// Unsubscribe from newsletter
exports.unsubscribe = async (req, res, next) => {
  try {
    const { token, email } = req.query;

    let subscriber;
    if (token) {
      subscriber = await Newsletter.findOne({ unsubscribeToken: token });
    } else if (email) {
      subscriber = await Newsletter.findOne({ email: email.toLowerCase() });
    }

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscriber not found' },
      });
    }

    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    logger.info(`Newsletter unsubscribed: ${subscriber.email}`);

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter',
    });
  } catch (error) {
    next(error);
  }
};

// Update preferences
exports.updatePreferences = async (req, res, next) => {
  try {
    const { email, preferences } = req.body;

    const subscriber = await Newsletter.findOne({ email: email.toLowerCase() });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscriber not found' },
      });
    }

    if (preferences.frequency) {
      subscriber.preferences.frequency = preferences.frequency;
    }
    if (preferences.categories) {
      subscriber.preferences.categories = preferences.categories;
    }

    await subscriber.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: subscriber,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all subscribers
exports.getAllSubscribers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, tags, search } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const [subscribers, total] = await Promise.all([
      Newsletter.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Newsletter.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        subscribers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get statistics
exports.getStatistics = async (req, res, next) => {
  try {
    const stats = await Newsletter.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await Newsletter.countDocuments();
    const last30Days = await Newsletter.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    const formattedStats = {
      total,
      last30Days,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
    };

    res.json({ success: true, data: formattedStats });
  } catch (error) {
    next(error);
  }
};

// Admin: Create campaign
exports.createCampaign = async (req, res, next) => {
  try {
    const { name, subject, content, recipients, template, scheduledAt } = req.body;

    if (!name || !subject || !content?.html) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATA', message: 'Name, subject, and HTML content are required' },
      });
    }

    // Count recipients
    let totalCount = 0;
    const query = { status: 'subscribed' };

    if (recipients.targetAudience === 'tags' && recipients.tags?.length) {
      query.tags = { $in: recipients.tags };
    }

    if (recipients.targetAudience === 'all' || recipients.targetAudience === 'tags') {
      totalCount = await Newsletter.countDocuments(query);
    } else if (recipients.targetAudience === 'custom') {
      totalCount = recipients.customEmails?.length || 0;
    }

    const campaign = await NewsletterCampaign.create({
      name,
      subject,
      content,
      recipients: {
        ...recipients,
        totalCount,
      },
      template: template || 'default',
      createdBy: req.user.userId,
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    });

    logger.info(`Newsletter campaign created: ${campaign.name} by admin ${req.user.userId}`);

    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all campaigns
exports.getAllCampaigns = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;

    const [campaigns, total] = await Promise.all([
      NewsletterCampaign.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      NewsletterCampaign.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete subscriber
exports.deleteSubscriber = async (req, res, next) => {
  try {
    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscriber not found' },
      });
    }

    logger.info(`Newsletter subscriber deleted: ${subscriber.email} by admin ${req.user.userId}`);

    res.json({ success: true, message: 'Subscriber deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
