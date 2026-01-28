// FILE: apps/api/src/controllers/vendorController.js
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Commission = require('../models/Commission');
const { slugify, generateSKU, getPaginationMeta } = require('../utils/helpers');
const logger = require('../config/logger');
const notificationHelper = require('../services/notificationHelper');
const notificationService = require('../services/notificationService');

// ---------- CONTROLLERS ----------
async function getVendorBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    // allow any status (helps with seeded “pending” vendors)
    const vendor = await Vendor.findOne({ slug }).populate('userId', 'name email');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor not found' },
      });
    }
    res.json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
}

async function onboard(req, res, next) {
  try {
    const { storeName, description, kyc, bank } = req.body;

    logger.info(`Vendor onboarding attempt for user: ${req.user._id}`);
    logger.info(`Onboarding data: ${JSON.stringify({ storeName, kyc, bank: bank ? 'provided' : 'not provided' })}`);

    const existing = await Vendor.findOne({ userId: req.user._id });
    if (existing) {
      logger.warn(`User ${req.user._id} already has vendor profile`);
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_VENDOR', message: 'User already has a vendor profile' },
      });
    }

    const vendor = await Vendor.create({
      userId: req.user._id,
      storeName,
      slug: slugify(storeName),
      description,
      kyc: { ...(kyc || {}), status: 'pending' },
      bank,
      status: 'pending',
    });

    logger.info(`Vendor created successfully: ${vendor._id} - ${vendor.storeName}`);

    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, { role: 'vendor' });

    logger.info(`User role updated to vendor for: ${req.user._id}`);
    logger.info(`Vendor onboarded: ${vendor.storeName}`);

    // Notify admin of new vendor registration
    try {
      await notificationHelper.notifyAdminNewVendor({
        vendor,
        userEmail: req.user.email || 'Unknown',
      });
      logger.info(`Admin notified of new vendor registration: ${vendor.storeName}`);
    } catch (notifError) {
      logger.error('Failed to notify admin of new vendor:', notifError);
    }

    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    logger.error(`Vendor onboarding failed for user ${req.user._id}:`, error);
    logger.error(`Error details: ${error.message}`);
    if (error.name === 'ValidationError') {
      logger.error(`Validation errors: ${JSON.stringify(error.errors)}`);
    }
    next(error);
  }
}

async function getDashboardStats(req, res, next) {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    const [totalProducts, activeProducts, totalOrders, pendingOrders, totalCommissions] =
      await Promise.all([
        Product.countDocuments({ vendorId: vendor._id }),
        Product.countDocuments({ vendorId: vendor._id, published: true }),
        Order.countDocuments({ 'items.vendorId': vendor._id }),
        Order.countDocuments({ 'items.vendorId': vendor._id, status: { $in: ['placed', 'paid'] } }),
        Commission.aggregate([
          { $match: { subjectId: vendor._id, type: 'vendor', status: 'approved' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        totalEarnings: totalCommissions[0]?.total || 0,
        totalSales: vendor.totalSales,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getVendorProducts(req, res, next) {
  try {
    const { page = 1, limit = 20, search, published } = req.query;

    // SECURITY: Explicit vendor verification with null check
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    const query = { vendorId: vendor._id };
    if (search) query.$text = { $search: String(search) };
    if (published !== undefined) query.published = published === 'true';

    // SECURITY: Enforce maximum limit to prevent DoS
    const safeLimit = Math.min(parseInt(limit) || 20, 100); // Max 100 items
    const safePage = Math.max(parseInt(page) || 1, 1); // Min page 1
    const skip = (safePage - 1) * safeLimit;

    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      Product.countDocuments(query),
    ]);

    res.json({ success: true, data: products, meta: getPaginationMeta(total, safePage, safeLimit) });
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    // SECURITY: Explicit vendor verification
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    // Generate unique slug
    let slug = slugify(req.body.title);
    let slugExists = await Product.findOne({ slug });
    let counter = 1;

    while (slugExists) {
      slug = `${slugify(req.body.title)}-${counter}`;
      slugExists = await Product.findOne({ slug });
      counter++;
    }

    // Generate unique SKU if provided SKU already exists
    let sku = req.body.sku || generateSKU();
    if (req.body.sku) {
      let skuExists = await Product.findOne({ sku });
      let skuCounter = 1;

      while (skuExists) {
        sku = `${req.body.sku}-${skuCounter}`;
        skuExists = await Product.findOne({ sku });
        skuCounter++;
      }
    }

    const product = await Product.create({
      ...req.body,
      vendorId: vendor._id,
      slug: slug,
      sku: sku,
    });

    // SECURITY: Use atomic increment to prevent race conditions
    await Vendor.findByIdAndUpdate(vendor._id, { $inc: { totalProducts: 1 } });

    logger.info(`Product created: ${product.title}`);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}


async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findOne({ userId: req.user._id });
    const product = await Product.findOne({ _id: id, vendorId: vendor._id });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }

    // SECURITY: Use whitelist approach instead of Object.assign to prevent mass assignment
    const allowedFields = [
      'title', 'description', 'price', 'compareAt', 'cost', 'stock',
      'sku', 'barcode', 'brand', 'images', 'categoryIds', 'tags',
      'variants', 'specifications', 'shippingInfo', 'published',
      'featured', 'taxable', 'taxRate', 'taxIncluded', 'seo', 'hasWarranty', 'warranty', 'faqs', 'structuredData', 'youtubeLink'
    ];

    // Fields that are nested objects and need markModified
    const nestedObjectFields = ['seo', 'warranty', 'shippingInfo', 'specifications', 'structuredData'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
        // Mark nested objects as modified so Mongoose detects the change
        if (nestedObjectFields.includes(field)) {
          product.markModified(field);
        }
      }
    });

    if (req.body.title) product.slug = slugify(req.body.title);

    await product.save();
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findOne({ userId: req.user._id });
    const product = await Product.findOneAndDelete({ _id: id, vendorId: vendor._id });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }

    // SECURITY: Use atomic decrement to prevent race conditions (min value 0)
    await Vendor.findByIdAndUpdate(vendor._id, {
      $inc: { totalProducts: -1 },
      $max: { totalProducts: 0 }
    });

    logger.info(`Product deleted: ${product.title}`);
    res.json({ success: true, data: { message: 'Product deleted successfully' } });
  } catch (error) {
    next(error);
  }
}

async function importProducts(req, res, next) {
  try {
    const { products } = req.body;
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    const imported = [];
    const errors = [];

    for (const productData of products || []) {
      try {
        const product = await Product.create({
          ...productData,
          vendorId: vendor._id,
          slug: slugify(productData.title),
          sku: productData.sku || generateSKU(),
        });
        imported.push(product);
      } catch (e) {
        errors.push({ title: productData.title, error: e.message });
      }
    }

    vendor.totalProducts += imported.length;
    await vendor.save();

    logger.info(`Bulk import: ${imported.length} products created, ${errors.length} errors`);
    res.json({ success: true, data: { imported: imported.length, errors } });
  } catch (error) {
    next(error);
  }
}

async function getInventory(req, res, next) {
  try {
    const { page = 1, limit = 50, lowStock } = req.query;

    // SECURITY: Explicit vendor verification
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    const query = { vendorId: vendor._id };
    if (lowStock === 'true') query.$expr = { $lte: ['$stock', '$lowStockThreshold'] };

    // SECURITY: Enforce maximum limit
    const safeLimit = Math.min(parseInt(limit) || 50, 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .select('title sku stock lowStockThreshold variants')
        .sort({ stock: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Product.countDocuments(query),
    ]);

    res.json({ success: true, data: products, meta: getPaginationMeta(total, safePage, safeLimit) });
  } catch (error) {
    next(error);
  }
}

async function updateInventory(req, res, next) {
  try {
    const { productId } = req.params;
    const { stock, variants } = req.body;

    const vendor = await Vendor.findOne({ userId: req.user._id });
    const product = await Product.findOne({ _id: productId, vendorId: vendor._id });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }

    if (stock !== undefined) product.stock = stock;

    if (variants && Array.isArray(variants)) {
      variants.forEach(v => {
        const variant = product.variants.id(v.variantId);
        if (variant) variant.stock = v.stock;
      });
    }

    await product.save();
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

async function getVendorOrders(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;

    // SECURITY: Explicit vendor verification
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    const query = { 'items.vendorId': vendor._id };
    if (status) query.status = status;

    // SECURITY: Enforce maximum limit
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      Order.countDocuments(query),
    ]);

    const filteredOrders = orders.map(order => ({
      ...order,
      items: order.items.filter(i => String(i.vendorId) === String(vendor._id)),
    }));

    res.json({ success: true, data: filteredOrders, meta: getPaginationMeta(total, safePage, safeLimit) });
  } catch (error) {
    next(error);
  }
}

async function getSettlements(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;

    // SECURITY: Explicit vendor verification
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    const query = { subjectId: vendor._id, type: 'vendor' };
    if (status) query.status = status;

    // SECURITY: Enforce maximum limit
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [commissions, total] = await Promise.all([
      Commission.find(query)
        .populate('orderId', 'orderId totals createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Commission.countDocuments(query),
    ]);

    res.json({ success: true, data: commissions, meta: getPaginationMeta(total, safePage, safeLimit) });
  } catch (error) {
    next(error);
  }
}

// ---------- KYC METHODS ----------
async function getKYC(req, res, next) {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Vendor profile not found. Please complete vendor onboarding first.'
        },
      });
    }

    res.json({
      success: true,
      data: {
        kyc: vendor.kyc,
        status: vendor.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateKYC(req, res, next) {
  try {
    const { businessName, businessType, businessAddress, taxId, phoneNumber } = req.body;

    const vendor = await Vendor.findOne({ userId: req.user._id });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    // Update KYC fields
    if (businessName !== undefined) vendor.kyc.businessName = businessName;
    if (businessType !== undefined) vendor.kyc.businessType = businessType;
    if (businessAddress !== undefined) vendor.kyc.businessAddress = businessAddress;
    if (taxId !== undefined) vendor.kyc.taxId = taxId;
    if (phoneNumber !== undefined) vendor.kyc.phoneNumber = phoneNumber;

    // If KYC was rejected and user is updating, reset to pending
    if (vendor.kyc.status === 'rejected') {
      vendor.kyc.status = 'pending';
      vendor.kyc.rejectionReason = undefined;
    }

    await vendor.save();

    logger.info(`KYC updated for vendor: ${vendor.storeName}`);

    res.json({
      success: true,
      data: {
        kyc: vendor.kyc,
        message: 'KYC information updated successfully',
      },
    });
  } catch (error) {
    next(error);
  }
}

async function uploadKYCDocument(req, res, next) {
  try {
    const { type, url, filename } = req.body;

    const vendor = await Vendor.findOne({ userId: req.user._id });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    // Validate document type
    const validTypes = ['business_license', 'tax_certificate', 'id_proof', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TYPE', message: 'Invalid document type' },
      });
    }

    // Add document to KYC documents array
    if (!vendor.kyc.documents) {
      vendor.kyc.documents = [];
    }

    vendor.kyc.documents.push({
      type,
      url,
      filename,
      uploadedAt: new Date(),
    });

    // If KYC was rejected and user is uploading new documents, reset to pending
    if (vendor.kyc.status === 'rejected') {
      vendor.kyc.status = 'pending';
      vendor.kyc.rejectionReason = undefined;
    }

    await vendor.save();

    logger.info(`KYC document uploaded for vendor: ${vendor.storeName}`);

    res.json({
      success: true,
      data: {
        document: vendor.kyc.documents[vendor.kyc.documents.length - 1],
        message: 'Document uploaded successfully',
      },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteKYCDocument(req, res, next) {
  try {
    const { documentId } = req.params;

    const vendor = await Vendor.findOne({ userId: req.user._id });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    // Check if documents array exists and has items
    if (!vendor.kyc.documents || vendor.kyc.documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      });
    }

    // Find document index
    const documentIndex = vendor.kyc.documents.findIndex(
      doc => doc._id.toString() === documentId
    );

    if (documentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      });
    }

    vendor.kyc.documents.splice(documentIndex, 1);
    await vendor.save();

    logger.info(`KYC document deleted for vendor: ${vendor.storeName}`);

    res.json({
      success: true,
      data: { message: 'Document deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
}

// ---------- SETTINGS ENDPOINTS ----------

// Get vendor settings
async function getSettings(req, res, next) {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id })
      .select('+bank.accountNumber +bank.routingNumber'); // Include sensitive fields for owner

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    res.json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
}

// Update store profile (name, description, logo)
async function updateProfile(req, res, next) {
  try {
    const { storeName, description, logo } = req.body;

    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    // Update fields
    if (storeName) {
      vendor.storeName = storeName;
      vendor.slug = slugify(storeName);
    }
    if (description !== undefined) vendor.description = description;
    if (logo !== undefined) vendor.logo = logo;

    await vendor.save();

    logger.info(`Vendor profile updated: ${vendor.storeName}`);

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
}

// Update bank details
async function updateBank(req, res, next) {
  try {
    const { accountHolderName, bankName, accountNumber, ifscCode, swiftCode } = req.body;

    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    // Update bank details
    vendor.bank = vendor.bank || {};
    if (accountHolderName !== undefined) vendor.bank.accountHolderName = accountHolderName;
    if (bankName !== undefined) vendor.bank.bankName = bankName;
    if (accountNumber !== undefined) {
      vendor.bank.accountNumber = accountNumber;
      // Store last 4 digits for display
      vendor.bank.lastFourDigits = accountNumber.slice(-4);
    }
    if (ifscCode !== undefined) vendor.bank.ifscCode = ifscCode.toUpperCase();
    if (swiftCode !== undefined) vendor.bank.swiftCode = swiftCode.toUpperCase();

    await vendor.save();

    logger.info(`Bank details updated for vendor: ${vendor.storeName}`);

    res.json({
      success: true,
      data: { message: 'Bank details updated successfully' },
    });
  } catch (error) {
    next(error);
  }
}

// Update policies (return, shipping)
async function updatePolicies(req, res, next) {
  try {
    const { returnPolicy, shippingPolicy } = req.body;

    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    // Update policies
    if (returnPolicy !== undefined) vendor.returnPolicy = returnPolicy;
    if (shippingPolicy !== undefined) vendor.shippingPolicy = shippingPolicy;

    await vendor.save();

    logger.info(`Policies updated for vendor: ${vendor.storeName}`);

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
}

// Update payout preferences
async function updatePayout(req, res, next) {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    // Note: Commission percentage can only be changed by admin via admin dashboard

    await vendor.save();

    logger.info(`Payout preferences updated for vendor: ${vendor.storeName}`);

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
}

// Update order status
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const Order = require('../models/Order');

    // Find order
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found',
        },
      });
    }

    // Verify vendor owns this order (check if any order items belong to this vendor)
    const vendor = await Vendor.findOne({ userId: req.user._id });

    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Vendor profile not found',
        },
      });
    }

    const hasVendorItems = order.items.some(
      item => String(item.vendorId) === String(vendor._id)
    );

    if (!hasVendorItems && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to update this order',
        },
      });
    }

    // Validate status
    const validStatuses = ['placed', 'paid', 'packed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Invalid order status',
        },
      });
    }

    // IMPORTANT: Prevent status updates before carrier assignment (vendor only)
    // Admin can update status anytime
    if (req.user.role === 'vendor') {
      // Check if trying to update to packed/shipped/delivered
      const statusesRequiringCarrier = ['packed', 'shipped', 'delivered'];

      if (statusesRequiringCarrier.includes(status)) {
        // Check if carrier has been assigned
        if (!order.shipment || !order.shipment.awb || !order.shipment.carrier) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'CARRIER_NOT_ASSIGNED',
              message: 'Cannot update order status. Admin must assign delivery carrier first.',
            },
          });
        }
      }
    }

    // Update status
    order.status = status;

    // Add event to order timeline
    order.events.push({
      status,
      description: `Order status updated to ${status}`,
      timestamp: new Date(),
    });

    await order.save();

    // Send notifications for status changes (async - don't block response)
    (async () => {
      try {
        const User = require('../models/User');

        // Get user info for email
        let userInfo = {};
        if (order.userId && !order.isGuest) {
          const user = await User.findById(order.userId);
          if (user) {
            userInfo = { name: user.name, email: user.email };
          }
        } else if (order.isGuest && order.guestEmail) {
          userInfo = { name: order.shipTo?.fullName || 'Guest', email: order.guestEmail };
        }

        // Send status update email to customer for key status changes
        const notifiableStatuses = ['packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
        if (notifiableStatuses.includes(status) && userInfo.email) {
          // Get tracking info if available
          const trackingInfo = order.shipment ? {
            carrier: order.shipment.carrier,
            awb: order.shipment.awb,
            trackingUrl: order.shipment.trackingUrl,
          } : null;

          if (status === 'cancelled') {
            // Determine who cancelled
            const cancelledBy = req.user.role === 'admin' ? 'admin' : 'vendor';
            await notificationService.sendOrderCancellationEmail(
              userInfo,
              order,
              order.cancellation?.reason || 'Order cancelled',
              cancelledBy
            );

            // Also notify vendors if cancelled by admin
            if (cancelledBy === 'admin') {
              const vendorItemsMap = {};
              for (const item of order.items) {
                if (item.vendorId) {
                  const vendorIdStr = item.vendorId.toString();
                  if (!vendorItemsMap[vendorIdStr]) {
                    vendorItemsMap[vendorIdStr] = [];
                  }
                  vendorItemsMap[vendorIdStr].push(item);
                }
              }

              for (const [vendorIdStr, vendorItems] of Object.entries(vendorItemsMap)) {
                const vendorForNotif = await Vendor.findById(vendorIdStr).populate('userId', 'email name');
                if (vendorForNotif && vendorForNotif.userId?.email) {
                  await notificationService.sendVendorOrderCancellationEmail(
                    vendorForNotif,
                    order,
                    vendorItems,
                    order.cancellation?.reason || 'Order cancelled',
                    'admin'
                  );
                }
              }
            }
          } else {
            await notificationService.sendOrderStatusUpdateEmail(userInfo, order, status, trackingInfo);
          }
          logger.info(`Status update email sent to customer for order ${order.orderId}: ${status}`);

          // Send in-app notification to customer if registered user
          if (order.userId && !order.isGuest) {
            await notificationHelper.notifyCustomerOrderStatus({
              userId: order.userId,
              order: { _id: order._id, orderNumber: order.orderId },
              status,
            });
          }
        }
      } catch (notifError) {
        logger.error('Failed to send status update notifications:', notifError);
      }
    })();

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

// Get vendor reviews (public endpoint)
async function getVendorReviews(req, res, next) {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 20, sort = 'recent' } = req.query;

    // Find vendor
    const vendor = await Vendor.findOne({ slug });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor not found' },
      });
    }

    // Get all products for this vendor
    const products = await Product.find({ vendorId: vendor._id }).select('_id').lean();
    const productIds = products.map(p => p._id);

    // Build sort criteria
    let sortCriteria = {};
    if (sort === 'recent') sortCriteria = { createdAt: -1 };
    else if (sort === 'rating_high') sortCriteria = { rating: -1, createdAt: -1 };
    else if (sort === 'rating_low') sortCriteria = { rating: 1, createdAt: -1 };
    else if (sort === 'helpful') sortCriteria = { helpfulCount: -1, createdAt: -1 };

    // SECURITY: Enforce maximum limit
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const Review = require('../models/Review');

    // Get reviews for all vendor's products
    const [reviews, total, stats] = await Promise.all([
      Review.find({
        productId: { $in: productIds },
        status: 'approved',
      })
        .populate('userId', 'name')
        .populate('productId', 'title slug images')
        .sort(sortCriteria)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Review.countDocuments({
        productId: { $in: productIds },
        status: 'approved',
      }),
      Review.aggregate([
        {
          $match: {
            productId: { $in: productIds },
            status: 'approved',
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            verifiedCount: { $sum: { $cond: ['$verified', 1, 0] } },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        stats: stats[0] || {
          averageRating: 0,
          totalReviews: 0,
          rating5: 0,
          rating4: 0,
          rating3: 0,
          rating2: 0,
          rating1: 0,
          verifiedCount: 0,
        },
      },
      meta: getPaginationMeta(total, safePage, safeLimit),
    });
  } catch (error) {
    next(error);
  }
}

// ---------- EXPORTS ----------
module.exports = {
  getVendorBySlug,
  getVendorReviews,
  onboard,
  getDashboardStats,
  getVendorProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  importProducts,
  getInventory,
  updateInventory,
  getVendorOrders,
  updateOrderStatus,
  getSettlements,
  getKYC,
  updateKYC,
  uploadKYCDocument,
  deleteKYCDocument,
  // Settings
  getSettings,
  updateProfile,
  updateBank,
  updatePolicies,
  updatePayout,
};
