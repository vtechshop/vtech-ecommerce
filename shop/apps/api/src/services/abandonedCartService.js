// FILE: apps/api/src/services/abandonedCartService.js
const AbandonedCart = require('../models/AbandonedCart');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const logger = require('../config/logger');
const mailerService = require('../config/mailer');

const ABANDONED_CART_CONFIG = {
  STALE_THRESHOLD_HOURS: 1,           // Cart abandoned after 1 hour of inactivity
  FIRST_EMAIL_DELAY_HOURS: 1,         // Send first email 1 hour after abandonment
  SECOND_EMAIL_DELAY_HOURS: 24,       // Send second email 24 hours after first
  FINAL_EMAIL_DELAY_HOURS: 72,        // Send final email 72 hours after first
  DISCOUNT_PERCENTAGE: 10,             // 10% discount for recovery
  EXPIRY_DAYS: 30,                     // Cart expires after 30 days
};

class AbandonedCartService {
  /**
   * Track abandoned cart from active cart
   */
  static async trackAbandonedCart(cart, email = null) {
    try {
      if (!cart || !cart.items || cart.items.length === 0) {
        return null;
      }

      // Check if already tracking this cart
      let abandonedCart = await AbandonedCart.findOne({
        $or: [
          { user: cart.user },
          { sessionId: cart.sessionId },
        ],
        status: 'active',
      });

      const expiresAt = new Date(Date.now() + ABANDONED_CART_CONFIG.EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      if (abandonedCart) {
        // Update existing
        abandonedCart.items = cart.items;
        abandonedCart.total = cart.total;
        abandonedCart.lastActivityAt = new Date();
        abandonedCart.expiresAt = expiresAt;
        if (email) abandonedCart.email = email;
        await abandonedCart.save();
      } else {
        // Create new
        abandonedCart = await AbandonedCart.create({
          user: cart.user || null,
          sessionId: cart.sessionId || null,
          email: email || cart.email || null,
          items: cart.items,
          total: cart.total,
          expiresAt,
          metadata: {
            source: 'web',
          },
        });
      }

      logger.info(`[Abandoned Cart] Tracked cart for ${email || cart.user || cart.sessionId}`);

      return abandonedCart;
    } catch (error) {
      logger.error('[Abandoned Cart] Error tracking cart:', error);
      throw error;
    }
  }

  /**
   * Find stale carts that need recovery emails
   * Run this via cron job every hour
   */
  static async findStaleCarts() {
    try {
      const now = new Date();
      const staleThreshold = new Date(now.getTime() - ABANDONED_CART_CONFIG.STALE_THRESHOLD_HOURS * 60 * 60 * 1000);

      const staleCarts = await AbandonedCart.find({
        status: 'active',
        lastActivityAt: { $lte: staleThreshold },
        email: { $exists: true, $ne: null },
      }).populate('items.product', 'title price images slug');

      logger.info(`[Abandoned Cart] Found ${staleCarts.length} stale carts`);

      return staleCarts;
    } catch (error) {
      logger.error('[Abandoned Cart] Error finding stale carts:', error);
      throw error;
    }
  }

  /**
   * Send recovery emails
   * Run via cron job every hour
   */
  static async sendRecoveryEmails() {
    try {
      const staleCarts = await this.findStaleCarts();
      let emailsSent = 0;

      for (const cart of staleCarts) {
        if (!cart.canSendRecoveryEmail()) continue;

        const emailType = this.determineEmailType(cart);
        if (!emailType) continue;

        await this.sendRecoveryEmail(cart, emailType);
        emailsSent++;
      }

      logger.info(`[Abandoned Cart] Sent ${emailsSent} recovery emails`);

      return {
        success: true,
        emailsSent,
        cartsProcessed: staleCarts.length,
      };
    } catch (error) {
      logger.error('[Abandoned Cart] Error sending recovery emails:', error);
      throw error;
    }
  }

  /**
   * Determine which type of email to send
   */
  static determineEmailType(cart) {
    const emailCount = cart.recoveryEmails.length;

    if (emailCount === 0) {
      const oneHourAgo = new Date(Date.now() - ABANDONED_CART_CONFIG.FIRST_EMAIL_DELAY_HOURS * 60 * 60 * 1000);
      if (cart.lastActivityAt <= oneHourAgo) {
        return 'first_reminder';
      }
    } else if (emailCount === 1) {
      const firstEmail = cart.recoveryEmails[0];
      const oneDayAgo = new Date(Date.now() - ABANDONED_CART_CONFIG.SECOND_EMAIL_DELAY_HOURS * 60 * 60 * 1000);
      if (firstEmail.sentAt <= oneDayAgo) {
        return 'second_reminder';
      }
    } else if (emailCount === 2) {
      const firstEmail = cart.recoveryEmails[0];
      const threeDaysAgo = new Date(Date.now() - ABANDONED_CART_CONFIG.FINAL_EMAIL_DELAY_HOURS * 60 * 60 * 1000);
      if (firstEmail.sentAt <= threeDaysAgo) {
        return 'final_offer';
      }
    }

    return null;
  }

  /**
   * Send recovery email
   */
  static async sendRecoveryEmail(cart, emailType) {
    try {
      let subject, content, coupon = null;

      // Generate recovery coupon for final offer
      if (emailType === 'final_offer') {
        coupon = await this.generateRecoveryCoupon(cart);
      }

      const cartUrl = `${process.env.FRONTEND_URL}/cart?recover=${cart._id}`;
      const itemsHtml = cart.items.map(item => `
        <tr>
          <td>${item.product?.title || 'Product'}</td>
          <td>${item.quantity}</td>
          <td>₹${item.price}</td>
        </tr>
      `).join('');

      switch (emailType) {
        case 'first_reminder':
          subject = 'You left something in your cart!';
          content = `
            <h2>Don't forget your items!</h2>
            <p>You have ${cart.items.length} item(s) waiting in your cart.</p>
            <table>
              <thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <p><strong>Total: ₹${cart.total}</strong></p>
            <p><a href="${cartUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Complete Your Purchase</a></p>
          `;
          break;

        case 'second_reminder':
          subject = 'Still interested? Your cart is waiting!';
          content = `
            <h2>Your cart misses you!</h2>
            <p>We saved your cart with ${cart.items.length} item(s). They're still available!</p>
            <table>
              <thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <p><strong>Total: ₹${cart.total}</strong></p>
            <p><a href="${cartUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Return to Cart</a></p>
          `;
          break;

        case 'final_offer':
          subject = `Last chance! ${ABANDONED_CART_CONFIG.DISCOUNT_PERCENTAGE}% off your cart`;
          content = `
            <h2>Don't miss out! Here's a special offer just for you</h2>
            <p>Complete your purchase now and get <strong>${ABANDONED_CART_CONFIG.DISCOUNT_PERCENTAGE}% OFF</strong>!</p>
            <p>Use code: <strong style="color: #ef4444; font-size: 1.2em;">${coupon?.code}</strong> at checkout</p>
            <table>
              <thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <p><strong>Original Total: ₹${cart.total}</strong></p>
            <p><strong style="color: #22c55e;">Discounted Total: ₹${Math.round(cart.total * (1 - ABANDONED_CART_CONFIG.DISCOUNT_PERCENTAGE / 100))}</strong></p>
            <p><a href="${cartUrl}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Claim Your Discount</a></p>
            <p><small>Offer expires in 48 hours</small></p>
          `;
          break;
      }

      // Send email
      await mailerService.sendEmail({
        to: cart.email,
        subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background: #f3f4f6; }
            </style>
          </head>
          <body>
            ${content}
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 0.875rem;">
              V-Tech Kitchen - Premium Kitchen Appliances<br>
              <a href="${process.env.FRONTEND_URL}/newsletter/unsubscribe?email=${cart.email}">Unsubscribe</a>
            </p>
          </body>
          </html>
        `,
      });

      // Update cart record
      cart.recoveryEmails.push({
        sentAt: new Date(),
        type: emailType,
      });
      cart.recoveryAttempts += 1;
      if (coupon) {
        cart.metadata.couponOffered = coupon.code;
      }
      await cart.save();

      logger.info(`[Abandoned Cart] Sent ${emailType} email to ${cart.email}`);

      return { success: true, emailType };
    } catch (error) {
      logger.error(`[Abandoned Cart] Error sending email to ${cart.email}:`, error);
      throw error;
    }
  }

  /**
   * Generate recovery coupon
   */
  static async generateRecoveryCoupon(cart) {
    try {
      const code = `RECOVER${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const coupon = await Coupon.create({
        code,
        type: 'percentage',
        value: ABANDONED_CART_CONFIG.DISCOUNT_PERCENTAGE,
        minOrderValue: 0,
        maxDiscount: cart.total * 0.1, // Max discount is 10% of cart value
        usageLimit: 1,
        usageCount: 0,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        isActive: true,
        description: 'Abandoned cart recovery discount',
        // Optional: Restrict to specific user
        restrictions: cart.user ? { users: [cart.user] } : {},
      });

      logger.info(`[Abandoned Cart] Generated coupon ${code} for cart ${cart._id}`);

      return coupon;
    } catch (error) {
      logger.error('[Abandoned Cart] Error generating coupon:', error);
      return null;
    }
  }

  /**
   * Mark cart as recovered
   */
  static async markAsRecovered(cartId, orderId) {
    try {
      const cart = await AbandonedCart.findById(cartId);
      if (!cart) return;

      cart.status = 'recovered';
      cart.recoveredAt = new Date();
      cart.convertedOrderId = orderId;
      await cart.save();

      logger.info(`[Abandoned Cart] Cart ${cartId} recovered with order ${orderId}`);

      return cart;
    } catch (error) {
      logger.error('[Abandoned Cart] Error marking cart as recovered:', error);
      throw error;
    }
  }

  /**
   * Get recovery statistics
   */
  static async getStatistics() {
    try {
      const stats = await AbandonedCart.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$total' },
          },
        },
      ]);

      const last30Days = await AbandonedCart.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      });

      const recovered = stats.find(s => s._id === 'recovered') || { count: 0, totalValue: 0 };
      const active = stats.find(s => s._id === 'active') || { count: 0, totalValue: 0 };

      return {
        total: stats.reduce((sum, s) => sum + s.count, 0),
        last30Days,
        active: active.count,
        recovered: recovered.count,
        recoveryRate: active.count > 0 ? ((recovered.count / (active.count + recovered.count)) * 100).toFixed(2) : 0,
        potentialRevenue: active.totalValue,
        recoveredRevenue: recovered.totalValue,
      };
    } catch (error) {
      logger.error('[Abandoned Cart] Error getting statistics:', error);
      throw error;
    }
  }
}

module.exports = { AbandonedCartService, ABANDONED_CART_CONFIG };
