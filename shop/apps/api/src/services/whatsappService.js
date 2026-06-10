// FILE: apps/api/src/services/whatsappService.js
// Meta WhatsApp Cloud API — sends template messages to customers/vendors
const axios = require('axios');
const logger = require('../config/logger');

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const API_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

function isConfigured() {
  return !!(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

// Normalize Indian phone number to WhatsApp format (91XXXXXXXXXX)
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(1);
  return digits.length >= 10 ? digits : null;
}

async function sendTemplate(to, templateName, components = []) {
  if (!isConfigured()) {
    logger.warn('[WhatsApp] Not configured — skipping message');
    return;
  }
  const waPhone = normalizePhone(to);
  if (!waPhone) {
    logger.warn(`[WhatsApp] Invalid phone number: ${to}`);
    return;
  }
  try {
    await axios.post(
      API_URL,
      {
        messaging_product: 'whatsapp',
        to: waPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      }
    );
    logger.info(`[WhatsApp] Sent "${templateName}" to ${waPhone}`);
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    logger.error(`[WhatsApp] Failed to send "${templateName}" to ${waPhone}: ${detail}`);
  }
}

// Order placed — sent to customer
// Template params: {{1}} = customer name, {{2}} = order number, {{3}} = total amount
async function sendOrderConfirmation(customerPhone, customerName, orderNumber, totalAmount) {
  await sendTemplate(customerPhone, 'order_confirmation', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: customerName },
        { type: 'text', text: orderNumber },
        { type: 'text', text: `₹${totalAmount}` },
      ],
    },
  ]);
}

// Order shipped — sent to customer
// Template params: {{1}} = customer name, {{2}} = order number, {{3}} = tracking/AWB
async function sendOrderShipped(customerPhone, customerName, orderNumber, awb) {
  await sendTemplate(customerPhone, 'order_shipped', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: customerName },
        { type: 'text', text: orderNumber },
        { type: 'text', text: awb || 'N/A' },
      ],
    },
  ]);
}

// New order alert — sent to vendor
// Template params: {{1}} = vendor name, {{2}} = order number, {{3}} = item count
async function sendVendorNewOrder(vendorPhone, vendorName, orderNumber, itemCount) {
  await sendTemplate(vendorPhone, 'vendor_new_order', [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: vendorName },
        { type: 'text', text: orderNumber },
        { type: 'text', text: String(itemCount) },
      ],
    },
  ]);
}

module.exports = {
  sendOrderConfirmation,
  sendOrderShipped,
  sendVendorNewOrder,
};
