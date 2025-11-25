// FILE: apps/api/src/controllers/communicationController.js
const Communication = require('../models/Communication');
const { getPaginationMeta } = require('../utils/helpers');
const logger = require('../config/logger');

// Get all communications (Admin only)
exports.getAllCommunications = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,           // whatsapp, email, sms, marketing
      status,         // pending, sent, delivered, failed
      direction,      // incoming, outgoing
      search,         // search in message, from, to
      startDate,
      endDate,
    } = req.query;

    // Build query
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (direction) query.direction = direction;

    // Date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search
    if (search) {
      query.$or = [
        { message: new RegExp(search, 'i') },
        { from: new RegExp(search, 'i') },
        { to: new RegExp(search, 'i') },
        { fromName: new RegExp(search, 'i') },
        { toName: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [communications, total] = await Promise.all([
      Communication.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Communication.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: communications,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get communication statistics
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalCount,
      byType,
      byStatus,
      recentCount,
      failedCount,
    ] = await Promise.all([
      Communication.countDocuments(),
      Communication.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Communication.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Communication.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      Communication.countDocuments({ status: 'failed' }),
    ]);

    res.json({
      success: true,
      data: {
        total: totalCount,
        recent24h: recentCount,
        failed: failedCount,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single communication
exports.getCommunicationById = async (req, res, next) => {
  try {
    const communication = await Communication.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('replyTo')
      .lean();

    if (!communication) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Communication not found' },
      });
    }

    res.json({ success: true, data: communication });
  } catch (error) {
    next(error);
  }
};

// Create new communication (for sending messages)
exports.createCommunication = async (req, res, next) => {
  try {
    const communication = await Communication.create(req.body);
    logger.info(`Communication created: ${communication.type} - ${communication.to}`);

    res.status(201).json({ success: true, data: communication });
  } catch (error) {
    next(error);
  }
};

// Update communication (e.g., mark as read, add notes)
exports.updateCommunication = async (req, res, next) => {
  try {
    const communication = await Communication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!communication) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Communication not found' },
      });
    }

    logger.info(`Communication updated: ${communication._id}`);
    res.json({ success: true, data: communication });
  } catch (error) {
    next(error);
  }
};

// Delete communication
exports.deleteCommunication = async (req, res, next) => {
  try {
    const communication = await Communication.findByIdAndDelete(req.params.id);

    if (!communication) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Communication not found' },
      });
    }

    logger.info(`Communication deleted: ${communication._id}`);
    res.json({ success: true, data: { message: 'Communication deleted' } });
  } catch (error) {
    next(error);
  }
};

// Send WhatsApp message
exports.sendWhatsApp = async (req, res, next) => {
  try {
    const { to, toName, message, userId, metadata } = req.body;

    // Create communication record
    const communication = await Communication.create({
      type: 'whatsapp',
      direction: 'outgoing',
      from: process.env.SUPPORT_PHONE || '+919944556683',
      fromName: 'Vtech Support',
      to,
      toName,
      message,
      userId,
      metadata,
      status: 'pending',
    });

    // TODO: Integrate with WhatsApp Business API
    // Example: await whatsappService.sendMessage(to, message);

    communication.status = 'sent';
    communication.sentAt = new Date();
    await communication.save();

    logger.info(`WhatsApp sent to: ${to}`);
    res.json({ success: true, data: communication });
  } catch (error) {
    next(error);
  }
};

// Send Email
exports.sendEmail = async (req, res, next) => {
  try {
    const { to, toName, subject, message, htmlContent, userId, attachments, metadata } = req.body;

    const communication = await Communication.create({
      type: 'email',
      direction: 'outgoing',
      from: process.env.ADMIN_EMAIL || 'ledvtech@gmail.com',
      fromName: 'Vtech',
      to,
      toName,
      subject,
      message,
      htmlContent,
      userId,
      attachments,
      metadata,
      status: 'pending',
    });

    // TODO: Integrate with email service (NodeMailer, SendGrid, etc.)
    // Example: await emailService.send({ to, subject, html: htmlContent });

    communication.status = 'sent';
    communication.sentAt = new Date();
    await communication.save();

    logger.info(`Email sent to: ${to}`);
    res.json({ success: true, data: communication });
  } catch (error) {
    next(error);
  }
};

// Send SMS
exports.sendSMS = async (req, res, next) => {
  try {
    const { to, toName, message, userId, metadata } = req.body;

    const communication = await Communication.create({
      type: 'sms',
      direction: 'outgoing',
      from: process.env.SUPPORT_PHONE || '+919944556683',
      fromName: 'Vtech',
      to,
      toName,
      message,
      userId,
      metadata,
      status: 'pending',
    });

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    // Example: await smsService.send(to, message);

    communication.status = 'sent';
    communication.sentAt = new Date();
    await communication.save();

    logger.info(`SMS sent to: ${to}`);
    res.json({ success: true, data: communication });
  } catch (error) {
    next(error);
  }
};

// Send marketing campaign
exports.sendMarketingCampaign = async (req, res, next) => {
  try {
    const { type, subject, message, htmlContent, recipients, campaignId } = req.body;

    const communications = [];

    for (const recipient of recipients) {
      const comm = await Communication.create({
        type: 'marketing',
        direction: 'outgoing',
        from: process.env.ADMIN_EMAIL || 'ledvtech@gmail.com',
        fromName: 'LED Vtech Marketing',
        to: recipient.email || recipient.phone,
        toName: recipient.name,
        subject,
        message,
        htmlContent,
        userId: recipient.userId,
        status: 'pending',
        metadata: { campaignId, channel: type },
      });

      communications.push(comm);
    }

    logger.info(`Marketing campaign sent: ${campaignId} - ${communications.length} messages`);
    res.json({
      success: true,
      data: { sent: communications.length, communications }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
