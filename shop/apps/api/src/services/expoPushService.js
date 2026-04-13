// FILE: apps/api/src/services/expoPushService.js
const { Expo } = require('expo-server-sdk');
const logger = require('../config/logger');

const expo = new Expo();

/**
 * Send push notifications to one or more Expo push tokens.
 * @param {string|string[]} tokens - Single token or array of tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional extra data (for deep linking etc.)
 */
async function sendPushNotification(tokens, title, body, data = {}) {
  const tokenList = Array.isArray(tokens) ? tokens : [tokens];
  const validTokens = tokenList.filter((t) => t && Expo.isExpoPushToken(t));

  if (validTokens.length === 0) return;

  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error') {
          logger.warn(`Push notification error for token ${validTokens[i]}: ${ticket.message}`);
        }
      });
    } catch (err) {
      logger.error('Failed to send push notification chunk:', err);
    }
  }
}

/**
 * Send order status push notification to a user.
 * @param {object} user - User document (must have pushTokens array)
 * @param {string} status - New order status
 * @param {string} orderId - Order ID for deep link
 * @param {string} orderRef - Human readable order reference (#VTXXX)
 */
async function sendOrderStatusPush(user, status, orderId, orderRef) {
  if (!user?.pushTokens?.length) return;

  const messages = {
    confirmed:  { title: '✅ Order Confirmed!',   body: `Your order ${orderRef} has been confirmed.` },
    processing: { title: '⚙️ Order Processing',   body: `Your order ${orderRef} is being prepared.` },
    shipped:    { title: '🚚 Order Shipped!',      body: `Your order ${orderRef} is on the way!` },
    delivered:  { title: '📦 Order Delivered!',   body: `Your order ${orderRef} has been delivered. Enjoy!` },
    cancelled:  { title: '❌ Order Cancelled',     body: `Your order ${orderRef} has been cancelled.` },
    returned:   { title: '↩️ Return Initiated',   body: `Return for order ${orderRef} has been initiated.` },
  };

  const msg = messages[status];
  if (!msg) return;

  await sendPushNotification(
    user.pushTokens,
    msg.title,
    msg.body,
    { screen: 'order', orderId, orderRef }
  );
}

/**
 * Send a back-in-stock notification to users who wishlisted a product.
 * @param {string[]} tokens - Push tokens to notify
 * @param {string} productTitle - Product name
 * @param {string} productId - Product ID for deep link
 */
async function sendBackInStockPush(tokens, productTitle, productId) {
  await sendPushNotification(
    tokens,
    '🔔 Back in Stock!',
    `${productTitle} is now available. Grab it before it sells out!`,
    { screen: 'product', productId }
  );
}

module.exports = { sendPushNotification, sendOrderStatusPush, sendBackInStockPush };
