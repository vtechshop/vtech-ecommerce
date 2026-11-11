// FILE: apps/api/src/controllers/invoiceController.js
const mongoose = require('mongoose');
const Order = require('../models/Order');
const { assignInvoiceNumber, isInvoiceable, isBeforeSeriesStart } = require('../services/invoiceNumberService');
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
 * Make sure a paid order carries its invoice number (normally given at payment time; this covers
 * orders paid before that change). Unpaid orders get a 400.
 */
async function ensureInvoiceNumber(order) {
  if (order.invoiceNumber) return order.invoiceNumber;
  // Paid orders from already-filed periods: PDF without a new number (shows the order ID)
  if (isInvoiceable(order) && isBeforeSeriesStart(order)) return null;
  const invoiceNumber = isInvoiceable(order) ? await assignInvoiceNumber(order._id) : null;
  if (!invoiceNumber) {
    throw Object.assign(new Error('Invoice is only available for paid orders'), { statusCode: 400 });
  }
  order.invoiceNumber = invoiceNumber;
  return invoiceNumber;
}

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

    if (!isInvoiceable(order)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVOICE_NOT_AVAILABLE', message: 'Invoice is only available for paid orders' },
      });
    }

    // Assign invoice number if not already assigned
    await ensureInvoiceNumber(order);

    // Resolve seller: vendor details for vendor orders, platform details for own orders
    const seller = await resolveSellerForOrder(order);

    const filename = `Invoice-${order.invoiceNumber || order.orderId}.pdf`;
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

    // Assign invoice number if not already assigned (only for paid orders)
    try {
      await ensureInvoiceNumber(order);
    } catch (e) {
      return res.status(400).json({ success: false, error: { code: 'INVOICE_NOT_AVAILABLE', message: e.message } });
    }

    // Resolve seller: vendor details for vendor orders, platform details for own orders
    const seller = await resolveSellerForOrder(order);

    const filename = `Invoice-${order.invoiceNumber || order.orderId}.pdf`;
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

    try {
      await ensureInvoiceNumber(order);
    } catch (e) {
      return res.status(400).json({ success: false, error: { code: 'INVOICE_NOT_AVAILABLE', message: e.message } });
    }
    const seller = await resolveSellerForOrder(order);

    const filename = `Invoice-${order.invoiceNumber || order.orderId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await generateInvoicePDF(order, res, seller);
  } catch (error) {
    console.error('Vendor invoice generation failed:', error);
    next(error);
  }
};
