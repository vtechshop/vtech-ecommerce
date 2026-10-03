// FILE: apps/api/src/services/crmEventService.js
const crypto = require('crypto');
const axios = require('axios');
const CrmOutbox = require('../models/CrmOutbox');
const logger = require('../config/logger');

/**
 * Order events for the VTECH WhatsApp CRM.
 *
 * recordOrderEvent() writes one row to the crm_outbox collection. It never throws and never
 * calls the network, so a CRM or WhatsApp outage cannot fail or roll back an order.
 * deliver() is called only by jobs/crmOutboxWorker.js.
 *
 * Everything is off unless CRM_EVENTS_ENABLED=true and both CRM_EVENTS_URL and
 * CRM_EVENTS_SECRET are set.
 */

const EVENT_TYPES = ['order.confirmed', 'order.shipped', 'order.delivered', 'order.cancelled'];

// Payment states that this codebase itself treats as "money received" (razorpayController.verifyPayment
// and processWebhookPaymentCaptured). An order whose status was changed by hand does not have one.
const PAID_PAYMENT_STATUSES = ['paid', 'captured', 'authorized'];

const REQUEST_TIMEOUT_MS = 10_000;

function config() {
  return {
    enabled: process.env.CRM_EVENTS_ENABLED === 'true',
    url: process.env.CRM_EVENTS_URL || '',
    secret: process.env.CRM_EVENTS_SECRET || '',
  };
}

function isEnabled() {
  const { enabled, url, secret } = config();
  return enabled && Boolean(url) && secret.length >= 32;
}

function isPaymentVerified(order) {
  return PAID_PAYMENT_STATUSES.includes(order?.payment?.status);
}

/**
 * The event body. Deliberately small: what a WhatsApp order update needs and nothing else
 * (no address, no email, no payment identifiers).
 */
function buildPayload(type, order) {
  const payload = {
    eventId: `${order._id}:${type}`,
    type,
    occurredAt: new Date().toISOString(),
    order: {
      ref: String(order.orderId),
      ...(typeof order.totals?.total === 'number' ? { total: order.totals.total } : {}),
      currency: 'INR',
      ...(Array.isArray(order.items) ? { itemCount: order.items.length } : {}),
      ...(order.shipment?.carrier ? { carrier: String(order.shipment.carrier).slice(0, 60) } : {}),
      ...(order.shipment?.awb ? { awb: String(order.shipment.awb).slice(0, 60) } : {}),
    },
    customer: {
      ...(order.shipTo?.fullName ? { name: String(order.shipTo.fullName).slice(0, 160) } : {}),
      phone: String(order.shipTo?.phone || '').slice(0, 30),
    },
  };

  // Marketing consent travels only as an explicit yes, and only with the order confirmation.
  // An unticked box, a missing field or anything that is not exactly `true` sends nothing.
  const consent = order.marketingConsent?.whatsapp;
  if (type === 'order.confirmed' && consent?.optedIn === true && consent.at) {
    payload.marketingConsent = {
      optedIn: true,
      at: new Date(consent.at).toISOString(),
      source: consent.source || 'checkout_whatsapp_offers_checkbox',
      ...(consent.policyVersion ? { policyVersion: consent.policyVersion } : {}),
    };
  }
  return payload;
}

/**
 * Record an order event for later delivery. Safe to call from any order code path:
 * returns a short result string and never throws.
 */
async function recordOrderEvent(type, order) {
  try {
    if (!isEnabled()) return 'disabled';
    if (!EVENT_TYPES.includes(type) || !order?._id) return 'ignored';
    // Website orders only: in-store and phone orders are entered by staff
    if (order.source && order.source !== 'online') return 'ignored';
    // No event for an order whose payment was never verified — this also covers an order
    // whose status an admin changed by hand, and one cancelled before it was paid.
    if (!isPaymentVerified(order)) return 'unpaid';
    if (!order.shipTo?.phone) return 'no_phone';

    await CrmOutbox.create({
      eventId: `${order._id}:${type}`,
      type,
      orderId: order._id,
      payload: buildPayload(type, order),
    });
    return 'recorded';
  } catch (err) {
    if (err?.code === 11000) return 'duplicate'; // already recorded by another code path
    logger.error(`[CrmEvents] Could not record ${type} for order ${order?.orderId}: ${err.message}`);
    return 'error';
  }
}

function sign(rawBody, timestamp, secret) {
  return `sha256=${crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')}`;
}

function isUrlAllowed(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    // Plain http only for a CRM on the same machine during development
    return parsed.protocol === 'http:' && process.env.NODE_ENV !== 'production'
      && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Deliver one outbox row. Returns { ok } or { ok: false, retry, error }.
 * retry=false means the CRM refused the event itself (bad signature, invalid body):
 * sending it again would not help.
 */
async function deliver(event, httpClient = axios) {
  const { url, secret } = config();
  if (!isUrlAllowed(url)) {
    return { ok: false, retry: true, error: 'CRM_EVENTS_URL must be an https address' };
  }
  const rawBody = JSON.stringify(event.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  try {
    const response = await httpClient.post(url, rawBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-VTECH-Timestamp': String(timestamp),
        'X-VTECH-Signature': sign(rawBody, timestamp, secret),
      },
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 0,
      validateStatus: () => true,
      // The body is already a string; do not let the client re-serialise it
      transformRequest: [(data) => data],
    });
    const status = response.status;
    if (status >= 200 && status < 300) return { ok: true };
    const retry = status >= 500 || status === 408 || status === 429;
    return { ok: false, retry, error: `CRM answered HTTP ${status}` };
  } catch (err) {
    // Timeouts, DNS failures, refused connections. The CRM ignores an event it has already stored.
    return { ok: false, retry: true, error: `CRM unreachable (${err.code || err.message})` };
  }
}

module.exports = {
  EVENT_TYPES,
  isEnabled,
  isPaymentVerified,
  buildPayload,
  recordOrderEvent,
  sign,
  deliver,
};
