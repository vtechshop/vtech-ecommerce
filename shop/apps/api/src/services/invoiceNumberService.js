// FILE: apps/api/src/services/invoiceNumberService.js
// GST invoice numbers: given once, when the payment is confirmed, in the order payments arrive.
// Website orders: W-00001, W-00002 ...   Manual (in-store / phone) orders: M-00001 ...
// Unpaid (pending) orders never get a number.
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const logger = require('../config/logger');

const PAID_ORDER_STATUSES = ['paid', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const PAID_PAYMENT_STATUSES = ['paid', 'captured'];
const NOT_PAID_PAYMENT_STATUSES = ['pending', 'failed', 'refunded'];

// Orders paid before this date never get a new number (their PDF shows the order ID): their GST
// periods were filed by hand, and downloading an old invoice must not break the running series.
// Numbering in payment order starts with the first payment from this date (W-00018 onward).
const SERIES_START = new Date(process.env.INVOICE_SERIES_START || '2026-11-11T00:00:00+05:30');

/** True for orders paid (or, without a payment date, created) before automatic numbering began. */
function isBeforeSeriesStart(order) {
  const when = order?.payment?.paidAt || order?.createdAt;
  return Boolean(when) && new Date(when) < SERIES_START;
}

/**
 * True when the order's payment is confirmed, so it may carry an invoice number.
 * The payment status decides: an order moved to "paid"/"packed" by hand while its payment is
 * still pending or failed does not get a number.
 */
function isInvoiceable(order) {
  if (!order) return false;
  const paymentStatus = order.payment?.status;
  if (PAID_PAYMENT_STATUSES.includes(paymentStatus)) return true;
  if (NOT_PAID_PAYMENT_STATUSES.includes(paymentStatus)) return false;
  // Old orders saved without a payment status: fall back to the order status
  return PAID_ORDER_STATUSES.includes(order.status);
}

function invoicePrefix(order) {
  return order.source === 'in-store' || order.source === 'phone' ? 'M' : 'W';
}

const formatInvoiceNumber = (prefix, seq) => `${prefix}-${String(seq).padStart(5, '0')}`;

function supportsTransactions() {
  const type = mongoose.connection.client?.topology?.description?.type;
  return type === 'ReplicaSetWithPrimary' || type === 'Sharded';
}

/**
 * Give the order its invoice number if it is paid and has none yet. Safe to call many times and
 * from several places at once (payment verify, webhook, reconcile job, downloads): the counter and
 * the order are updated in one transaction, so a number is never used twice or skipped.
 * @returns {Promise<string|null>} the invoice number, or null when the order is not paid
 */
async function assignInvoiceNumber(orderId, { ignoreSeriesStart = false } = {}) {
  const order = await Order.findById(orderId).select('invoiceNumber status payment.status payment.paidAt source createdAt').lean();
  if (!order) return null;
  if (order.invoiceNumber) return order.invoiceNumber;
  if (!isInvoiceable(order)) return null;
  if (!ignoreSeriesStart && isBeforeSeriesStart(order)) return null;

  const counterId = `invoice_${invoicePrefix(order)}`;
  const prefix = invoicePrefix(order);

  if (!supportsTransactions()) {
    // Standalone MongoDB (local dev only): best effort without a transaction
    const seq = await Counter.getNextSequence(counterId);
    const invoiceNumber = formatInvoiceNumber(prefix, seq);
    const res = await Order.updateOne({ _id: orderId, invoiceNumber: null }, { $set: { invoiceNumber } });
    if (res.modifiedCount === 1) return invoiceNumber;
    logger.warn(`Invoice number ${invoiceNumber} not used: order ${orderId} already numbered`);
    return (await Order.findById(orderId).select('invoiceNumber').lean())?.invoiceNumber || null;
  }

  const session = await mongoose.startSession();
  try {
    let invoiceNumber = null;
    await session.withTransaction(async () => {
      invoiceNumber = null;
      const current = await Order.findById(orderId).select('invoiceNumber').session(session).lean();
      if (current?.invoiceNumber) {
        invoiceNumber = current.invoiceNumber;
        return;
      }
      const counter = await Counter.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      );
      const candidate = formatInvoiceNumber(prefix, counter.seq);
      const res = await Order.updateOne(
        { _id: orderId, invoiceNumber: null },
        { $set: { invoiceNumber: candidate } },
        { session }
      );
      if (res.modifiedCount !== 1) {
        // Someone numbered it in between: abort so the counter step is rolled back
        throw Object.assign(new Error('Order already has an invoice number'), { code: 'INVOICE_ALREADY_SET' });
      }
      invoiceNumber = candidate;
    });
    if (invoiceNumber) logger.info(`Invoice number ${invoiceNumber} assigned to order ${orderId}`);
    return invoiceNumber;
  } catch (err) {
    if (err.code !== 'INVOICE_ALREADY_SET') throw err;
    return (await Order.findById(orderId).select('invoiceNumber').lean())?.invoiceNumber || null;
  } finally {
    await session.endSession();
  }
}

/** Same as assignInvoiceNumber but never throws: for payment and status flows that must not fail. */
async function assignInvoiceNumberSafe(orderId) {
  try {
    return await assignInvoiceNumber(orderId);
  } catch (err) {
    logger.error(`Failed to assign invoice number for order ${orderId}:`, err);
    return null;
  }
}

module.exports = { assignInvoiceNumber, assignInvoiceNumberSafe, isInvoiceable, isBeforeSeriesStart, PAID_ORDER_STATUSES };
