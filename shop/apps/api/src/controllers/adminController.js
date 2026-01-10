const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Affiliate = require('../models/Affiliate');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Commission = require('../models/Commission');
const AdCampaign = require('../models/AdCampaign');
const AdCreative = require('../models/AdCreative');
const Post = require('../models/Post');
const Page = require('../models/Page');
const Setting = require('../models/Setting');
const AuditLog = require('../models/AuditLog');
const Review = require('../models/Review');
const { getPaginationMeta, slugify, generateSKU } = require('../utils/helpers');
const logger = require('../config/logger');
const warrantyService = require('../services/warrantyService');
const notificationHelper = require('../services/notificationHelper');

// Helper function to activate warranties after payment
const activateWarrantiesForOrder = async (order) => {
  const now = new Date();

  for (const item of order.items) {
    // Process all warranty items, regardless of activation requirement
    if (item.warranty?.hasWarranty && !item.warranty.isActivated) {
      // Calculate warranty expiration date
      let expiresAt = null;
      let warrantyPeriodDays = 0;

      if (item.warranty.durationType === 'lifetime') {
        expiresAt = null;
        warrantyPeriodDays = 36500; // 100 years for lifetime
      } else if (item.warranty.durationType === 'years') {
        expiresAt = new Date(now);
        expiresAt.setFullYear(expiresAt.getFullYear() + item.warranty.duration);
        warrantyPeriodDays = item.warranty.duration * 365;
      } else { // months
        expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + item.warranty.duration);
        warrantyPeriodDays = item.warranty.duration * 30;
      }

      // Only auto-activate if no activation required
      if (!item.warranty.activationRequired) {
        item.warranty.isActivated = true;
        item.warranty.activatedAt = now;
        item.warranty.expiresAt = expiresAt;
      }

      // Generate Warranty record in database (for all warranty products)
      try {
        const productDetails = await Product.findById(item.productId);

        await warrantyService.generateWarranty({
          purchaseId: order.orderId,
          orderId: order._id,
          user: {
            id: order.userId || order.guestEmail,
            name: order.shipTo?.fullName || 'Guest',
            email: order.guestEmail || 'N/A',
            phone: order.shipTo?.phone || ''
          },
          product: {
            id: item.productId,
            name: item.name,
            model: productDetails?.sku || '',
            serial: '',
            category: productDetails?.category?.name || ''
          },
          purchaseDate: order.createdAt || now,
          warrantyPeriodDays: warrantyPeriodDays,
          warrantyType: 'manufacturer',
          extraInfo: {
            store: 'V-Tech Ecommerce',
            invoiceNo: order.orderId,
            remarks: item.warranty.description || ''
          }
        });
        logger.info(`Warranty generated for product ${item.name} in order ${order.orderId}`);
      } catch (error) {
        logger.error(`Failed to generate warranty for ${item.name}: ${error.message}`);
      }
    }
  }

  await order.save();
  logger.info(`Warranties activated for order: ${order.orderId}`);
};

// ---------- Dashboard ----------
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, totalVendors, totalProducts, totalOrders, revenueAgg] = await Promise.all([
      User.countDocuments(),
      Vendor.countDocuments({ status: 'active' }),
      Product.countDocuments({ published: true }),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$totals.total' } } }]),
    ]);

    const [pendingVendors, pendingAffiliates] = await Promise.all([
      Vendor.countDocuments({ status: 'pending' }),
      Affiliate.countDocuments({ status: 'pending' }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        totalProducts,
        totalOrders,
        totalRevenue: revenueAgg[0]?.total || 0,
        pendingApprovals: (pendingVendors || 0) + (pendingAffiliates || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Users ----------
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(query),
    ]);

    res.json({ success: true, data: users, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('vendorProfile')
      .populate('affiliateProfile')
      .lean();
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

exports.updateUser = async (req, res, next) => {
  try {
    // SECURITY: Whitelist allowed fields to prevent privilege escalation
    const allowedFields = ['name', 'email', 'phone', 'addresses', 'isEmailVerified'];
    const updates = {};

    // Only copy whitelisted fields from request body
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // SECURITY: Prevent modification of sensitive fields
    // role, password, and other security-critical fields should use dedicated endpoints
    if (req.body.role || req.body.password || req.body.refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FORBIDDEN_FIELD',
          message: 'Cannot update role, password, or authentication fields through this endpoint. Use dedicated endpoints instead.'
        }
      });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    logger.info(`User updated by admin: ${user.email} (ID: ${user._id})`);
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    // CRITICAL FIX: Delete associated vendor profile and vendor products if user is a vendor
    if (user.role === 'vendor') {
      const vendor = await Vendor.findOne({ userId: req.params.id });
      if (vendor) {
        // Delete all products belonging to this vendor
        await Product.deleteMany({ vendorId: vendor._id });
        logger.info(`Products deleted for vendor: ${user.email}`);

        // Delete the vendor profile
        await Vendor.deleteOne({ userId: req.params.id });
        logger.info(`Vendor profile deleted for user: ${user.email}`);
      }
    }

    // CRITICAL FIX: Delete associated affiliate profile and commissions if user is an affiliate
    if (user.role === 'affiliate') {
      const affiliate = await Affiliate.findOne({ userId: req.params.id });
      if (affiliate) {
        // Delete all commissions for this affiliate
        await Commission.deleteMany({ affiliateId: affiliate._id });
        logger.info(`Commissions deleted for affiliate: ${user.email}`);

        // Delete the affiliate profile
        await Affiliate.deleteOne({ userId: req.params.id });
        logger.info(`Affiliate profile deleted for user: ${user.email}`);
      }
    }

    // Delete user reviews
    await Review.deleteMany({ userId: req.params.id });
    logger.info(`Reviews deleted for user: ${user.email}`);

    // Now delete the user
    await User.findByIdAndDelete(req.params.id);
    logger.info(`User deleted: ${user.email}`);

    res.json({ success: true, data: { message: 'User and associated data deleted successfully' } });
  } catch (error) { next(error); }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const { hashPassword } = require('../utils/hash');
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Password must be at least 8 characters' }
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    await user.save();

    logger.info(`Password reset by admin for user: ${user.email}`);
    res.json({
      success: true,
      data: { message: 'Password reset successfully' }
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Products ----------
exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, vendorId, search } = req.query;
    const query = {};
    if (status === 'published') query.published = true;
    if (status === 'unpublished') query.published = false;
    if (vendorId) query.vendorId = vendorId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(query).populate('vendorId', 'storeName slug').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Product.countDocuments(query),
    ]);
    res.json({ success: true, data: products, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) { next(error); }
};

exports.approveProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { published: true }, { new: true });
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    logger.info(`Product approved: ${product.title}`);
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
};

exports.rejectProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { published: false }, { new: true });
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    logger.info(`Product rejected: ${product.title}`);
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('vendorId', 'storeName').lean();
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
};

exports.createProduct = async (req, res, next) => {
  try {
    // Admin can create products and optionally assign to a vendor
    // If no vendorId provided, find or create a system vendor
    let vendorId = req.body.vendorId;

    if (!vendorId) {
      // Find first active vendor or create a default system vendor
      let vendor = await Vendor.findOne({ status: 'active' });

      if (!vendor) {
        // Create a system vendor if none exists
        let systemUser = await User.findOne({ email: 'system@example.com' });

        if (!systemUser) {
          systemUser = await User.create({
            name: 'System Vendor',
            email: 'system@example.com',
            password: 'System@123',
            role: 'vendor',
          });
        }

        vendor = await Vendor.create({
          userId: systemUser._id,
          storeName: 'System Store',
          slug: 'system-store',
          status: 'active',
        });
      }

      vendorId = vendor._id;
    }

    const product = await Product.create({
      ...req.body,
      vendorId,
      slug: req.body.slug || slugify(req.body.title),
      sku: req.body.sku || generateSKU(),
    });

    logger.info(`Product created by admin: ${product.title}`);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    logger.error('Product creation error:', error);
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    // Use findById + save to ensure proper validation context (this.price works in validators)
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });

    // Update fields from request body
    Object.keys(req.body).forEach(key => {
      product[key] = req.body[key];
    });

    await product.save();
    logger.info(`Product updated by admin: ${product.title}`);
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    logger.info(`Product deleted by admin: ${product.title}`);
    res.json({ success: true, data: { message: 'Product deleted successfully' } });
  } catch (error) { next(error); }
};

// ---------- Categories ----------
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const cat = await Category.create({ ...req.body, slug: slugify(req.body.name) });
    logger.info(`Category created: ${cat.name}`);
    res.status(201).json({ success: true, data: cat });
  } catch (error) { next(error); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    // If name is being updated and no custom slug provided, regenerate slug
    if (req.body.name && !req.body.slug) {
      req.body.slug = slugify(req.body.name);
    }
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cat) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
    logger.info(`Category updated: ${cat.name}`);
    res.json({ success: true, data: cat });
  } catch (error) { next(error); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
    logger.info(`Category deleted: ${cat.name}`);
    res.json({ success: true, data: { message: 'Category deleted successfully' } });
  } catch (error) { next(error); }
};

// ---------- Orders ----------
exports.getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, vendorId, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (vendorId) query['items.vendorId'] = vendorId;
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'shipTo.fullName': { $regex: search, $options: 'i' } },
        { guestEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
    ]);

    // Populate vendor information for each order item
    for (const order of orders) {
      if (order.items && order.items.length > 0) {
        // Get unique vendor IDs from order items
        const vendorIds = [...new Set(order.items.map(item => item.vendorId).filter(Boolean))];

        if (vendorIds.length > 0) {
          // Fetch all vendors in one query
          const vendors = await Vendor.find({ _id: { $in: vendorIds } })
            .select('storeName slug logo')
            .lean();

          // Create a map for quick lookup
          const vendorMap = {};
          vendors.forEach(v => {
            vendorMap[v._id.toString()] = v;
          });

          // Attach vendor info to each item
          order.items.forEach(item => {
            if (item.vendorId) {
              item.vendor = vendorMap[item.vendorId.toString()] || null;
            }
          });
        }
      }
    }

    res.json({ success: true, data: orders, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) { next(error); }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name email phone').lean();
    if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });

    // Populate vendor information for order items
    if (order.items && order.items.length > 0) {
      const vendorIds = [...new Set(order.items.map(item => item.vendorId).filter(Boolean))];

      if (vendorIds.length > 0) {
        const vendors = await Vendor.find({ _id: { $in: vendorIds } })
          .select('storeName slug logo')
          .lean();

        const vendorMap = {};
        vendors.forEach(v => {
          vendorMap[v._id.toString()] = v;
        });

        order.items.forEach(item => {
          if (item.vendorId) {
            item.vendor = vendorMap[item.vendorId.toString()] || null;
          }
        });
      }
    }

    res.json({ success: true, data: order });
  } catch (error) { next(error); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, description } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });

    order.status = status;
    order.events.push({ status, description: description || `Order status updated to ${status}`, timestamp: new Date() });
    await order.save();

    // Activate warranties when order is paid
    if (status === 'paid') {
      await activateWarrantiesForOrder(order);
    }

    // Auto-approve commissions when order is delivered
    if (status === 'delivered') {
      const payoutService = require('../services/payoutService');
      await payoutService.autoApproveCommissions(order._id);
      logger.info(`Auto-approved commissions for delivered order: ${order.orderId}`);
    }

    logger.info(`Order status updated: ${order.orderId} -> ${status}`);
    res.json({ success: true, data: order });
  } catch (error) { next(error); }
};

// ---------- Vendors ----------
exports.getVendors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { storeName: new RegExp(search, 'i') },
        { slug: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [vendors, total] = await Promise.all([
      Vendor.find(query).populate('userId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Vendor.countDocuments(query),
    ]);

    res.json({ success: true, data: vendors, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) { next(error); }
};

exports.approveVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status: 'active', 'kyc.status': 'approved', 'kyc.verifiedAt': new Date() },
      { new: true }
    ).populate('userId');
    if (!vendor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    logger.info(`Vendor approved: ${vendor.storeName}`);

    // Notify vendor of approval
    try {
      await notificationHelper.notifyVendorApprovalStatus({
        vendorUserId: vendor.userId._id || vendor.userId,
        vendor,
        status: 'approved',
      });
      logger.info(`Vendor notified of approval: ${vendor.storeName}`);
    } catch (notifError) {
      logger.error('Failed to notify vendor of approval:', notifError);
    }

    res.json({ success: true, data: vendor });
  } catch (error) { next(error); }
};

exports.rejectVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        'kyc.status': 'rejected',
        'kyc.rejectionReason': req.body.reason,
        'kyc.rejectedAt': new Date()
      },
      { new: true }
    ).populate('userId');
    if (!vendor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    logger.info(`Vendor rejected: ${vendor.storeName}, Reason: ${req.body.reason}`);

    // Notify vendor of rejection
    try {
      await notificationHelper.notifyVendorApprovalStatus({
        vendorUserId: vendor.userId._id || vendor.userId,
        vendor,
        status: 'rejected',
        rejectionReason: req.body.reason,
      });
      logger.info(`Vendor notified of rejection: ${vendor.storeName}`);
    } catch (notifError) {
      logger.error('Failed to notify vendor of rejection:', notifError);
    }

    res.json({ success: true, data: vendor });
  } catch (error) { next(error); }
};

exports.suspendVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true });
    if (!vendor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
    await Product.updateMany({ vendorId: vendor._id }, { published: false });
    logger.info(`Vendor suspended: ${vendor.storeName}`);
    res.json({ success: true, data: vendor });
  } catch (error) { next(error); }
};

exports.deleteVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });

    // Delete all products belonging to this vendor
    await Product.deleteMany({ vendorId: vendor._id });

    // Delete all commissions for this vendor
    await Commission.deleteMany({ vendorId: vendor._id });

    // Delete the vendor profile
    await Vendor.findByIdAndDelete(req.params.id);

    logger.info(`Vendor deleted: ${vendor.storeName} (ID: ${vendor._id})`);
    res.json({ success: true, data: { message: 'Vendor and associated data deleted successfully' } });
  } catch (error) { next(error); }
};

exports.updateVendorCommission = async (req, res, next) => {
  try {
    const { defaultCommissionPercentage } = req.body;

    // Validate commission percentage
    if (defaultCommissionPercentage === undefined || defaultCommissionPercentage === null) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Commission percentage is required' }
      });
    }

    if (defaultCommissionPercentage < 0 || defaultCommissionPercentage > 100) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Commission percentage must be between 0 and 100' }
      });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { defaultCommissionPercentage },
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor not found' }
      });
    }

    // Log the commission change
    await AuditLog.create({
      action: 'vendor_commission_updated',
      userId: req.user._id,
      entity: 'Vendor',
      entityId: vendor._id,
      changes: {
        vendorName: vendor.storeName,
        newCommission: defaultCommissionPercentage,
      },
    });

    logger.info(`Vendor commission updated: ${vendor.storeName} - ${defaultCommissionPercentage}%`);

    res.json({
      success: true,
      data: vendor,
      message: `Commission updated to ${defaultCommissionPercentage}% for ${vendor.storeName}`
    });
  } catch (error) {
    next(error);
  }
};

// Update vendor category-based commission rules
exports.updateVendorCommissionRules = async (req, res, next) => {
  try {
    const { commissionRules } = req.body;

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { commissionRules },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor not found' }
      });
    }

    logger.info(`Vendor commission rules updated: ${vendor.storeName}`);
    res.json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

// Update affiliate category-based commission rules
exports.updateAffiliateCommissionRules = async (req, res, next) => {
  try {
    const { commissionRules } = req.body;

    const affiliate = await Affiliate.findByIdAndUpdate(
      req.params.id,
      { commissionRules },
      { new: true }
    );

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate not found' }
      });
    }

    logger.info(`Affiliate commission rules updated: ${affiliate.code}`);
    res.json({ success: true, data: affiliate });
  } catch (error) {
    next(error);
  }
};

// Update product category-based commission rules
exports.updateProductCommissionRules = async (req, res, next) => {
  try {
    const { vendorCommissionRules, affiliateCommissionRules } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        vendorCommissionRules: vendorCommissionRules || [],
        affiliateCommissionRules: affiliateCommissionRules || []
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' }
      });
    }

    logger.info(`Product commission rules updated: ${product.title}`);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// ---------- KYC Review ----------
exports.getPendingKYC = async (req, res, next) => {
  try {
    const { type } = req.query; // 'vendor' or 'affiliate' or undefined for all

    let vendors = [];
    let affiliates = [];
    let totalVendors = 0;
    let totalAffiliates = 0;

    // Fetch pending vendors
    if (!type || type === 'vendor') {
      [vendors, totalVendors] = await Promise.all([
        Vendor.find({ 'kyc.status': 'pending' })
          .populate('userId', 'name email')
          .sort({ createdAt: -1 })
          .lean(),
        Vendor.countDocuments({ 'kyc.status': 'pending' }),
      ]);
      // Add type field to each vendor
      vendors = vendors.map(v => ({ ...v, type: 'vendor' }));
    }

    // Fetch pending affiliates
    if (!type || type === 'affiliate') {
      [affiliates, totalAffiliates] = await Promise.all([
        Affiliate.find({ 'kyc.status': 'pending' })
          .populate('userId', 'name email')
          .sort({ createdAt: -1 })
          .lean(),
        Affiliate.countDocuments({ 'kyc.status': 'pending' }),
      ]);
      // Add type field to each affiliate
      affiliates = affiliates.map(a => ({ ...a, type: 'affiliate' }));
    }

    // Combine and sort by date
    const allSubmissions = [...vendors, ...affiliates].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      data: allSubmissions,
      meta: {
        total: allSubmissions.length,
        totalVendors,
        totalAffiliates,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.approveVendorKYC = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      {
        status: 'active',
        'kyc.status': 'approved',
        'kyc.verifiedAt': new Date(),
        'kyc.verifiedBy': req.user._id
      },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor not found' }
      });
    }

    logger.info(`Vendor KYC approved: ${vendor.storeName} by admin ${req.user._id}`);
    res.json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

exports.rejectVendorKYC = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        'kyc.status': 'rejected',
        'kyc.rejectionReason': req.body.reason,
        'kyc.rejectedAt': new Date()
      },
      { new: true }
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor not found' }
      });
    }

    logger.info(`Vendor KYC rejected: ${vendor.storeName}, Reason: ${req.body.reason}`);
    res.json({ success: true, data: vendor });
  } catch (error) {
    next(error);
  }
};

exports.approveAffiliateKYC = async (req, res, next) => {
  try {
    const affiliate = await Affiliate.findByIdAndUpdate(
      req.params.id,
      {
        'kyc.status': 'approved',
        'kyc.verifiedAt': new Date(),
        status: 'active',
        approvedAt: new Date()
      },
      { new: true }
    );

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate not found' }
      });
    }

    logger.info(`Affiliate KYC approved: ${affiliate.code} by admin ${req.user._id}`);
    res.json({ success: true, data: affiliate });
  } catch (error) {
    next(error);
  }
};

exports.rejectAffiliateKYC = async (req, res, next) => {
  try {
    const affiliate = await Affiliate.findByIdAndUpdate(
      req.params.id,
      {
        'kyc.status': 'rejected',
        'kyc.rejectionReason': req.body.reason,
        status: 'rejected',
        rejectionReason: req.body.reason
      },
      { new: true }
    );

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate not found' }
      });
    }

    logger.info(`Affiliate KYC rejected: ${affiliate.code}, Reason: ${req.body.reason}`);
    res.json({ success: true, data: affiliate });
  } catch (error) {
    next(error);
  }
};

// ---------- Affiliates ----------
exports.getAffiliates = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [affiliates, total] = await Promise.all([
      Affiliate.find(query).populate('userId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Affiliate.countDocuments(query),
    ]);

    res.json({ success: true, data: affiliates, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) { next(error); }
};

exports.approveAffiliate = async (req, res, next) => {
  try {
    const aff = await Affiliate.findByIdAndUpdate(req.params.id, { status: 'active', approvedAt: new Date() }, { new: true }).populate('userId');
    if (!aff) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Affiliate not found' } });
    logger.info(`Affiliate approved: ${aff.code}`);

    // Notify affiliate of approval
    try {
      await notificationHelper.notifyAffiliateApprovalStatus({
        affiliateUserId: aff.userId._id || aff.userId,
        status: 'approved',
      });
      logger.info(`Affiliate notified of approval: ${aff.code}`);
    } catch (notifError) {
      logger.error('Failed to notify affiliate of approval:', notifError);
    }

    res.json({ success: true, data: aff });
  } catch (error) { next(error); }
};

exports.rejectAffiliate = async (req, res, next) => {
  try {
    const aff = await Affiliate.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: req.body.reason }, { new: true }).populate('userId');
    if (!aff) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Affiliate not found' } });
    logger.info(`Affiliate rejected: ${aff.code}`);

    // Notify affiliate of rejection
    try {
      await notificationHelper.notifyAffiliateApprovalStatus({
        affiliateUserId: aff.userId._id || aff.userId,
        status: 'rejected',
        rejectionReason: req.body.reason,
      });
      logger.info(`Affiliate notified of rejection: ${aff.code}`);
    } catch (notifError) {
      logger.error('Failed to notify affiliate of rejection:', notifError);
    }

    res.json({ success: true, data: aff });
  } catch (error) { next(error); }
};

exports.suspendAffiliate = async (req, res, next) => {
  try {
    const aff = await Affiliate.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true });
    if (!aff) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Affiliate not found' } });
    logger.info(`Affiliate suspended: ${aff.code}`);
    res.json({ success: true, data: aff });
  } catch (error) { next(error); }
};

exports.deleteAffiliate = async (req, res, next) => {
  try {
    const affiliate = await Affiliate.findById(req.params.id);
    if (!affiliate) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Affiliate not found' } });

    // Delete all commissions for this affiliate
    await Commission.deleteMany({ affiliateId: affiliate._id });

    // Delete the affiliate profile
    await Affiliate.findByIdAndDelete(req.params.id);

    logger.info(`Affiliate deleted: ${affiliate.code} (ID: ${affiliate._id})`);
    res.json({ success: true, data: { message: 'Affiliate and associated data deleted successfully' } });
  } catch (error) { next(error); }
};

// ---------- Commissions / Payouts ----------
exports.getCommissions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [rows, total] = await Promise.all([
      Commission.find(query)
        .populate('orderId', 'orderId totals')
        .populate({
          path: 'subjectId',
          populate: { path: 'userId', select: 'name email' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Commission.countDocuments(query),
    ]);

    res.json({ success: true, data: { commissions: rows }, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) { next(error); }
};

exports.getCommissionStats = async (req, res, next) => {
  try {
    const { type } = req.query;
    const query = type ? { type } : {};

    const [totalStats, pendingStats, paidStats, affiliateCount, vendorCount] = await Promise.all([
      Commission.aggregate([
        { $match: query },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
      ]),
      Commission.aggregate([
        { $match: { ...query, status: 'pending' } },
        { $group: { _id: null, pendingAmount: { $sum: '$amount' }, pendingCount: { $sum: 1 } } }
      ]),
      Commission.aggregate([
        { $match: { ...query, status: 'paid' } },
        { $group: { _id: null, paidAmount: { $sum: '$amount' }, paidCount: { $sum: 1 } } }
      ]),
      type === 'affiliate' ? Affiliate.countDocuments({ status: 'active' }) : Promise.resolve(0),
      type === 'vendor' || !type ? Vendor.countDocuments({ status: 'active' }) : Promise.resolve(0)
    ]);

    const stats = {
      totalAmount: totalStats[0]?.totalAmount || 0,
      pendingAmount: pendingStats[0]?.pendingAmount || 0,
      pendingCount: pendingStats[0]?.pendingCount || 0,
      paidAmount: paidStats[0]?.paidAmount || 0,
      paidCount: paidStats[0]?.paidCount || 0,
      affiliateCount: affiliateCount,
      vendorCount: vendorCount
    };

    res.json({ success: true, data: stats });
  } catch (error) { next(error); }
};

exports.approveCommission = async (req, res, next) => {
  try {
    const row = await Commission.findByIdAndUpdate(req.params.id, { status: 'approved', approvedAt: new Date() }, { new: true });
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Commission not found' } });
    logger.info(`Commission approved: ${row._id}`);
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
};

exports.payCommission = async (req, res, next) => {
  try {
    const row = await Commission.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidAt: new Date(), paymentRef: req.body.paymentRef },
      { new: true }
    );
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Commission not found' } });
    if (row.type === 'affiliate') {
      const affiliate = await Affiliate.findByIdAndUpdate(
        row.subjectId,
        { $inc: { paidEarnings: row.amount, pendingEarnings: -row.amount } }
      ).populate('userId');

      // Notify affiliate of payment
      if (affiliate && affiliate.userId) {
        try {
          await notificationHelper.notifyAffiliateCommissionPaid({
            affiliateUserId: affiliate.userId._id || affiliate.userId,
            commission: row,
            amount: row.amount,
          });
          logger.info(`Affiliate notified of commission payment: ${row._id}`);
        } catch (notifError) {
          logger.error('Failed to notify affiliate of commission payment:', notifError);
        }
      }
    }
    logger.info(`Commission paid: ${row._id}`);
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
};

exports.rejectCommission = async (req, res, next) => {
  try {
    const row = await Commission.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', rejectedAt: new Date() },
      { new: true }
    );
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Commission not found' } });
    logger.info(`Commission rejected: ${row._id}`);
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
};

exports.bulkApproveCommissions = async (req, res, next) => {
  try {
    const { commissionIds } = req.body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'commissionIds must be a non-empty array' }
      });
    }

    const approvedAt = new Date();
    const result = await Commission.updateMany(
      { _id: { $in: commissionIds }, status: 'pending' },
      { status: 'approved', approvedAt }
    );

    logger.info(`Bulk approved ${result.modifiedCount} commissions`);
    res.json({
      success: true,
      data: {
        count: result.modifiedCount,
        message: `${result.modifiedCount} commission(s) approved`
      }
    });
  } catch (error) { next(error); }
};

exports.bulkPayCommissions = async (req, res, next) => {
  try {
    const { commissionIds } = req.body;

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'commissionIds must be a non-empty array' }
      });
    }

    const paidAt = new Date();
    // Allow paying commissions that are either 'pending' OR 'approved'
    const result = await Commission.updateMany(
      { _id: { $in: commissionIds }, status: { $in: ['pending', 'approved'] } },
      { status: 'paid', paidAt }
    );

    // Update affiliate earnings for all affected commissions
    const commissions = await Commission.find({ _id: { $in: commissionIds }, type: 'affiliate' });
    for (const comm of commissions) {
      await Affiliate.findByIdAndUpdate(comm.subjectId, {
        $inc: { paidEarnings: comm.amount, pendingEarnings: -comm.amount }
      });
    }

    logger.info(`Bulk pay: ${result.modifiedCount} commissions paid`);
    res.json({ success: true, data: { count: result.modifiedCount } });
  } catch (error) { next(error); }
};

exports.getPayouts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = { status: 'paid' };
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [rows, total] = await Promise.all([
      Commission.find(query)
        .populate('orderId', 'orderId')
        .populate('subjectId')
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Commission.countDocuments(query),
    ]);

    res.json({ success: true, data: rows, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) { next(error); }
};

exports.createPayout = async (req, res, next) => {
  try {
    const { type, subjectId, amount, paymentRef } = req.body;
    const list = await Commission.find({ type, subjectId, status: 'approved' });
    const available = list.reduce((s, c) => s + c.amount, 0);
    if (amount > available) {
      return res.status(400).json({ success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'Requested amount exceeds available balance' } });
    }
    let remaining = amount;
    for (const c of list) {
      if (remaining <= 0) break;
      const payAmount = Math.min(remaining, c.amount);
      c.status = 'paid';
      c.paidAt = new Date();
      c.paymentRef = paymentRef;
      await c.save();
      remaining -= payAmount;
    }
    res.json({ success: true, data: { message: 'Payout created successfully', amount } });
  } catch (error) { next(error); }
};

// ---------- Ads ----------
exports.getAdCampaigns = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [rows, total] = await Promise.all([
      AdCampaign.find(query).populate('vendorId', 'storeName').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      AdCampaign.countDocuments(query),
    ]);

    res.json({ success: true, data: rows, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) { next(error); }
};

exports.updateAdCampaignStatus = async (req, res, next) => {
  try {
    const row = await AdCampaign.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    logger.info(`Ad campaign status updated: ${row.name} -> ${req.body.status}`);
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
};

exports.createAdCampaign = async (req, res, next) => {
  try {
    const campaign = await AdCampaign.create(req.body);
    logger.info(`Ad campaign created: ${campaign.name}`);

    // Auto-create AdCreative for Banner campaigns or SponsoredProduct campaigns with banner images
    // Create multiple creatives for different placements
    if (campaign.bannerImage && (campaign.type === 'Banner' || campaign.type === 'SponsoredProduct')) {
      const placements = ['homepage_banner', 'search_grid'];

      for (const placement of placements) {
        const creative = await AdCreative.create({
          campaignId: campaign._id,
          placement: placement,
          headline: campaign.name,
          description: 'Sponsored Advertisement',
          status: 'active',
          bannerAsset: {
            imageUrl: campaign.bannerImage,
            imageAlt: campaign.name,
            clickUrl: '/', // Default to homepage, can be customized later
            dimensions: {
              width: 1200,
              height: 400,
            },
          },
        });
        logger.info(`AdCreative auto-created for ${campaign.type} campaign with placement ${placement}: ${creative._id}`);
      }
    }

    res.status(201).json({ success: true, data: campaign });
  } catch (error) { next(error); }
};

exports.updateAdCampaign = async (req, res, next) => {
  try {
    const campaign = await AdCampaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!campaign) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    logger.info(`Ad campaign updated: ${campaign.name}`);

    // Update or create AdCreative when banner image is updated (for Banner or SponsoredProduct campaigns)
    if (campaign.bannerImage && (campaign.type === 'Banner' || campaign.type === 'SponsoredProduct')) {
      const placements = ['homepage_banner', 'search_grid'];
      const existingCreatives = await AdCreative.find({ campaignId: campaign._id });

      if (existingCreatives.length > 0) {
        // Update all existing creatives
        for (const creative of existingCreatives) {
          creative.headline = campaign.name;
          creative.bannerAsset = {
            imageUrl: campaign.bannerImage,
            imageAlt: campaign.name,
            clickUrl: creative.bannerAsset?.clickUrl || '/',
            dimensions: {
              width: 1200,
              height: 400,
            },
          };
          await creative.save();
          logger.info(`AdCreative updated for ${campaign.type} campaign: ${creative._id}`);
        }

        // Check if we need to create creatives for missing placements
        const existingPlacements = existingCreatives.map(c => c.placement);
        const missingPlacements = placements.filter(p => !existingPlacements.includes(p));

        for (const placement of missingPlacements) {
          const creative = await AdCreative.create({
            campaignId: campaign._id,
            placement: placement,
            headline: campaign.name,
            description: 'Sponsored Advertisement',
            status: 'active',
            bannerAsset: {
              imageUrl: campaign.bannerImage,
              imageAlt: campaign.name,
              clickUrl: '/',
              dimensions: {
                width: 1200,
                height: 400,
              },
            },
          });
          logger.info(`AdCreative created for missing placement ${placement}: ${creative._id}`);
        }
      } else {
        // Create new creatives if none exist
        for (const placement of placements) {
          const creative = await AdCreative.create({
            campaignId: campaign._id,
            placement: placement,
            headline: campaign.name,
            description: 'Sponsored Advertisement',
            status: 'active',
            bannerAsset: {
              imageUrl: campaign.bannerImage,
              imageAlt: campaign.name,
              clickUrl: '/',
              dimensions: {
                width: 1200,
                height: 400,
              },
            },
          });
          logger.info(`AdCreative auto-created for ${campaign.type} campaign on update with placement ${placement}: ${creative._id}`);
        }
      }
    }

    res.json({ success: true, data: campaign });
  } catch (error) { next(error); }
};

exports.deleteAdCampaign = async (req, res, next) => {
  try {
    const campaign = await AdCampaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
    logger.info(`Ad campaign deleted: ${campaign.name}`);
    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error) { next(error); }
};

// ---------- Blog (Posts/Pages) ----------
exports.getPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [rows, total] = await Promise.all([
      Post.find().populate('author', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Post.countDocuments(),
    ]);
    res.json({ success: true, data: rows, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) { next(error); }
};

exports.createPost = async (req, res, next) => {
  try {
    const row = await Post.create({ ...req.body, author: req.user._id, slug: slugify(req.body.title) });
    logger.info(`Post created: ${row.title}`);
    res.status(201).json({ success: true, data: row });
  } catch (error) { next(error); }
};

exports.updatePost = async (req, res, next) => {
  try {
    const row = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
};

exports.deletePost = async (req, res, next) => {
  try {
    const row = await Post.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    logger.info(`Post deleted: ${row.title}`);
    res.json({ success: true, data: { message: 'Post deleted successfully' } });
  } catch (error) { next(error); }
};

exports.getPages = async (req, res, next) => {
  try {
    const rows = await Page.find().sort({ title: 1 }).lean();
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.createPage = async (req, res, next) => {
  try {
    const row = await Page.create({ ...req.body, slug: slugify(req.body.title) });
    logger.info(`Page created: ${row.title}`);
    res.status(201).json({ success: true, data: row });
  } catch (error) { next(error); }
};

exports.updatePage = async (req, res, next) => {
  try {
    const row = await Page.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Page not found' } });
    res.json({ success: true, data: row });
  } catch (error) { next(error); }
};

exports.deletePage = async (req, res, next) => {
  try {
    const row = await Page.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Page not found' } });
    logger.info(`Page deleted: ${row.title}`);
    res.json({ success: true, data: { message: 'Page deleted successfully' } });
  } catch (error) { next(error); }
};

// ---------- Settings ----------
exports.getSettings = async (req, res, next) => {
  try {
    const category = (req.query.category || 'general').toLowerCase();
    const list = await Setting.find({ category }).sort({ key: 1 }).lean();
    res.json({ success: true, data: list });
  } catch (error) { next(error); }
};

exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, type, category, description } = req.body;
    const setting = await Setting.set(key, value, type || 'string', category || 'general');
    if (description) {
      setting.description = description;
      await setting.save();
    }
    logger.info(`Setting updated: ${key}`);
    res.json({ success: true, data: setting });
  } catch (error) { next(error); }
};

// ---------- Audit ----------
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, userId, entity, action } = req.query;
    const query = {};
    if (userId) query.userId = userId;
    if (entity) query.entity = entity;
    if (action) query.action = action;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [rows, total] = await Promise.all([
      AuditLog.find(query).populate('userId', 'name email').sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({ success: true, data: rows, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) { next(error); }
};

//
// CONTACT SUBMISSIONS
//
const ContactSubmission = require('../models/ContactSubmission');

exports.getContactSubmissions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [submissions, total] = await Promise.all([
      ContactSubmission.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ContactSubmission.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: submissions,
      meta: getPaginationMeta(total, +page, +limit),
    });
  } catch (error) {
    next(error);
  }
};

exports.getContactSubmissionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const submission = await ContactSubmission.findById(id).lean();

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact submission not found' },
      });
    }

    // Mark as read if it's new
    if (submission.status === 'new') {
      await ContactSubmission.findByIdAndUpdate(id, { status: 'read' });
    }

    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

exports.updateContactSubmissionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'read', 'replied', 'resolved', 'spam'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Invalid_status value' },
      });
    }

    const updateData = { status };
    if (status === 'replied') updateData.repliedAt = new Date();
    if (status === 'resolved') updateData.resolvedAt = new Date();

    const submission = await ContactSubmission.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact submission not found' },
      });
    }

    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

exports.updateContactSubmissionNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const submission = await ContactSubmission.findByIdAndUpdate(
      id,
      { adminNotes },
      { new: true }
    ).lean();

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact submission not found' },
      });
    }

    res.json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

exports.deleteContactSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const submission = await ContactSubmission.findByIdAndDelete(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact submission not found' },
      });
    }

    res.json({ success: true, message: 'Contact submission deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// NOTE: getPendingKYC is defined earlier in this file (line ~669) - removed duplicate definition here

exports.getVendorKYC = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id).populate('userId', 'name email');

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
};

exports.getAffiliateKYC = async (req, res, next) => {
  try {
    const { id } = req.params;
    const affiliate = await Affiliate.findById(id).populate('userId', 'name email');

    if (!affiliate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Affiliate not found' },
      });
    }

    res.json({ success: true, data: affiliate });
  } catch (error) {
    next(error);
  }
};

// NOTE: approveVendorKYC, rejectVendorKYC, approveAffiliateKYC, rejectAffiliateKYC
// are defined earlier in this file (lines ~723-827) - removed duplicate definitions here

// ---------- Reviews Management ----------
exports.getReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, productId, userId, rating } = req.query;
    const query = {};

    if (status) query.status = status;
    if (productId) query.productId = productId;
    if (userId) query.userId = userId;
    if (rating) query.rating = parseInt(rating);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('userId', 'firstName lastName email')
        .populate('productId', 'title slug images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: reviews,
      meta: getPaginationMeta(total, +page, +limit),
    });
  } catch (error) {
    next(error);
  }
};

exports.getReviewById = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('userId', 'firstName lastName email')
      .populate('productId', 'title slug images')
      .lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review not found' },
      });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

exports.updateReviewStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    const reviewId = req.params.id;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Invalid review status' },
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review not found' },
      });
    }

    const oldStatus = review.status;
    review.status = status;
    if (status === 'rejected' && rejectionReason) {
      review.rejectionReason = rejectionReason;
    }
    await review.save();

    // Recalculate product rating if status changed from/to approved
    if (oldStatus !== status && (oldStatus === 'approved' || status === 'approved')) {
      const approvedReviews = await Review.find({
        productId: review.productId,
        status: 'approved',
      });

      if (approvedReviews.length > 0) {
        const avgRating =
          approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length;
        await Product.findByIdAndUpdate(review.productId, {
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: approvedReviews.length,
        });
      } else {
        await Product.findByIdAndUpdate(review.productId, {
          rating: 0,
          reviewCount: 0,
        });
      }
    }

    logger.info(`Review status updated: ${reviewId} to ${status}`);

    const updatedReview = await Review.findById(reviewId)
      .populate('userId', 'firstName lastName email')
      .populate('productId', 'title slug images')
      .lean();

    res.json({
      success: true,
      data: updatedReview,
      message: `Review ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review not found' },
      });
    }

    const wasApproved = review.status === 'approved';
    const productId = review.productId;

    await Review.findByIdAndDelete(req.params.id);

    // Recalculate product rating if the deleted review was approved
    if (wasApproved) {
      const approvedReviews = await Review.find({
        productId,
        status: 'approved',
      });

      if (approvedReviews.length > 0) {
        const avgRating =
          approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length;
        await Product.findByIdAndUpdate(productId, {
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: approvedReviews.length,
        });
      } else {
        await Product.findByIdAndUpdate(productId, {
          rating: 0,
          reviewCount: 0,
        });
      }
    }

    logger.info(`Review deleted: ${req.params.id}`);

    res.json({
      success: true,
      data: { message: 'Review deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};

exports.respondToReview = async (req, res, next) => {
  try {
    const { text } = req.body;
    const reviewId = req.params.id;

    if (!text || text.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Response must be at least 10 characters',
        },
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review not found' },
      });
    }

    review.vendorResponse = {
      text: text.trim(),
      respondedAt: new Date(),
      respondedBy: req.user._id,
    };
    await review.save();

    logger.info(`Admin responded to review: ${reviewId}`);

    const updatedReview = await Review.findById(reviewId)
      .populate('userId', 'firstName lastName email')
      .populate('productId', 'title slug images')
      .populate('vendorResponse.respondedBy', 'firstName lastName email')
      .lean();

    res.json({
      success: true,
      data: updatedReview,
      message: 'Response added successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Enhanced Payout Management ----------
const payoutService = require('../services/payoutService');

exports.getVendorPendingPayouts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get all vendors with approved commissions
    const vendors = await Vendor.find({ status: 'active' })
      .select('_id storeName userId')
      .lean();

    const vendorPayouts = [];

    for (const vendor of vendors) {
      const balance = await payoutService.getVendorPendingBalance(vendor._id);
      if (balance.totalPending > 0) {
        vendorPayouts.push({
          vendorId: vendor._id,
          vendorName: vendor.storeName,
          pendingAmount: balance.totalPending,
          commissionCount: balance.count,
        });
      }
    }

    // Sort by pending amount descending
    vendorPayouts.sort((a, b) => b.pendingAmount - a.pendingAmount);

    const total = vendorPayouts.length;
    const paginatedData = vendorPayouts.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: paginatedData,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

exports.processVendorPayout = async (req, res, next) => {
  try {
    const { vendorId, amount, commissionIds } = req.body;

    if (!vendorId || !amount) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'vendorId and amount are required',
        },
      });
    }

    // If commissionIds not provided, auto-select approved commissions
    let selectedCommissions = commissionIds;
    if (!selectedCommissions || selectedCommissions.length === 0) {
      const commissions = await Commission.find({
        subjectId: vendorId,
        type: 'vendor',
        status: 'approved',
      }).select('_id amount');

      selectedCommissions = commissions.map(c => c._id);
    }

    const result = await payoutService.processVendorPayout(
      vendorId,
      amount,
      selectedCommissions
    );

    logger.info(`Vendor payout processed by admin: ${vendorId} - ₹${amount}`);

    res.json({
      success: true,
      data: result,
      message: 'Payout processed successfully',
    });
  } catch (error) {
    logger.error('Payout processing failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PAYOUT_FAILED',
        message: error.message,
      },
    });
  }
};

exports.batchProcessVendorPayout = async (req, res, next) => {
  try {
    const { vendorId } = req.params;

    const result = await payoutService.batchPayoutVendor(vendorId);

    logger.info(`Batch payout processed for vendor: ${vendorId}`);

    res.json({
      success: true,
      data: result,
      message: 'Batch payout completed successfully',
    });
  } catch (error) {
    logger.error('Batch payout failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_PAYOUT_FAILED',
        message: error.message,
      },
    });
  }
};

exports.getPayoutHistory = async (req, res, next) => {
  try {
    const { type, subjectId, page = 1, limit = 20 } = req.query;

    if (!type || !subjectId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'type and subjectId are required',
        },
      });
    }

    const result = await payoutService.getPayoutHistory(
      subjectId,
      type,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result.commissions,
      meta: {
        ...getPaginationMeta(
          result.pagination.total,
          result.pagination.page,
          result.pagination.limit
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Payments ----------
exports.getPaymentStats = async (req, res, next) => {
  try {
    // Get all orders with payment information
    const allOrders = await Order.find({}).select('payment totals status');

    // Calculate statistics
    const stats = {
      totalRevenue: 0,
      totalTransactions: 0,
      successfulPayments: 0,
      successfulAmount: 0,
      pendingPayments: 0,
      pendingAmount: 0,
      failedPayments: 0,
      failedAmount: 0,
      paymentMethods: []
    };

    // Payment method breakdown
    const methodBreakdown = {};

    allOrders.forEach(order => {
      const amount = order.totals?.total || 0;
      const paymentStatus = order.payment?.status || order.status;
      const paymentMethod = order.payment?.method || 'unknown';

      stats.totalTransactions++;
      stats.totalRevenue += amount;

      // Count by status
      if (paymentStatus === 'completed' || paymentStatus === 'paid' || order.status === 'paid') {
        stats.successfulPayments++;
        stats.successfulAmount += amount;
      } else if (paymentStatus === 'pending' || order.status === 'placed') {
        stats.pendingPayments++;
        stats.pendingAmount += amount;
      } else if (paymentStatus === 'failed') {
        stats.failedPayments++;
        stats.failedAmount += amount;
      }

      // Payment method breakdown
      if (!methodBreakdown[paymentMethod]) {
        methodBreakdown[paymentMethod] = { count: 0, total: 0 };
      }
      methodBreakdown[paymentMethod].count++;
      methodBreakdown[paymentMethod].total += amount;
    });

    // Convert payment methods to array
    stats.paymentMethods = Object.entries(methodBreakdown).map(([method, data]) => ({
      _id: method,
      count: data.count,
      total: data.total
    }));

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, paymentMethod, status, search } = req.query;

    const query = {};

    // Filter by payment method
    if (paymentMethod) {
      query['payment.method'] = paymentMethod;
    }

    // Filter by status
    if (status) {
      if (status === 'completed' || status === 'paid') {
        query.$or = [
          { 'payment.status': 'completed' },
          { status: 'paid' }
        ];
      } else {
        query['payment.status'] = status;
      }
    }

    // Search by order ID or customer name/email
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'shipTo.fullName': { $regex: search, $options: 'i' } },
        { 'userId.email': { $regex: search, $options: 'i' } },
        { guestEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);

    // Format transactions for frontend
    const transactions = orders.map(order => ({
      _id: order._id,
      orderId: order.orderId,
      customerName: order.shipTo?.fullName || order.userId?.name || 'Guest',
      customerEmail: order.userId?.email || order.guestEmail || '',
      paymentMethod: order.payment?.method || 'N/A',
      amount: order.totals?.total || 0,
      status: order.payment?.status || order.status,
      createdAt: order.createdAt
    }));

    res.json({
      success: true,
      data: transactions,
      meta: getPaginationMeta(total, parseInt(page), parseInt(limit))
    });
  } catch (error) {
    next(error);
  }
};

// Record affiliate payout
exports.recordAffiliatePayout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reference } = req.body;

    const affiliate = await Affiliate.findById(id);
    if (!affiliate) {
      return next(new AppError('Affiliate not found', 404, 'NOT_FOUND'));
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return next(new AppError('Invalid payout amount', 400, 'INVALID_AMOUNT'));
    }

    if (amount > affiliate.pendingEarnings) {
      return next(new AppError('Payout amount exceeds pending earnings', 400, 'AMOUNT_EXCEEDS_PENDING'));
    }

    // Update earnings
    affiliate.pendingEarnings -= amount;
    affiliate.paidEarnings = (affiliate.paidEarnings || 0) + amount;

    await affiliate.save();

    // Create payout record in Commission model
    await Commission.create({
      affiliateId: affiliate._id,
      type: 'payout',
      amount: -amount, // Negative amount for payout
      status: 'paid',
      paidAt: new Date(),
      paymentReference: reference,
      metadata: {
        processedBy: req.user._id,
        processedAt: new Date(),
      },
    });

    logger.info(`Affiliate payout recorded: ${affiliate.code} - ₹${amount} - ${reference}`);

    res.json({
      success: true,
      data: { message: 'Payout recorded successfully' },
    });
  } catch (error) {
    next(error);
  }
};

// CLEANUP: Remove orphaned vendor/affiliate profiles
exports.cleanupOrphanedProfiles = async (req, res, next) => {
  try {
    // Find all vendors
    const vendors = await Vendor.find().lean();
    const orphanedVendors = [];

    for (const vendor of vendors) {
      // Check if userId exists
      if (vendor.userId) {
        const userExists = await User.findById(vendor.userId);
        if (!userExists) {
          orphanedVendors.push(vendor._id);
        }
      } else {
        // userId is null - definitely orphaned
        orphanedVendors.push(vendor._id);
      }
    }

    // Find all affiliates
    const affiliates = await Affiliate.find().lean();
    const orphanedAffiliates = [];

    for (const affiliate of affiliates) {
      // Check if userId exists
      if (affiliate.userId) {
        const userExists = await User.findById(affiliate.userId);
        if (!userExists) {
          orphanedAffiliates.push(affiliate._id);
        }
      } else {
        // userId is null - definitely orphaned
        orphanedAffiliates.push(affiliate._id);
      }
    }

    // Delete orphaned profiles
    const vendorDeleteResult = await Vendor.deleteMany({ _id: { $in: orphanedVendors } });
    const affiliateDeleteResult = await Affiliate.deleteMany({ _id: { $in: orphanedAffiliates } });

    // Delete products for orphaned vendors
    const productDeleteResult = await Product.deleteMany({ vendorId: { $in: orphanedVendors } });

    logger.info(`Cleanup completed: ${vendorDeleteResult.deletedCount} vendors, ${affiliateDeleteResult.deletedCount} affiliates, ${productDeleteResult.deletedCount} products deleted`);

    res.json({
      success: true,
      data: {
        message: 'Cleanup completed successfully',
        vendorsDeleted: vendorDeleteResult.deletedCount,
        affiliatesDeleted: affiliateDeleteResult.deletedCount,
        productsDeleted: productDeleteResult.deletedCount,
        orphanedVendorIds: orphanedVendors,
        orphanedAffiliateIds: orphanedAffiliates
      }
    });
  } catch (error) {
    next(error);
  }
};
