// FILE: apps/api/src/controllers/invoiceController.js
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const { generateInvoicePDF, buildSellerFromVendor } = require('../services/invoiceService');

const INVOICE_STATUSES = ['paid', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

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

    if (!INVOICE_STATUSES.includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVOICE_NOT_AVAILABLE', message: 'Invoice is only available for paid orders' },
      });
    }

    // Resolve seller: vendor details for vendor orders, platform details for own orders
    const seller = await resolveSellerForOrder(order);

    const filename = `Invoice-${order.orderId}.pdf`;
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

    // Resolve seller: vendor details for vendor orders, platform details for own orders
    const seller = await resolveSellerForOrder(order);

    const filename = `Invoice-${order.orderId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await generateInvoicePDF(order, res, seller);
  } catch (error) {
    console.error('Admin invoice generation failed:', error);
    next(error);
  }
};
