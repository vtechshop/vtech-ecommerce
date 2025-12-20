// FILE: apps/api/src/services/apiKeyService.js
const crypto = require('crypto');
const APIKey = require('../models/APIKey');

class APIKeyService {
  /**
   * Generate a new API key
   * Format: vt_live_XXXXXXXXXXXXXXXXXXXX (32 chars after prefix)
   */
  generateKey() {
    const prefix = 'vt_live';
    const randomPart = crypto.randomBytes(20).toString('hex'); // 40 chars
    const key = `${prefix}_${randomPart}`;
    return { key, prefix };
  }

  /**
   * Hash API key for storage
   */
  hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Create a new API key for a user
   */
  async createKey(userId, name, options = {}) {
    const { key, prefix } = this.generateKey();
    const hashedKey = this.hashKey(key);

    const apiKey = await APIKey.create({
      userId,
      name,
      key: hashedKey,
      prefix,
      permissions: options.permissions || ['read'],
      description: options.description,
      expiresAt: options.expiresAt,
    });

    // Return the plain key only once (won't be retrievable later)
    return {
      id: apiKey._id,
      key, // Plain key - show to user only once
      prefix,
      name: apiKey.name,
      createdAt: apiKey.createdAt,
      permissions: apiKey.permissions,
    };
  }

  /**
   * Get user's API keys (without the actual key values)
   */
  async getUserKeys(userId) {
    return APIKey.find({ userId })
      .select('-key')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Revoke an API key
   */
  async revokeKey(keyId, userId) {
    const apiKey = await APIKey.findOne({ _id: keyId, userId });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    apiKey.status = 'revoked';
    await apiKey.save();

    return apiKey;
  }

  /**
   * Validate an API key
   */
  async validateKey(key) {
    const hashedKey = this.hashKey(key);

    const apiKey = await APIKey.findOne({
      key: hashedKey,
      status: 'active',
    }).populate('userId');

    if (!apiKey) {
      return null;
    }

    // Check if expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    apiKey.lastUsedAt = new Date();
    await apiKey.save();

    return apiKey;
  }

  /**
   * Delete an API key
   */
  async deleteKey(keyId, userId) {
    const result = await APIKey.findOneAndDelete({ _id: keyId, userId });

    if (!result) {
      throw new Error('API key not found');
    }

    return result;
  }
}

module.exports = new APIKeyService();
