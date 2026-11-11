// FILE: apps/api/src/controllers/invoiceController.js
const mongoose = require('mongoose');
const Order = require('../models/Order');
const { assignInvoiceNumber, isInvoiceable } = require('../services/invoiceNumberService');
const logger = require('../config/logger');
const Vendor = require('../models/Vendor');
const { generateInvoicePDF, buildSellerFromVendor } = require('../services/invoiceService');

/**
 * Resolve seller details for an order.
 * For vendor orders, fetches vendor profile and builds seller info.
 * For platform orders, returns null (uses default VTECH).
 */
async function resolveSellerForOrder(order) {
  if (!order.isVendorOrder) return null;

  // Get vendorId from the first item (all items in a vendor order belong to the same vendor)
  const vendorId = order.items?.[0]?.vendorId;
  if (!vendorId) return null;

  const vendor = await Vendor.findById(vendorId).populate('userId', 'email').lean();
  if (!vendor) return null;

  return buildSellerFromVendor(vendor);
}

/**
 * Downloads never create invoice numbers: the admin generates the tax invoice (POST
 * /admin/orders/:id/invoice). Until then a paid order downloads as an order summary
 * (payment receipt, not a tax invoice). Unpaid orders get nothing.
 */
function invoiceNotReady(order) {
  if (order.invoiceNumber || isInvoiceable(order)) return null;
  return { code: 'INVOICE_NOT_AVAILABLE', message: 'Invoice is only available for paid orders' };
}

const pdfFilename = (order) => (order.invoiceNumber ? `Invoice-${order.invoiceNumber}.pdf` : `Order-Summary-${order.orderId}.pdf`);

/**
 * Download invoice PDF for a customer's own order.
 * GET /api/orders/:id/invoice
 */
exports.downloadInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Build query - support both ObjectId and orderId string
    let query;
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new mongoose.Types.ObjectId(id) };
    } else {
      query = { orderId: id };
    }

    // Ownership check
    query.$or = [
      { userId: req.user._id },
      { isGuest: true, guestEmail: req.user.email },
    ];

    const order = await Order.findOne(query).populate('userId', 'email phone').lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    const notReady = invoiceNotReady(order);
    if (notReady) return res.status(400).json({ success: false, error: notReady });

    // Resolve seller: vendor details for vendor orders, platform details for own orders
    const seller = await resolveSellerForOrder(order);

    const filename = pdfFilename(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await generateInvoicePDF(order, res, seller);
  } catch (error) {
    console.error('Invoice generation failed:', error);
    next(error);
  }
};

/**
 * Download invoice PDF for any order (admin).
 * GET /api/admin/orders/:id/invoice
 */
exports.downloadInvoiceAdmin = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'email phone').lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    const notReady = invoiceNotReady(order);
    if (notReady) return res.status(400).json({ success: false, error: notReady });

    // Resolve seller: vendor details for vendor orders, platform details for own orders
    const seller = await resolveSellerForOrder(order);

    const filename = pdfFilename(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await generateInvoicePDF(order, res, seller);
  } catch (error) {
    console.error('Admin invoice generation failed:', error);
    next(error);
  }
};

/**
 * Download invoice PDF for vendor's own order.
 * GET /api/vendors/orders/:id/invoice
 */
exports.downloadInvoiceVendor = async (req, res, next) => {
  try {
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({ success: false, error: { code: 'NOT_VENDOR', message: 'Vendor profile required' } });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      'items.vendorId': vendor._id,
    }).populate('userId', 'email phone').lean();

    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }

    const notReady = invoiceNotReady(order);
    if (notReady) return res.status(400).json({ success: false, error: notReady });
    const seller = await resolveSellerForOrder(order);

    const filename = pdfFilename(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await generateInvoicePDF(order, res, seller);
  } catch (error) {
    console.error('Vendor invoice generation failed:', error);
    next(error);
  }
};

/**
 * Admin approves a paid order's tax invoice: gives it the next invoice number (in the order the
 * admin approves) and emails the invoice to the customer. Calling it again changes nothing.
 * POST /api/admin/orders/:id/invoice
 */
exports.generateInvoiceAdmin = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }
    if (order.invoiceNumber) {
      return res.json({ success: true, data: { invoiceNumber: order.invoiceNumber, alreadyGenerated: true } });
    }
    if (!isInvoiceable(order)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVOICE_NOT_AVAILABLE', message: 'Only paid orders can get an invoice. This payment is not confirmed.' },
      });
    }

    const invoiceNumber = await assignInvoiceNumber(order._id, { ignoreSeriesStart: true });
    if (!invoiceNumber) {
      return res.status(409).json({ success: false, error: { code: 'INVOICE_NOT_GENERATED', message: 'Could not generate the invoice. Please try again.' } });
    }
    await Order.updateOne(
      { _id: order._id },
      { $push: { events: { status: order.status, description: `Invoice ${invoiceNumber} generated by admin`, timestamp: new Date() } } }
    );
    logger.info(`Invoice ${invoiceNumber} generated for order ${order.orderId} by admin ${req.user?._id}`);

    // Email the invoice to the customer (best effort; the admin action has already succeeded)
    let emailed = false;
    try {
      const User = require('../models/User');
      const notificationService = require('../services/notificationService');
      const fresh = await Order.findById(order._id).lean();
      let recipient = null;
      if (fresh.userId && !fresh.isGuest) {
        const user = await User.findById(fresh.userId).select('name email').lean();
        if (user?.email) recipient = { name: user.name, email: user.email };
      } else if (fresh.guestEmail) {
        recipient = { name: fresh.shipTo?.fullName || 'Customer', email: fresh.guestEmail };
      }
      if (recipient) {
        const result = await notificationService.sendInvoiceEmail(recipient, fresh);
        emailed = Boolean(result?.success);
      }
    } catch (emailErr) {
      logger.error(`Invoice email failed for order ${order.orderId}:`, emailErr);
    }

    res.json({ success: true, data: { invoiceNumber, alreadyGenerated: false, emailed } });
  } catch (error) {
    next(error);
  }
};

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const BILL_FIELDS = { name: 100, company: 150, gstin: 15, addressLine1: 200, addressLine2: 200, city: 80, state: 80, zipCode: 10, phone: 20, email: 120 };
const cleanText = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/**
 * Admin edits what the tax invoice shows: billing details, customer GSTIN, item names and HSN
 * codes. Prices, quantities and tax cannot be changed. Locked once the invoice is generated.
 * PUT /api/admin/orders/:id/invoice-details
 */
exports.updateInvoiceDetails = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).select('invoiceNumber items._id').lean();
    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }
    if (order.invoiceNumber) {
      return res.status(409).json({
        success: false,
        error: { code: 'INVOICE_LOCKED', message: `Invoice ${order.invoiceNumber} is already generated and cannot be edited.` },
      });
    }

    const body = req.body || {};
    const billTo = {};
    for (const [field, max] of Object.entries(BILL_FIELDS)) billTo[field] = cleanText(body.billTo?.[field], max);
    billTo.gstin = billTo.gstin.toUpperCase().replace(/\s/g, '');
    if (billTo.gstin && !GSTIN_RE.test(billTo.gstin)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_GSTIN', message: 'GSTIN must be 15 characters, for example 33ABCDE1234F1Z5.' } });
    }
    if (billTo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billTo.email)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_EMAIL', message: 'Enter a valid billing email.' } });
    }
    if (billTo.zipCode && !/^[0-9]{6}$/.test(billTo.zipCode)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PINCODE', message: 'Pincode must be 6 digits.' } });
    }

    const itemIds = new Set((order.items || []).map(i => String(i._id)));
    const items = [];
    for (const e of Array.isArray(body.items) ? body.items : []) {
      const itemId = String(e?.itemId || '');
      if (!itemIds.has(itemId)) continue; // only this order's items
      const name = cleanText(e.name, 200);
      const hsnCode = cleanText(e.hsnCode, 8).replace(/\s/g, '');
      if (hsnCode && !/^[0-9]{4,8}$/.test(hsnCode)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_HSN', message: 'HSN code must be 4 to 8 digits.' } });
      }
      if (name || hsnCode) items.push({ itemId: new mongoose.Types.ObjectId(itemId), name, hsnCode });
    }

    const invoiceDetails = { billTo, items, updatedAt: new Date(), updatedBy: req.user?._id };
    // Only while no invoice number exists (generate may run at the same moment)
    const result = await Order.updateOne({ _id: order._id, invoiceNumber: { $in: [null] } }, { $set: { invoiceDetails } });
    if (result.matchedCount !== 1) {
      return res.status(409).json({ success: false, error: { code: 'INVOICE_LOCKED', message: 'The invoice was just generated and can no longer be edited.' } });
    }
    res.json({ success: true, data: { invoiceDetails } });
  } catch (error) {
    next(error);
  }
};
