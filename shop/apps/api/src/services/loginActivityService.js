// FILE: apps/api/src/services/loginActivityService.js
const LoginActivity = require('../models/LoginActivity');
const UAParser = require('ua-parser-js');

class LoginActivityService {
  /**
   * Parse user agent string to extract device, browser, and OS info
   */
  parseUserAgent(userAgent) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
      device: result.device.type || 'desktop',
      browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
      os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
    };
  }

  /**
   * Log a login activity
   */
  async logActivity(userId, type, req, options = {}) {
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection.remoteAddress;
      const { device, browser, os } = this.parseUserAgent(userAgent);

      const activity = await LoginActivity.create({
        userId,
        type,
        status: options.status || 'success',
        ipAddress,
        userAgent,
        device,
        browser,
        os,
        failureReason: options.failureReason,
        sessionId: options.sessionId,
      });

      return activity;
    } catch (error) {
      console.error('Failed to log login activity:', error);
      // Don't throw - logging failure shouldn't break the login flow
      return null;
    }
  }

  /**
   * Get user's login activities
   */
  async getUserActivities(userId, limit = 50) {
    return LoginActivity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get recent failed login attempts
   */
  async getRecentFailedAttempts(userId, minutesAgo = 30) {
    const since = new Date(Date.now() - minutesAgo * 60 * 1000);
    return LoginActivity.countDocuments({
      userId,
      type: 'failed_login',
      createdAt: { $gte: since },
    });
  }

  /**
   * Get active sessions count
   */
  async getActiveSessionsCount(userId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return LoginActivity.countDocuments({
      userId,
      type: 'login',
      status: 'success',
      createdAt: { $gte: thirtyDaysAgo },
    });
  }
}

module.exports = new LoginActivityService();
