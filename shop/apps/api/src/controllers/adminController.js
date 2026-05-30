const mongoose = require('mongoose');
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
const Carousel = require('../models/Carousel');
const Warranty = require('../models/Warranty');
const { getPaginationMeta, slugify, generateSKU, generateOrderId } = require('../utils/helpers');
const logger = require('../config/logger');
const warrantyService = require('../services/warrantyService');
const notificationHelper = require('../services/notificationHelper');
const payoutService = require('../services/payoutService');
const indexNow = require('../services/indexNowService');
const { sendOrderStatusPush } = require('../services/expoPushService');

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

        const warrantyData = {
          purchaseId: order.orderId,
          orderId: order._id,
          user: {
            id: order.userId || null,
            name: order.shipTo?.fullName || 'Guest',
            email: order.guestEmail || 'N/A',
            phone: order.shipTo?.phone || ''
          },
          product: {
            id: item.productId,
            name: item.name || productDetails?.title || productDetails?.name || 'Unknown Product',
            model: productDetails?.sku || '',
            serial: '',
            category: typeof productDetails?.category === 'string' ? productDetails.category : ''
          },
          purchaseDate: order.createdAt || now,
          warrantyPeriodDays: warrantyPeriodDays,
          warrantyType: 'manufacturer',
          extraInfo: {
            store: 'V-Tech',
            invoiceNo: order.orderId,
            remarks: item.warranty.description || ''
          }
        };
        logger.info(`Creating warranty record for ${item.name} in order ${order.orderId} with data: ${JSON.stringify({ purchaseId: warrantyData.purchaseId, userId: warrantyData.user.id, productId: String(warrantyData.product.id), warrantyPeriodDays })}`);

        await warrantyService.generateWarranty(warrantyData);
        logger.info(`Warranty generated successfully for product ${item.name} in order ${order.orderId}`);
      } catch (error) {
        logger.error(`Failed to generate warranty for ${item.name} in order ${order.orderId}: ${error.message}`, { stack: error.stack });
      }
    }
  }

  await order.save();
  logger.info(`Warranties activated for order: ${order.orderId}`);
};

// ---------- Dashboard ----------
// Helper: Get date range for period
const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate, prevStartDate, prevEndDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = now;
      // Previous = yesterday
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
      prevEndDate = new Date(startDate);
      break;
    case '7days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      endDate = now;
      // Previous = 7 days before that
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      prevEndDate = new Date(startDate);
      break;
    case '30days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      endDate = now;
      // Previous = 30 days before that
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 30);
      prevEndDate = new Date(startDate);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
      // Previous = last month
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      // All time - no date filter
      return { startDate: null, endDate: null, prevStartDate: null, prevEndDate: null };
  }

  return { startDate, endDate, prevStartDate, prevEndDate };
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const { period = '30days' } = req.query;
    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(period);

    // Build date filter for current period
    const dateFilter = startDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};
    const prevDateFilter = prevStartDate ? { createdAt: { $gte: prevStartDate, $lt: prevEndDate } } : {};

    // Current period stats
    const [totalUsers, totalVendors, totalProducts, totalOrders, revenueAgg] = await Promise.all([
      User.countDocuments(dateFilter),
      Vendor.countDocuments({ status: 'active', ...dateFilter }),
      Product.countDocuments({ published: true, ...dateFilter }),
      Order.countDocuments(dateFilter),
      Order.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, total: { $sum: '$totals.total' } } }
      ]),
    ]);

    // Previous period stats for trend comparison
    const [prevUsers, prevVendors, prevProducts, prevOrders, prevRevenueAgg] = await Promise.all([
      prevStartDate ? User.countDocuments(prevDateFilter) : Promise.resolve(0),
      prevStartDate ? Vendor.countDocuments({ status: 'active', ...prevDateFilter }) : Promise.resolve(0),
      prevStartDate ? Product.countDocuments({ published: true, ...prevDateFilter }) : Promise.resolve(0),
      prevStartDate ? Order.countDocuments(prevDateFilter) : Promise.resolve(0),
      prevStartDate ? Order.aggregate([
        { $match: prevDateFilter },
        { $group: { _id: null, total: { $sum: '$totals.total' } } }
      ]) : Promise.resolve([]),
    ]);

    // Pending actions for alert banner
    const [pendingVendors, pendingAffiliates, pendingOrders, pendingKYC, pendingTickets] = await Promise.all([
      Vendor.countDocuments({ status: 'pending' }),
      Affiliate.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: { $in: ['placed', 'paid'] } }), // Orders needing shipment
      Vendor.countDocuments({ 'kyc.status': 'pending' }),
      // Assuming SupportTicket model exists, otherwise return 0
      mongoose.models.SupportTicket
        ? mongoose.models.SupportTicket.countDocuments({ status: 'open' })
        : Promise.resolve(0),
    ]);

    // Commission stats - vendor, affiliate, and overall
    const commissionDateFilter = startDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};
    const [vendorCommissions, affiliateCommissions, allCommissions] = await Promise.all([
      Commission.aggregate([
        { $match: { type: 'vendor', ...commissionDateFilter } },
        { $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }}
      ]),
      Commission.aggregate([
        { $match: { type: 'affiliate', ...commissionDateFilter } },
        { $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }}
      ]),
      Commission.aggregate([
        { $match: commissionDateFilter },
        { $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }}
      ]),
    ]);

    const mapStats = (agg) => {
      const result = { total: 0, pending: 0, approved: 0, paid: 0, pendingCount: 0, approvedCount: 0, paidCount: 0 };
      agg.forEach(item => {
        result.total += item.total;
        if (item._id === 'pending') { result.pending = item.total; result.pendingCount = item.count; }
        if (item._id === 'approved') { result.approved = item.total; result.approvedCount = item.count; }
        if (item._id === 'paid') { result.paid = item.total; result.paidCount = item.count; }
      });
      return result;
    };

    const totalRevenue = revenueAgg[0]?.total || 0;
    const prevRevenue = prevRevenueAgg[0]?.total || 0;
    const vendorComm = mapStats(vendorCommissions);
    const affiliateComm = mapStats(affiliateCommissions);
    const allComm = mapStats(allCommissions);

    // Admin commission = Total Revenue - All Commissions (vendor + affiliate)
    const adminCommission = totalRevenue - allComm.total;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        totalProducts,
        totalOrders,
        totalRevenue,
        // Pending actions for alert banner
        pendingOrders,
        pendingKYC,
        pendingTickets,
        pendingApprovals: (pendingVendors || 0) + (pendingAffiliates || 0),
        // Previous period for trend indicators
        previousPeriod: {
          totalUsers: prevUsers,
          totalVendors: prevVendors,
          totalProducts: prevProducts,
          totalOrders: prevOrders,
          totalRevenue: prevRevenue,
        },
        commissions: {
          vendor: vendorComm,
          affiliate: affiliateComm,
          admin: adminCommission > 0 ? adminCommission : 0,
          total: allComm.total,
        },
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
        await Commission.deleteMany({ subjectId: affiliate._id, type: 'affiliate' });
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

exports.getUserStats = async (req, res, next) => {
  try {
    const [total, customers, vendors, affiliates, admins, activeToday, newThisWeek] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'vendor' }),
      User.countDocuments({ role: 'affiliate' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    ]);

    res.json({
      success: true,
      data: { total, customers, vendors, affiliates, admins, activeToday, newThisWeek },
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkUpdateUsers = async (req, res, next) => {
  try {
    const { userIds, action } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'userIds array is required' },
      });
    }

    if (!['activate', 'deactivate', 'delete'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ACTION', message: 'action must be activate, deactivate, or delete' },
      });
    }

    let result;
    if (action === 'activate') {
      result = await User.updateMany({ _id: { $in: userIds } }, { isActive: true });
      logger.info(`Bulk activated ${result.modifiedCount} users`);
    } else if (action === 'deactivate') {
      result = await User.updateMany({ _id: { $in: userIds } }, { isActive: false });
      logger.info(`Bulk deactivated ${result.modifiedCount} users`);
    } else if (action === 'delete') {
      // Delete associated profiles and data
      for (const userId of userIds) {
        const user = await User.findById(userId);
        if (!user) continue;

        if (user.role === 'vendor') {
          const vendor = await Vendor.findOne({ userId });
          if (vendor) {
            await Product.deleteMany({ vendorId: vendor._id });
            await Vendor.deleteOne({ userId });
          }
        }
        if (user.role === 'affiliate') {
          const affiliate = await Affiliate.findOne({ userId });
          if (affiliate) {
            await Commission.deleteMany({ subjectId: affiliate._id, type: 'affiliate' });
            await Affiliate.deleteOne({ userId });
          }
        }
        await Review.deleteMany({ userId });
      }
      result = await User.deleteMany({ _id: { $in: userIds } });
      logger.info(`Bulk deleted ${result.deletedCount} users`);
    }

    res.json({
      success: true,
      data: {
        message: `Successfully ${action}d ${result.modifiedCount || result.deletedCount} users`,
        count: result.modifiedCount || result.deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserActivity = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Get recent orders for customers
    const recentOrders = await Order.find({
      $or: [{ userId: user._id }, { guestEmail: user.email }],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderId status totals createdAt')
      .lean();

    // Get role-specific data
    let roleData = {};
    if (user.role === 'vendor') {
      const vendor = await Vendor.findOne({ userId: user._id }).lean();
      if (vendor) {
        const [productCount, totalSales] = await Promise.all([
          Product.countDocuments({ vendorId: vendor._id }),
          Order.aggregate([
            { $unwind: '$items' },
            { $match: { 'items.vendorId': vendor._id } },
            { $group: { _id: null, total: { $sum: '$items.total' } } },
          ]),
        ]);
        roleData = {
          vendor: {
            storeName: vendor.storeName,
            status: vendor.status,
            productCount,
            totalSales: totalSales[0]?.total || 0,
            commissionRules: vendor.commissionRules,
          },
        };
      }
    } else if (user.role === 'affiliate') {
      const affiliate = await Affiliate.findOne({ userId: user._id }).lean();
      if (affiliate) {
        const commissionStats = await Commission.aggregate([
          { $match: { subjectId: affiliate._id, type: 'affiliate' } },
          { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]);
        roleData = {
          affiliate: {
            code: affiliate.code,
            status: affiliate.status,
            totalClicks: affiliate.totalClicks || 0,
            totalConversions: affiliate.totalConversions || 0,
            commissions: commissionStats,
          },
        };
      }
    }

    // Build activity log
    const activity = [
      { type: 'account_created', date: user.createdAt, description: 'Account created' },
    ];
    if (user.lastLogin) {
      activity.push({ type: 'last_login', date: user.lastLogin, description: 'Last login' });
    }
    recentOrders.forEach((order) => {
      activity.push({
        type: 'order',
        date: order.createdAt,
        description: `Order ${order.orderId} - ${order.status}`,
        data: order,
      });
    });
    activity.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        recentOrders,
        roleData,
        activity: activity.slice(0, 10),
      },
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
    indexNow.notifyContentChange('product', product.slug);
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
    indexNow.notifyContentChange('product', product.slug);
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

exports.bulkPriceUpdate = async (req, res, next) => {
  try {
    const { ids, percentage } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Product IDs are required' } });
    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct === 0)
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Valid non-zero percentage is required' } });

    const multiplier = 1 + pct / 100;
    const products = await Product.find({ _id: { $in: ids } }).select('_id price');
    await Promise.all(products.map(p =>
      Product.updateOne({ _id: p._id }, { price: Math.max(1, Math.round(p.price * multiplier)) })
    ));
    logger.info(`Bulk price update by admin: ${products.length} products, ${pct > 0 ? '+' : ''}${pct}%`);
    res.json({ success: true, data: { updated: products.length } });
  } catch (error) { next(error); }
};

exports.assignProductsToCategory = async (req, res, next) => {
  try {
    const { categoryId, productIds } = req.body;
    if (!categoryId || !Array.isArray(productIds) || productIds.length === 0)
      return res.status(400).json({ success: false, error: { message: 'categoryId and productIds are required' } });
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $addToSet: { categoryIds: categoryId } }
    );
    res.json({ success: true, data: { updated: result.modifiedCount } });
  } catch (error) { next(error); }
};

exports.removeProductsFromCategory = async (req, res, next) => {
  try {
    const { categoryId, productIds } = req.body;
    if (!categoryId || !Array.isArray(productIds) || productIds.length === 0)
      return res.status(400).json({ success: false, error: { message: 'categoryId and productIds are required' } });
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $pull: { categoryIds: categoryId } }
    );
    res.json({ success: true, data: { updated: result.modifiedCount } });
  } catch (error) { next(error); }
};

exports.reassignProducts = async (req, res, next) => {
  try {
    const { toVendorId, fromVendorId, productIds } = req.body;

    if (!toVendorId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'toVendorId is required' } });
    }

    const toVendor = await Vendor.findById(toVendorId);
    if (!toVendor) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Target vendor not found' } });
    }

    const query = {};
    if (productIds && productIds.length > 0) {
      query._id = { $in: productIds };
    } else if (fromVendorId) {
      query.vendorId = fromVendorId;
    } else {
      query.vendorId = { $ne: toVendorId };
    }

    const result = await Product.updateMany(query, { $set: { vendorId: toVendorId } });

    // Update totalProducts counts
    const total = await Product.countDocuments({ vendorId: toVendorId });
    await Vendor.updateOne({ _id: toVendorId }, { totalProducts: total });

    if (fromVendorId) {
      const fromTotal = await Product.countDocuments({ vendorId: fromVendorId });
      await Vendor.updateOne({ _id: fromVendorId }, { totalProducts: fromTotal });
    }

    logger.info(`Admin reassigned ${result.modifiedCount} products to vendor: ${toVendor.storeName}`);
    res.json({ success: true, data: { modifiedCount: result.modifiedCount, vendor: toVendor.storeName } });
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
    // SECURITY: Validate required fields
    if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_NAME', message: 'Category name is required' }
      });
    }

    if (req.body.name.length > 100) {
      return res.status(400).json({
        success: false,
        error: { code: 'NAME_TOO_LONG', message: 'Category name cannot exceed 100 characters' }
      });
    }

    const cat = await Category.create({ ...req.body, name: req.body.name.trim(), slug: slugify(req.body.name) });
    logger.info(`Category created: ${cat.name}`);
    res.status(201).json({ success: true, data: cat });
    indexNow.notifyContentChange('category', cat.slug);
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
    indexNow.notifyContentChange('category', cat.slug);
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
exports.getOrderCounts = async (req, res, next) => {
  try {
    const [total, pending, pending_payment, paid, packed, shipped, out_for_delivery, delivered, cancelled, refunded] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'pending_payment' }),
      Order.countDocuments({ status: 'paid' }),
      Order.countDocuments({ status: 'packed' }),
      Order.countDocuments({ status: 'shipped' }),
      Order.countDocuments({ status: 'out_for_delivery' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.countDocuments({ status: 'refunded' }),
    ]);

    res.json({
      success: true,
      data: { total, pending, pending_payment, paid, packed, shipped, out_for_delivery, delivered, cancelled, refunded },
    });
  } catch (error) {
    next(error);
  }
};

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

exports.updateOrderAddress = async (req, res, next) => {
  try {
    const { fullName, addressLine1, addressLine2, city, state, zipCode, country, phone } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });

    order.shipTo = {
      ...order.shipTo,
      ...(fullName    !== undefined && { fullName }),
      ...(addressLine1 !== undefined && { addressLine1 }),
      ...(addressLine2 !== undefined && { addressLine2 }),
      ...(city        !== undefined && { city }),
      ...(state       !== undefined && { state }),
      ...(zipCode     !== undefined && { zipCode }),
      ...(country     !== undefined && { country }),
      ...(phone       !== undefined && { phone }),
    };

    order.events.push({ status: order.status, description: 'Shipping address updated by admin', timestamp: new Date() });
    await order.save();

    logger.info(`Shipping address updated for order: ${order.orderId}`);
    res.json({ success: true, data: order });
  } catch (error) { next(error); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, description } = req.body;
    const order = await Order.findById(req.params.id).populate('userId', 'name email pushTokens');
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
      await payoutService.autoApproveCommissions(order._id);
      logger.info(`Auto-approved commissions for delivered order: ${order.orderId}`);
    }

    // Send push notification to customer
    if (order.userId?.pushTokens?.length) {
      sendOrderStatusPush(order.userId, status, order._id.toString(), `#${order.orderId}`).catch(() => {});
    }

    logger.info(`Order status updated: ${order.orderId} -> ${status}`);
    res.json({ success: true, data: order });
  } catch (error) { next(error); }
};

// ---------- Vendors ----------
exports.getVendorStats = async (req, res, next) => {
  try {
    // Get counts by status
    const [total, active, pending, suspended] = await Promise.all([
      Vendor.countDocuments(),
      Vendor.countDocuments({ status: 'active' }),
      Vendor.countDocuments({ status: 'pending' }),
      Vendor.countDocuments({ status: 'suspended' }),
    ]);

    // Get top performer by total sales
    const topPerformerAgg = await Vendor.aggregate([
      { $match: { status: 'active' } },
      { $sort: { totalSales: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          storeName: 1,
          totalSales: 1,
          ownerName: '$user.name',
          ownerEmail: '$user.email'
        }
      }
    ]);

    const topPerformer = topPerformerAgg[0] || null;

    res.json({
      success: true,
      data: {
        total,
        active,
        pending,
        suspended,
        topPerformer
      }
    });
  } catch (error) { next(error); }
};

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
    const vendorDoc = await Vendor.findById(req.params.id);
    if (!vendorDoc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor not found' } });

    // Check if KYC is fully complete — if so, approve both account AND KYC in one step (Amazon-style)
    const kyc = vendorDoc.kyc || {};
    const kycComplete =
      kyc.gstVerified &&
      kyc.businessName?.trim() &&
      kyc.businessType &&
      kyc.businessAddress?.trim() &&
      kyc.phoneNumber?.trim() &&
      (kyc.documents || []).some(d => d.type === 'id_proof') &&
      (kyc.documents || []).some(d => d.type === 'address_proof');

    const updateData = { status: 'active' };
    if (kycComplete) {
      // Auto-approve KYC too — single approval like Amazon
      updateData['kyc.status'] = 'approved';
      updateData['kyc.verifiedAt'] = new Date();
      updateData['kyc.verifiedBy'] = req.user._id;
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('userId');

    logger.info(`Vendor approved: ${vendor.storeName} | KYC auto-approved: ${kycComplete}`);

    // Notify vendor of approval
    try {
      await notificationHelper.notifyVendorApprovalStatus({
        vendorUserId: vendor.userId._id || vendor.userId,
        vendor,
        status: 'approved',
      });
    } catch (notifError) {
      logger.error('Failed to notify vendor of approval:', notifError);
    }

    res.json({
      success: true,
      data: vendor,
      kycAutoApproved: kycComplete,
    });
  } catch (error) { next(error); }
};

exports.rejectVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
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
    await Commission.deleteMany({ subjectId: vendor._id, type: 'vendor' });

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
    // Check GST verification before approval
    const vendorCheck = await Vendor.findById(req.params.id);
    if (!vendorCheck) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor not found' }
      });
    }

    // Validate kyc subdoc exists
    if (!vendorCheck.kyc) {
      return res.status(400).json({
        success: false,
        error: { code: 'KYC_NOT_SUBMITTED', message: 'Vendor has not submitted KYC information yet.' }
      });
    }

    // Validate required business info
    const kyc = vendorCheck.kyc;
    if (!kyc.businessName?.trim() || !kyc.businessType || !kyc.businessAddress?.trim() || !kyc.phoneNumber?.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INCOMPLETE_KYC', message: 'Vendor must fill business name, type, address, and phone number before KYC can be approved.' }
      });
    }

    // Validate GST verification (mandatory)
    if (!kyc.gstVerified) {
      return res.status(400).json({
        success: false,
        error: { code: 'GST_NOT_VERIFIED', message: 'Cannot approve vendor KYC without GST verification. Vendor must verify their GST number first.' }
      });
    }

    // Validate required documents
    const docs = kyc.documents || [];
    const hasIdProof = docs.some(d => d.type === 'id_proof');
    const hasAddressProof = docs.some(d => d.type === 'address_proof');
    if (!hasIdProof || !hasAddressProof) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DOCUMENTS', message: 'Vendor must upload ID proof and address proof documents before KYC can be approved.' }
      });
    }

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
exports.getAffiliateStats = async (req, res, next) => {
  try {
    const [total, active, pending, suspended, earningsAgg, topPerformer] = await Promise.all([
      Affiliate.countDocuments(),
      Affiliate.countDocuments({ status: 'active' }),
      Affiliate.countDocuments({ status: 'pending' }),
      Affiliate.countDocuments({ status: 'suspended' }),
      Affiliate.aggregate([
        { $group: {
          _id: null,
          totalEarnings: { $sum: '$totalEarnings' },
          pendingEarnings: { $sum: '$pendingEarnings' },
          paidEarnings: { $sum: '$paidEarnings' },
          totalClicks: { $sum: '$totalClicks' },
          totalConversions: { $sum: '$totalConversions' }
        }}
      ]),
      // Top performer by conversions
      Affiliate.aggregate([
        { $match: { status: 'active' } },
        { $sort: { totalConversions: -1 } },
        { $limit: 1 },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: {
          _id: 1,
          code: 1,
          totalConversions: 1,
          totalEarnings: 1,
          totalClicks: 1,
          userName: '$user.name'
        }}
      ])
    ]);

    const earnings = earningsAgg[0] || { totalEarnings: 0, pendingEarnings: 0, paidEarnings: 0, totalClicks: 0, totalConversions: 0 };

    res.json({
      success: true,
      data: {
        total,
        active,
        pending,
        suspended,
        totalEarnings: earnings.totalEarnings,
        pendingEarnings: earnings.pendingEarnings,
        paidEarnings: earnings.paidEarnings,
        totalClicks: earnings.totalClicks,
        totalConversions: earnings.totalConversions,
        conversionRate: earnings.totalClicks > 0 ? ((earnings.totalConversions / earnings.totalClicks) * 100).toFixed(2) : 0,
        topPerformer: topPerformer[0] || null
      }
    });
  } catch (error) { next(error); }
};

exports.getAffiliates = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build aggregation pipeline for search support
    const pipeline = [];

    // Match status if provided
    if (status) {
      pipeline.push({ $match: { status } });
    }

    // Lookup user data
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'userId'
      }
    });
    pipeline.push({ $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } });

    // Search filter (by name, email, or code)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'userId.name': { $regex: search, $options: 'i' } },
            { 'userId.email': { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Affiliate.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Sort and paginate
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Project only needed user fields
    pipeline.push({
      $project: {
        _id: 1, code: 1, status: 1, totalClicks: 1, totalConversions: 1,
        totalEarnings: 1, pendingEarnings: 1, paidEarnings: 1,
        commissionPercentage: 1, commissionRules: 1, kyc: 1,
        bankDetails: 1, panNumber: 1, panVerified: 1, razorpay: 1,
        rejectionReason: 1, createdAt: 1, updatedAt: 1,
        'userId._id': 1, 'userId.name': 1, 'userId.email': 1
      }
    });

    const affiliates = await Affiliate.aggregate(pipeline);

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
    await Commission.deleteMany({ subjectId: affiliate._id, type: 'affiliate' });

    // Delete the affiliate profile
    await Affiliate.findByIdAndDelete(req.params.id);

    logger.info(`Affiliate deleted: ${affiliate.code} (ID: ${affiliate._id})`);
    res.json({ success: true, data: { message: 'Affiliate and associated data deleted successfully' } });
  } catch (error) { next(error); }
};

// ---------- Commissions / Payouts ----------
exports.getCommissions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    // Add date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [rows, total] = await Promise.all([
      Commission.find(query)
        .populate({
          path: 'orderId',
          select: 'orderId totals items',
          populate: {
            path: 'items.productId',
            select: 'title slug images'
          }
        })
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

    // Map commissions to include product info from order items
    const commissionsWithProducts = rows.map(commission => {
      let productInfo = null;

      // Try to find the product from order items
      if (commission.orderId?.items?.length > 0) {
        // If orderItemId exists, find that specific item
        if (commission.orderItemId) {
          const item = commission.orderId.items.find(
            i => i._id?.toString() === commission.orderItemId?.toString()
          );
          if (item?.productId) {
            productInfo = item.productId;
          }
        }

        // If no specific item found, try to find by vendor
        if (!productInfo && commission.type === 'vendor' && commission.subjectId) {
          const vendorItem = commission.orderId.items.find(
            i => i.vendorId?.toString() === commission.subjectId._id?.toString()
          );
          if (vendorItem?.productId) {
            productInfo = vendorItem.productId;
          }
        }

        // Fallback: use first item's product
        if (!productInfo && commission.orderId.items[0]?.productId) {
          productInfo = commission.orderId.items[0].productId;
        }
      }

      return {
        ...commission,
        productId: productInfo
      };
    });

    res.json({ success: true, data: { commissions: commissionsWithProducts }, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) { next(error); }
};

exports.exportVendorCommissions = async (req, res, next) => {
  try {
    const { vendorId, startDate, endDate, status } = req.query;

    const query = { type: 'vendor' };
    if (vendorId) query.subjectId = vendorId;
    if (status && status !== 'all') query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const commissions = await Commission.find(query)
      .populate({ path: 'orderId', select: 'orderId totals createdAt' })
      .populate({ path: 'subjectId', populate: { path: 'userId', select: 'name email' } })
      .sort({ createdAt: -1 })
      .lean();

    const headers = ['Vendor', 'Vendor Email', 'Order ID', 'Date', 'Order Total', 'Commission %', 'Commission Amount', 'Status', 'Paid Date', 'Payment Ref'];
    const rows = commissions.map(c => [
      c.subjectId?.storeName || c.subjectId?.userId?.name || 'N/A',
      c.subjectId?.userId?.email || 'N/A',
      c.orderId?.orderId || 'N/A',
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '',
      c.orderId?.totals?.total != null ? c.orderId.totals.total.toFixed(2) : '',
      c.percentage != null ? `${c.percentage}%` : '',
      c.amount.toFixed(2),
      c.status,
      c.paidAt ? new Date(c.paidAt).toLocaleDateString('en-IN') : '',
      c.paymentRef || '',
    ]);

    // Summary
    const totalAmount = commissions.reduce((s, c) => s + c.amount, 0);
    const pendingTotal = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
    const approvedTotal = commissions.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
    const paidTotal = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);

    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total Records', commissions.length]);
    rows.push(['Total Commission', '', '', '', '', '', totalAmount.toFixed(2)]);
    rows.push(['Pending', '', '', '', '', '', pendingTotal.toFixed(2)]);
    rows.push(['Approved', '', '', '', '', '', approvedTotal.toFixed(2)]);
    rows.push(['Paid', '', '', '', '', '', paidTotal.toFixed(2)]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const vendorName = vendorId ? (commissions[0]?.subjectId?.storeName || 'vendor') : 'all-vendors';
    const filename = `commissions_${vendorName.replace(/\s+/g, '-')}_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

exports.getCommissionStats = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    const query = type ? { type } : {};

    // Add date range filter if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // Build topSubjects aggregation based on type
    const getTopSubjectsAggregation = () => {
      if (type === 'affiliate') {
        // Top 5 affiliates by commission amount
        return Commission.aggregate([
          { $match: { ...query, type: 'affiliate' } },
          { $group: { _id: '$subjectId', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { totalAmount: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'affiliates', localField: '_id', foreignField: '_id', as: 'affiliate' } },
          { $unwind: { path: '$affiliate', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'users', localField: 'affiliate.userId', foreignField: '_id', as: 'user' } },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          { $project: { _id: 1, totalAmount: 1, count: 1, storeName: { $ifNull: ['$user.name', '$affiliate.code'] } } }
        ]);
      } else if (type === 'vendor' || !type) {
        // Top 5 vendors by commission amount
        return Commission.aggregate([
          { $match: { ...query, type: 'vendor' } },
          { $group: { _id: '$subjectId', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { totalAmount: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' } },
          { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
          { $project: { _id: 1, totalAmount: 1, count: 1, storeName: '$vendor.storeName' } }
        ]);
      }
      return Promise.resolve([]);
    };

    const [totalStats, pendingStats, approvedStats, paidStats, affiliateCount, vendorCount, topVendors] = await Promise.all([
      Commission.aggregate([
        { $match: query },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, totalCount: { $sum: 1 } } }
      ]),
      Commission.aggregate([
        { $match: { ...query, status: 'pending' } },
        { $group: { _id: null, pendingAmount: { $sum: '$amount' }, pendingCount: { $sum: 1 } } }
      ]),
      Commission.aggregate([
        { $match: { ...query, status: 'approved' } },
        { $group: { _id: null, approvedAmount: { $sum: '$amount' }, approvedCount: { $sum: 1 } } }
      ]),
      Commission.aggregate([
        { $match: { ...query, status: 'paid' } },
        { $group: { _id: null, paidAmount: { $sum: '$amount' }, paidCount: { $sum: 1 } } }
      ]),
      type === 'affiliate' ? Affiliate.countDocuments({ status: 'active' }) : Promise.resolve(0),
      type === 'vendor' || !type ? Vendor.countDocuments({ status: 'active' }) : Promise.resolve(0),
      getTopSubjectsAggregation()
    ]);

    const stats = {
      totalAmount: totalStats[0]?.totalAmount || 0,
      totalCount: totalStats[0]?.totalCount || 0,
      pendingAmount: pendingStats[0]?.pendingAmount || 0,
      pendingCount: pendingStats[0]?.pendingCount || 0,
      approvedAmount: approvedStats[0]?.approvedAmount || 0,
      approvedCount: approvedStats[0]?.approvedCount || 0,
      paidAmount: paidStats[0]?.paidAmount || 0,
      paidCount: paidStats[0]?.paidCount || 0,
      affiliateCount: affiliateCount,
      vendorCount: vendorCount,
      topVendors: topVendors || []
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
    const commission = await Commission.findById(req.params.id);
    if (!commission) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Commission not found' } });

    if (commission.status !== 'approved') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Commission must be approved before paying' } });
    }

    let payoutResult;

    if (commission.type === 'vendor') {
      // Process vendor payout via Razorpay (or manual fallback)
      payoutResult = await payoutService.processVendorPayout(
        commission.subjectId,
        commission.amount,
        [commission._id]
      );
    } else if (commission.type === 'affiliate') {
      // Process affiliate payout via Razorpay (or manual fallback)
      payoutResult = await payoutService.processAffiliatePayout(
        commission.subjectId,
        commission.amount,
        [commission._id]
      );

      // Notify affiliate of payment
      const affiliate = await Affiliate.findById(commission.subjectId).populate('userId');
      if (affiliate && affiliate.userId) {
        try {
          await notificationHelper.notifyAffiliateCommissionPaid({
            affiliateUserId: affiliate.userId._id || affiliate.userId,
            commission,
            amount: commission.amount,
          });
          logger.info(`Affiliate notified of commission payment: ${commission._id}`);
        } catch (notifError) {
          logger.error('Failed to notify affiliate of commission payment:', notifError);
        }
      }
    } else {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'Unknown commission type' } });
    }

    // Reload updated commission
    const updated = await Commission.findById(req.params.id);

    logger.info(`Commission paid: ${commission._id} via ${payoutResult.method}`);
    res.json({
      success: true,
      data: updated,
      payout: {
        method: payoutResult.method,
        transferId: payoutResult.transferId,
        status: payoutResult.status || 'processed',
        note: payoutResult.note,
        bankDetails: payoutResult.bankDetails,
      },
    });
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

    // Get all approved commissions
    const commissions = await Commission.find({
      _id: { $in: commissionIds },
      status: 'approved'
    });

    if (commissions.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_APPROVED', message: 'No approved commissions found to pay' }
      });
    }

    // Group commissions by type and subjectId for batch processing
    const vendorPayouts = {};
    const affiliatePayouts = {};

    for (const comm of commissions) {
      const subjectKey = comm.subjectId.toString();
      if (comm.type === 'vendor') {
        if (!vendorPayouts[subjectKey]) {
          vendorPayouts[subjectKey] = { amount: 0, commissionIds: [] };
        }
        vendorPayouts[subjectKey].amount += comm.amount;
        vendorPayouts[subjectKey].commissionIds.push(comm._id);
      } else if (comm.type === 'affiliate') {
        if (!affiliatePayouts[subjectKey]) {
          affiliatePayouts[subjectKey] = { amount: 0, commissionIds: [] };
        }
        affiliatePayouts[subjectKey].amount += comm.amount;
        affiliatePayouts[subjectKey].commissionIds.push(comm._id);
      }
    }

    const results = { success: [], failed: [] };

    // Process vendor payouts via Razorpay
    for (const [vendorId, data] of Object.entries(vendorPayouts)) {
      try {
        await payoutService.processVendorPayout(vendorId, data.amount, data.commissionIds);
        results.success.push({ type: 'vendor', subjectId: vendorId, amount: data.amount, count: data.commissionIds.length });
        logger.info(`Bulk pay: Vendor ${vendorId} paid ₹${data.amount} for ${data.commissionIds.length} commissions`);
      } catch (err) {
        results.failed.push({ type: 'vendor', subjectId: vendorId, error: err.message });
        logger.error(`Bulk pay: Vendor ${vendorId} payout failed:`, err);
      }
    }

    // Process affiliate payouts via Razorpay
    for (const [affiliateId, data] of Object.entries(affiliatePayouts)) {
      try {
        await payoutService.processAffiliatePayout(affiliateId, data.amount, data.commissionIds);
        results.success.push({ type: 'affiliate', subjectId: affiliateId, amount: data.amount, count: data.commissionIds.length });
        logger.info(`Bulk pay: Affiliate ${affiliateId} paid ₹${data.amount} for ${data.commissionIds.length} commissions`);

        // Notify affiliate of payment
        const affiliate = await Affiliate.findById(affiliateId).populate('userId');
        if (affiliate && affiliate.userId) {
          try {
            await notificationHelper.notifyAffiliateCommissionPaid({
              affiliateUserId: affiliate.userId._id || affiliate.userId,
              amount: data.amount,
            });
          } catch (notifError) {
            logger.error('Failed to notify affiliate of bulk commission payment:', notifError);
          }
        }
      } catch (err) {
        results.failed.push({ type: 'affiliate', subjectId: affiliateId, error: err.message });
        logger.error(`Bulk pay: Affiliate ${affiliateId} payout failed:`, err);
      }
    }

    const totalPaid = results.success.reduce((sum, r) => sum + r.count, 0);
    const totalFailed = results.failed.length;

    logger.info(`Bulk pay complete: ${totalPaid} commissions paid, ${totalFailed} failed`);
    res.json({
      success: true,
      data: {
        paidCount: totalPaid,
        failedCount: totalFailed,
        results
      }
    });
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
    const { type, subjectId, amount, paymentRef, paymentMethod, paymentProof } = req.body;
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
      c.paymentMethod = paymentMethod || 'other';
      c.paymentProof = paymentProof || null;
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
    const { page = 1, limit = 100, search, status, category } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query with filters
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    if (status === 'published') query.published = true;
    if (status === 'draft') query.published = false;
    if (category) query.category = category;

    const [rows, total] = await Promise.all([
      Post.find(query).populate('author', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Post.countDocuments(query),
    ]);

    // Map viewCount to views for frontend compatibility
    const postsWithViews = rows.map(post => ({
      ...post,
      views: post.viewCount || 0
    }));

    res.json({ success: true, data: postsWithViews, meta: getPaginationMeta(total, +page, +limit) });
  } catch (error) { next(error); }
};

exports.createPost = async (req, res, next) => {
  try {
    const row = await Post.create({ ...req.body, author: req.user._id, slug: slugify(req.body.title) });
    logger.info(`Post created: ${row.title}`);
    res.status(201).json({ success: true, data: row });
    indexNow.notifyContentChange('blog', row.slug);
  } catch (error) { next(error); }
};

exports.updatePost = async (req, res, next) => {
  try {
    const row = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Post not found' } });
    res.json({ success: true, data: row });
    indexNow.notifyContentChange('blog', row.slug);
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
    const { search, status } = req.query;

    // Build query with filters
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }
    if (status === 'published') query.published = true;
    if (status === 'draft') query.published = false;

    const rows = await Page.find(query).sort({ title: 1 }).lean();
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

// Get settings statistics
exports.getSettingsStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      total,
      publicCount,
      categoryCounts,
      recentlyUpdated,
      featuresEnabled
    ] = await Promise.all([
      Setting.countDocuments(),
      Setting.countDocuments({ isPublic: true }),
      Setting.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Setting.countDocuments({ updatedAt: { $gte: today } }),
      Setting.countDocuments({
        $or: [
          { type: 'boolean', value: 'true' },
          { type: 'boolean', value: true },
          { key: { $regex: /enabled$/i }, value: 'true' },
          { key: { $regex: /enabled$/i }, value: true }
        ]
      })
    ]);

    res.json({
      success: true,
      data: {
        total,
        categories: categoryCounts.length,
        public: publicCount,
        private: total - publicCount,
        recentlyUpdated,
        featuresEnabled,
        byCategory: categoryCounts.reduce((acc, c) => {
          acc[c._id || 'uncategorized'] = c.count;
          return acc;
        }, {})
      }
    });
  } catch (error) { next(error); }
};

// Export all settings
exports.exportSettings = async (req, res, next) => {
  try {
    const settings = await Setting.find().sort({ category: 1, key: 1 }).lean();

    const exportData = settings.map(s => ({
      key: s.key,
      value: s.value,
      type: s.type,
      category: s.category,
      description: s.description,
      isPublic: s.isPublic
    }));

    logger.info(`Settings exported by admin ${req.user._id}`);

    res.json({
      success: true,
      data: exportData,
      exportedAt: new Date().toISOString(),
      totalCount: exportData.length
    });
  } catch (error) { next(error); }
};

// Bulk update settings
exports.bulkUpdateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Provide an array of settings.'
      });
    }

    let updatedCount = 0;
    const errors = [];

    for (const settingData of settings) {
      try {
        if (!settingData.key) {
          errors.push({ key: settingData.key, error: 'Key is required' });
          continue;
        }

        const setting = await Setting.findOneAndUpdate(
          { key: settingData.key },
          {
            $set: {
              value: settingData.value,
              type: settingData.type || 'string',
              category: settingData.category || 'general',
              description: settingData.description,
              isPublic: settingData.isPublic || false
            }
          },
          { upsert: true, new: true }
        );

        if (setting) updatedCount++;
      } catch (err) {
        errors.push({ key: settingData.key, error: err.message });
      }
    }

    logger.info(`Bulk settings update: ${updatedCount} settings updated by admin ${req.user._id}`);

    res.json({
      success: true,
      message: `${updatedCount} settings updated successfully`,
      data: {
        updatedCount,
        errorsCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
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

// Get Contact Submission Statistics
exports.getContactSubmissionStats = async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalCount,
      newCount,
      readCount,
      repliedCount,
      resolvedCount,
      spamCount,
      todayCount,
      urgentCount,
      avgResponseTime,
    ] = await Promise.all([
      ContactSubmission.countDocuments(),
      ContactSubmission.countDocuments({ status: 'new' }),
      ContactSubmission.countDocuments({ status: 'read' }),
      ContactSubmission.countDocuments({ status: 'replied' }),
      ContactSubmission.countDocuments({ status: 'resolved' }),
      ContactSubmission.countDocuments({ status: 'spam' }),
      ContactSubmission.countDocuments({ createdAt: { $gte: today } }),
      ContactSubmission.countDocuments({
        status: { $in: ['new', 'read'] },
        createdAt: { $lte: last24h },
      }),
      ContactSubmission.aggregate([
        { $match: { status: 'replied', repliedAt: { $exists: true } } },
        {
          $project: {
            responseTime: { $subtract: ['$repliedAt', '$createdAt'] },
          },
        },
        { $group: { _id: null, avgTime: { $avg: '$responseTime' } } },
      ]),
    ]);

    // Calculate avg response time in hours
    const avgResponseHours = avgResponseTime.length > 0
      ? Math.round(avgResponseTime[0].avgTime / (1000 * 60 * 60))
      : 0;

    // Calculate response rate (replied + resolved / total non-spam)
    const nonSpamTotal = totalCount - spamCount;
    const responseRate = nonSpamTotal > 0
      ? Math.round(((repliedCount + resolvedCount) / nonSpamTotal) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        total: totalCount,
        new: newCount,
        read: readCount,
        replied: repliedCount,
        resolved: resolvedCount,
        spam: spamCount,
        today: todayCount,
        urgent: urgentCount,
        avgResponseTime: `${avgResponseHours}h`,
        responseRate: responseRate,
        pending: newCount + readCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Reply to Contact Submission
exports.replyToContactSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, subject } = req.body;

    const submission = await ContactSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contact submission not found' },
      });
    }

    // Update submission status
    submission.status = 'replied';
    submission.repliedAt = new Date();
    await submission.save();

    // Create communication record for the reply
    const Communication = require('../models/Communication');
    await Communication.create({
      type: 'email',
      direction: 'outgoing',
      from: process.env.ADMIN_EMAIL || 'vtechshop.customercare@gmail.com',
      fromName: 'Vtech Support',
      to: submission.email,
      toName: submission.name,
      subject: subject || `Re: ${submission.subject}`,
      message,
      status: 'sent',
      sentAt: new Date(),
      metadata: {
        contactSubmissionId: submission._id,
      },
    });

    // TODO: Actually send email via email service
    // await emailService.send({ to: submission.email, subject, html: message });

    res.json({
      success: true,
      data: submission,
      message: 'Reply sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Bulk Update Contact Submissions
exports.bulkUpdateContactSubmissions = async (req, res, next) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'IDs array is required' },
      });
    }

    const validStatuses = ['new', 'read', 'replied', 'resolved', 'spam'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Invalid status value' },
      });
    }

    const updateData = { status };
    if (status === 'replied') updateData.repliedAt = new Date();
    if (status === 'resolved') updateData.resolvedAt = new Date();

    const result = await ContactSubmission.updateMany(
      { _id: { $in: ids } },
      updateData
    );

    res.json({
      success: true,
      data: {
        modified: result.modifiedCount,
        matched: result.matchedCount,
      },
      message: `${result.modifiedCount} submissions updated`,
    });
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
    const { page = 1, limit = 20, status, productId, userId, rating, search, verified, hasResponse } = req.query;
    const query = {};

    if (status) query.status = status;
    if (productId) query.productId = productId;
    if (userId) query.userId = userId;
    if (rating) query.rating = parseInt(rating);
    if (verified === 'true') query.verified = true;
    if (verified === 'false') query.verified = false;
    if (hasResponse === 'true') query['vendorResponse.text'] = { $exists: true, $ne: '' };
    if (hasResponse === 'false') query['vendorResponse.text'] = { $exists: false };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build aggregation for search
    let reviews, total;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const pipeline = [
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            ...query,
            $or: [
              { comment: searchRegex },
              { title: searchRegex },
              { 'product.title': searchRegex },
              { 'user.firstName': searchRegex },
              { 'user.lastName': searchRegex },
              { 'user.email': searchRegex },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: parseInt(limit) },
              {
                $project: {
                  _id: 1,
                  rating: 1,
                  title: 1,
                  comment: 1,
                  images: 1,
                  verified: 1,
                  status: 1,
                  rejectionReason: 1,
                  helpfulCount: 1,
                  unhelpfulCount: 1,
                  vendorResponse: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  productId: {
                    _id: '$product._id',
                    title: '$product.title',
                    slug: '$product.slug',
                    images: '$product.images',
                  },
                  userId: {
                    _id: '$user._id',
                    firstName: '$user.firstName',
                    lastName: '$user.lastName',
                    email: '$user.email',
                  },
                },
              },
            ],
            count: [{ $count: 'total' }],
          },
        },
      ];

      const result = await Review.aggregate(pipeline);
      reviews = result[0]?.data || [];
      total = result[0]?.count[0]?.total || 0;
    } else {
      [reviews, total] = await Promise.all([
        Review.find(query)
          .populate('userId', 'firstName lastName email')
          .populate('productId', 'title slug images')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Review.countDocuments(query),
      ]);
    }

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

// Get Review Statistics
exports.getReviewStats = async (req, res, next) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      verifiedCount,
      withResponseCount,
      thisWeekCount,
      ratingDistribution,
      avgRatingResult,
      helpfulVotes,
    ] = await Promise.all([
      Review.countDocuments(),
      Review.countDocuments({ status: 'pending' }),
      Review.countDocuments({ status: 'approved' }),
      Review.countDocuments({ status: 'rejected' }),
      Review.countDocuments({ verified: true }),
      Review.countDocuments({ 'vendorResponse.text': { $exists: true, $ne: '' } }),
      Review.countDocuments({ createdAt: { $gte: weekAgo } }),
      Review.aggregate([
        { $group: { _id: '$rating', count: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
      Review.aggregate([
        { $group: { _id: null, totalHelpful: { $sum: '$helpfulCount' } } },
      ]),
    ]);

    // Convert rating distribution to object
    const ratingDist = {};
    ratingDistribution.forEach(item => {
      ratingDist[item._id] = item.count;
    });

    // Calculate response rate
    const responseRate = totalCount > 0
      ? Math.round((withResponseCount / totalCount) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        verified: verifiedCount,
        withResponse: withResponseCount,
        thisWeek: thisWeekCount,
        ratingDistribution: ratingDist,
        avgRating: avgRatingResult[0]?.avgRating || 0,
        totalHelpful: helpfulVotes[0]?.totalHelpful || 0,
        responseRate: responseRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Bulk Update Reviews
exports.bulkUpdateReviews = async (req, res, next) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'IDs array is required' },
      });
    }

    // Handle delete action
    if (status === 'delete') {
      // Get product IDs before deletion for rating recalculation
      const reviews = await Review.find({ _id: { $in: ids } }).select('productId');
      const productIds = [...new Set(reviews.map(r => r.productId?.toString()).filter(Boolean))];

      const result = await Review.deleteMany({ _id: { $in: ids } });

      // Recalculate ratings for affected products
      for (const productId of productIds) {
        const approvedReviews = await Review.find({ productId, status: 'approved' });
        if (approvedReviews.length > 0) {
          const avgRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length;
          await Product.findByIdAndUpdate(productId, {
            rating: Math.round(avgRating * 10) / 10,
            reviewCount: approvedReviews.length,
          });
        } else {
          await Product.findByIdAndUpdate(productId, { rating: 0, reviewCount: 0 });
        }
      }

      logger.info(`Bulk deleted ${result.deletedCount} reviews`);
      return res.json({
        success: true,
        data: { deleted: result.deletedCount },
        message: `${result.deletedCount} reviews deleted`,
      });
    }

    // Handle status updates
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Invalid status value' },
      });
    }

    const result = await Review.updateMany(
      { _id: { $in: ids } },
      { status }
    );

    // Recalculate product ratings for approved/rejected changes
    if (status === 'approved' || status === 'rejected') {
      const reviews = await Review.find({ _id: { $in: ids } }).select('productId');
      const productIds = [...new Set(reviews.map(r => r.productId?.toString()).filter(Boolean))];

      for (const productId of productIds) {
        const approvedReviews = await Review.find({ productId, status: 'approved' });
        if (approvedReviews.length > 0) {
          const avgRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length;
          await Product.findByIdAndUpdate(productId, {
            rating: Math.round(avgRating * 10) / 10,
            reviewCount: approvedReviews.length,
          });
        } else {
          await Product.findByIdAndUpdate(productId, { rating: 0, reviewCount: 0 });
        }
      }
    }

    logger.info(`Bulk updated ${result.modifiedCount} reviews to status: ${status}`);
    res.json({
      success: true,
      data: {
        modified: result.modifiedCount,
        matched: result.matchedCount,
      },
      message: `${result.modifiedCount} reviews updated`,
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Enhanced Payout Management ----------

exports.getVendorPendingPayouts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get all vendors with approved commissions (include bank details for payout processing)
    const vendors = await Vendor.find({ status: 'active' })
      .select('_id storeName userId bank.accountHolderName bank.bankName bank.ifscCode bank.lastFourDigits bank.upiId bank.verified +bank.accountNumber')
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
          bankDetails: {
            accountHolderName: vendor.bank?.accountHolderName || vendor.storeName,
            bankName: vendor.bank?.bankName || '',
            accountNumber: vendor.bank?.accountNumber || '',
            ifscCode: vendor.bank?.ifscCode || '',
            lastFourDigits: vendor.bank?.lastFourDigits || '',
            upiId: vendor.bank?.upiId || '',
            verified: vendor.bank?.verified || false,
          },
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
    const { vendorId, amount, commissionIds, paymentMethod, paymentRef, paymentProof } = req.body;

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

    // Build manual payment object if payment details provided
    const manualPayment = paymentRef ? { paymentMethod, paymentRef, paymentProof } : null;

    const result = await payoutService.processVendorPayout(
      vendorId,
      amount,
      selectedCommissions,
      manualPayment
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
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Get orders within date range
    const allOrders = await Order.find({
      createdAt: { $gte: daysAgo }
    }).select('payment totals status createdAt');

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
      refundedPayments: 0,
      refundedAmount: 0,
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
      if (paymentStatus === 'completed' || paymentStatus === 'paid' || paymentStatus === 'captured' || order.status === 'paid') {
        stats.successfulPayments++;
        stats.successfulAmount += amount;
      } else if (paymentStatus === 'pending' || paymentStatus === 'created' || order.status === 'placed') {
        stats.pendingPayments++;
        stats.pendingAmount += amount;
      } else if (paymentStatus === 'failed') {
        stats.failedPayments++;
        stats.failedAmount += amount;
      } else if (paymentStatus === 'refunded') {
        stats.refundedPayments++;
        stats.refundedAmount += amount;
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

    // Add balance-related fields for Amazon-style display
    stats.availableBalance = stats.successfulAmount - stats.refundedAmount;
    stats.reservedAmount = Math.round(stats.successfulAmount * 0.02); // 2% reserve for refunds
    stats.nextPayoutAmount = stats.availableBalance - stats.reservedAmount;
    stats.nextPayoutDate = 'Weekly settlement';

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, paymentMethod, status, search, days = 30 } = req.query;

    const query = {};

    // Filter by date range
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    query.createdAt = { $gte: daysAgo };

    // Filter by payment method
    if (paymentMethod) {
      query['payment.method'] = paymentMethod;
    }

    // Filter by status
    if (status) {
      if (status === 'completed' || status === 'paid' || status === 'captured') {
        query.$or = [
          { 'payment.status': 'completed' },
          { 'payment.status': 'captured' },
          { 'payment.status': 'paid' },
          { status: 'paid' }
        ];
      } else {
        query['payment.status'] = status;
      }
    }

    // Search by order ID or customer name/email
    if (search) {
      const searchQuery = {
        $or: [
          { orderId: { $regex: search, $options: 'i' } },
          { 'shipTo.fullName': { $regex: search, $options: 'i' } },
          { guestEmail: { $regex: search, $options: 'i' } }
        ]
      };
      // Merge search with existing query
      if (query.$or) {
        query.$and = [{ $or: query.$or }, searchQuery];
        delete query.$or;
      } else {
        Object.assign(query, searchQuery);
      }
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
      platformFee: order.totals?.platformFee || 0,
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
    const { amount, reference, paymentMethod, paymentProof } = req.body;

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

    // Update approved commissions to paid
    const commissions = await Commission.find({
      subjectId: affiliate._id,
      type: 'affiliate',
      status: 'approved',
    }).sort({ createdAt: 1 });

    let remaining = amount;
    for (const c of commissions) {
      if (remaining <= 0) break;
      c.status = 'paid';
      c.paidAt = new Date();
      c.paymentRef = reference;
      c.paymentMethod = paymentMethod || 'other';
      c.paymentProof = paymentProof || null;
      c.notes = `Manual payout via ${paymentMethod || 'other'} | Ref: ${reference}`;
      await c.save();
      remaining -= c.amount;
    }

    logger.info(`Affiliate payout recorded: ${affiliate.code} - ₹${amount} - ${paymentMethod} - ${reference}`);

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

/**
 * Release held Razorpay Route transfers for a delivered order
 * POST /api/admin/payouts/release-transfers/:orderId
 * Admin manually triggers this after the return window (7 days post-delivery)
 */
exports.releaseHeldTransfers = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const Order = require('../models/Order');
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    // Only allow release for delivered orders
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Order must be delivered before releasing transfers. Current status: ${order.status}` },
      });
    }

    // Check if delivery date has passed the return window (7 days)
    // Admin can force-release early by passing ?force=true
    const force = req.query.force === 'true';
    const deliveredEvent = order.events?.find(e => e.status === 'delivered');
    if (deliveredEvent && !force) {
      const daysSinceDelivery = Math.floor((Date.now() - new Date(deliveredEvent.timestamp).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceDelivery < 7) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'RETURN_WINDOW_ACTIVE',
            message: `Return window still active. ${7 - daysSinceDelivery} days remaining. Add ?force=true to override.`,
            daysRemaining: 7 - daysSinceDelivery,
          },
        });
      }
    }

    const { releaseHeldTransfers } = require('./razorpayController');
    const result = await releaseHeldTransfers(orderId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: { code: 'RELEASE_FAILED', message: result.error || 'Failed to release transfers' },
      });
    }

    // Audit log
    await AuditLog.create({
      action: 'held_transfers_released',
      userId: req.user._id,
      entity: 'Order',
      entityId: orderId,
      changes: { released: result.released },
    });

    logger.info(`Admin ${req.user._id} released ${result.released} held transfers for order ${orderId}`);

    res.json({
      success: true,
      data: {
        orderId,
        transfersReleased: result.released,
        message: `${result.released} transfer(s) released successfully`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update vendor Razorpay Route settlement configuration
 * PUT /api/admin/vendors/:id/settlement-config
 */
exports.updateVendorSettlementConfig = async (req, res, next) => {
  try {
    const { settlementPercentage, holdUntilDelivery, holdDays } = req.body;

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor not found' },
      });
    }

    if (settlementPercentage !== undefined) {
      if (settlementPercentage < 0 || settlementPercentage > 100) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Settlement percentage must be between 0 and 100' },
        });
      }
      vendor.razorpay = vendor.razorpay || {};
      vendor.razorpay.settlementPercentage = settlementPercentage;
    }

    if (holdUntilDelivery !== undefined) {
      vendor.razorpay = vendor.razorpay || {};
      vendor.razorpay.holdUntilDelivery = holdUntilDelivery;
    }

    if (holdDays !== undefined) {
      if (holdDays < 1 || holdDays > 30) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Hold days must be between 1 and 30' },
        });
      }
      vendor.razorpay = vendor.razorpay || {};
      vendor.razorpay.holdDays = holdDays;
    }

    await vendor.save();

    await AuditLog.create({
      action: 'vendor_settlement_config_updated',
      userId: req.user._id,
      entity: 'Vendor',
      entityId: vendor._id,
      changes: { settlementPercentage, holdUntilDelivery, holdDays },
    });

    logger.info(`Vendor settlement config updated: ${vendor.storeName} - ${settlementPercentage}%`);

    res.json({
      success: true,
      data: {
        storeName: vendor.storeName,
        razorpay: vendor.razorpay,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ===================== MANUAL ORDERS =====================

// Get all manual (in-store/phone) orders
exports.getManualOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, source } = req.query;
    const filter = { source: { $in: ['in-store', 'phone'] } };
    if (source && source !== 'all') filter.source = source;
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { 'shipTo.fullName': { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('items.productId', 'name images slug'),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, data: orders, pagination: getPaginationMeta(total, parseInt(page), parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

// Create manual order (in-store / phone sale)
exports.createManualOrder = async (req, res, next) => {
  try {
    const { customerName, customerPhone, customerEmail, items, paymentMethod, amountPaid, source = 'in-store', notes, discount = 0 } = req.body;
    if (!customerName || !customerPhone || !items?.length) {
      return res.status(400).json({ success: false, error: { message: 'Customer name, phone and at least one item are required' } });
    }

    // Build order items from product IDs
    const orderItems = [];
    let subtotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(400).json({ success: false, error: { message: `Product not found: ${item.productId}` } });

      const price = item.price || product.price;
      const qty = item.qty || 1;
      subtotal += price * qty;

      const orderItem = {
        productId: product._id,
        vendorId: product.vendorId,
        name: product.title || product.name,
        image: product.images?.[0] || '',
        productSlug: product.slug,
        sku: product.sku,
        hsnCode: product.hsnCode || '',
        priceSnapshot: price,
        qty,
      };

      // Copy warranty info from product
      if (product.hasWarranty && product.warranty) {
        orderItem.warranty = {
          hasWarranty: true,
          duration: product.warranty.duration,
          durationType: product.warranty.durationType,
          description: product.warranty.description,
          terms: product.warranty.terms,
          provider: product.warranty.provider,
          activationRequired: false, // Auto-activate for manual orders
          warrantyCode: item.serialNumber || undefined,
        };
      }

      orderItems.push(orderItem);
    }

    const order = await Order.create({
      orderId: await generateOrderId(),
      items: orderItems,
      source,
      customerPhone,
      shipTo: { fullName: customerName, phone: customerPhone },
      totals: { subtotal, tax: 0, shipping: 0, discount: parseFloat(discount) || 0, total: amountPaid || (subtotal - (parseFloat(discount) || 0)) },
      status: 'delivered',
      payment: {
        method: paymentMethod || 'cash',
        status: 'paid',
        paidAt: new Date(),
        amount: amountPaid || subtotal,
        currency: 'INR',
      },
      events: [
        { status: 'placed', description: `Manual order created by admin (${source})`, timestamp: new Date() },
        { status: 'paid', description: `Payment received: ${paymentMethod || 'cash'}`, timestamp: new Date() },
        { status: 'delivered', description: 'In-store pickup / delivered', timestamp: new Date() },
      ],
      customerNotes: notes,
      internalNotes: `Manual order by admin: ${req.user._id}`,
      guestEmail: customerEmail || undefined,
    });

    // Auto-activate warranties (sets isActivated=true on order items)
    await activateWarrantiesForOrder(order);
    await order.save();

    // Verify warranty records were created in Warranty collection
    // If activateWarrantiesForOrder failed silently, create them directly
    for (const item of order.items) {
      if (!item.warranty?.hasWarranty) continue;
      try {
        const exists = await Warranty.findOne({ purchaseId: order.orderId, productId: item.productId });
        if (exists) {
          logger.info(`Warranty record verified for ${item.name} in order ${order.orderId}: ${exists.warrantyId}`);
          continue;
        }

        // Record missing - create it directly
        logger.warn(`Warranty record missing for ${item.name} in order ${order.orderId}, creating directly...`);
        const warrantyId = await Warranty.generateWarrantyId();
        const now = new Date();
        let warrantyPeriodDays = 0;
        if (item.warranty.durationType === 'lifetime') {
          warrantyPeriodDays = 36500;
        } else if (item.warranty.durationType === 'years') {
          warrantyPeriodDays = (item.warranty.duration || 1) * 365;
        } else {
          warrantyPeriodDays = (item.warranty.duration || 1) * 30;
        }
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + warrantyPeriodDays);

        const prodLookup = await Product.findById(item.productId).select('title name sku').lean();
        const warrantyRecord = await Warranty.create({
          warrantyId,
          purchaseId: order.orderId,
          orderId: order._id,
          customerName: customerName,
          customerEmail: customerEmail || undefined,
          customerPhone: customerPhone,
          productId: item.productId,
          product: { name: item.name || prodLookup?.title || prodLookup?.name || 'Unknown Product', model: item.sku || prodLookup?.sku || '' },
          purchaseDate: now,
          warrantyStartDate: now,
          warrantyEndDate: endDate,
          warrantyPeriodDays,
          warrantyType: 'manufacturer',
          status: warrantyPeriodDays === 0 ? 'no_warranty' : 'active',
          extraInfo: { store: 'V-Tech', invoiceNo: order.orderId, remarks: item.warranty.description || '' },
        });
        logger.info(`Warranty record created directly: ${warrantyRecord.warrantyId} for ${item.name}`);
      } catch (err) {
        logger.error(`Direct warranty creation failed for ${item.name} in ${order.orderId}: ${err.message}`, { name: err.name, code: err.code, stack: err.stack });
      }
    }

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// Update a manual order (customer info, notes, source, payment method only)
exports.updateManualOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: { message: 'Order not found' } });

    // Only allow editing manual orders
    if (!['in-store', 'phone'].includes(order.source)) {
      return res.status(400).json({ success: false, error: { message: 'Only manual orders can be edited here' } });
    }

    // Cannot edit cancelled orders
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, error: { message: 'Cannot edit a cancelled order' } });
    }

    const { customerName, customerPhone, customerEmail, source, paymentMethod, customerNotes, internalNotes } = req.body;

    // Update allowed fields
    if (customerName) order.shipTo.fullName = customerName;
    if (customerPhone) {
      order.customerPhone = customerPhone;
      order.shipTo.phone = customerPhone;
    }
    if (customerEmail !== undefined) order.guestEmail = customerEmail || undefined;
    if (source && ['in-store', 'phone'].includes(source)) order.source = source;
    if (paymentMethod) order.payment.method = paymentMethod;
    if (customerNotes !== undefined) order.customerNotes = customerNotes;
    if (internalNotes !== undefined) order.internalNotes = internalNotes;

    // Push edit event
    order.events.push({
      status: 'updated',
      description: `Order edited by admin (${req.user._id})`,
      timestamp: new Date(),
    });

    await order.save();

    // Also update warranty customer info if guest warranties exist
    if (customerName || customerPhone || customerEmail !== undefined) {
      const updateFields = {};
      if (customerName) updateFields.customerName = customerName;
      if (customerEmail !== undefined) updateFields.customerEmail = customerEmail || undefined;
      if (customerPhone) updateFields.customerPhone = customerPhone;
      if (Object.keys(updateFields).length > 0) {
        await Warranty.updateMany({ orderId: order._id }, updateFields);
      }
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// Cancel a manual order and void associated warranties
exports.cancelManualOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: { message: 'Order not found' } });

    if (!['in-store', 'phone'].includes(order.source)) {
      return res.status(400).json({ success: false, error: { message: 'Only manual orders can be cancelled here' } });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, error: { message: 'Order is already cancelled' } });
    }

    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Cancellation reason is required' } });
    }

    // Cancel the order
    order.status = 'cancelled';
    order.cancellation = {
      reason: reason.trim(),
      cancelledAt: new Date(),
      cancelledBy: req.user._id,
    };

    // Mark payment as refunded
    order.payment.refund = {
      amount: order.payment.amount || order.totals?.total || 0,
      status: 'refunded',
      createdAt: new Date(),
    };

    // Push cancel event
    order.events.push({
      status: 'cancelled',
      description: `Order cancelled by admin. Reason: ${reason.trim()}`,
      timestamp: new Date(),
    });

    await order.save();

    // Void all associated warranties
    const voidResult = await Warranty.updateMany(
      { orderId: order._id },
      { status: 'void', isActive: false }
    );

    res.json({
      success: true,
      data: order,
      warrantiesVoided: voidResult.modifiedCount || 0,
    });
  } catch (error) {
    next(error);
  }
};

// Warranty check by orderId (Amazon-style: simple Order ID lookup)
exports.checkWarranty = async (req, res, next) => {
  try {
    const { phone, orderId } = req.query;
    const mongoose = require('mongoose');

    // Special case: "my-account" = fetch all warranties for logged-in user
    if (phone === 'my-account') {
      // Must be logged in with valid user ID
      if (!req.user || !req.user._id) {
        return res.json({ success: true, data: [] });
      }

      // Ensure we have a valid ObjectId for the user
      const userIdStr = req.user._id.toString();
      if (!mongoose.Types.ObjectId.isValid(userIdStr)) {
        return res.json({ success: true, data: [] });
      }

      const userId = new mongoose.Types.ObjectId(userIdStr);

      // Amazon-style: Only show warranties for DELIVERED orders
      const userOrders = await Order.find({
        userId: userId,
        'items.warranty.hasWarranty': true,
        status: 'delivered'
      })
        .select('orderId items source shipTo.fullName customerPhone totals.total payment.method payment.paidAt status createdAt')
        .sort({ createdAt: -1 })
        .limit(50);

      // Helper to calculate warranty status and expiry
      const getWarrantyDetails = (warranty, orderDate) => {
        const now = new Date();
        const deliveryDate = new Date(orderDate);

        // Calculate expiry date if not set
        let expiresAt = warranty.expiresAt;
        if (!expiresAt && warranty.durationType !== 'lifetime') {
          const expiry = new Date(deliveryDate);
          if (warranty.durationType === 'years') {
            expiry.setFullYear(expiry.getFullYear() + warranty.duration);
          } else { // months
            expiry.setMonth(expiry.getMonth() + warranty.duration);
          }
          expiresAt = expiry;
        }

        // Determine status - only pending if explicitly requires activation
        let status = 'active';
        if (warranty.activationRequired && !warranty.isActivated) {
          status = 'pending_activation';
        } else if (warranty.durationType !== 'lifetime' && expiresAt && new Date(expiresAt) < now) {
          status = 'expired';
        }

        // Calculate days remaining
        let daysRemaining = null;
        if (warranty.durationType === 'lifetime') {
          daysRemaining = null; // Infinite
        } else if (expiresAt) {
          const diffTime = new Date(expiresAt) - now;
          daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }

        return {
          duration: warranty.duration,
          durationType: warranty.durationType,
          description: warranty.description,
          provider: warranty.provider,
          isActivated: warranty.activationRequired ? warranty.isActivated : true,
          activatedAt: warranty.activatedAt || deliveryDate,
          expiresAt: expiresAt,
          warrantyCode: warranty.warrantyCode,
          activationRequired: warranty.activationRequired || false,
          status,
          daysRemaining,
        };
      };

      const warranties = [];
      for (const order of userOrders) {
        for (const item of order.items) {
          if (item.warranty?.hasWarranty) {
            warranties.push({
              orderId: order.orderId,
              orderDate: order.createdAt,
              source: order.source || 'online',
              customerName: order.shipTo?.fullName,
              productName: item.name,
              productImage: item.image,
              sku: item.sku,
              price: item.priceSnapshot,
              warranty: getWarrantyDetails(item.warranty, order.createdAt),
            });
          }
        }
      }
      return res.json({ success: true, data: warranties });
    }

    // Order ID search (public - anyone can check with valid order ID)
    if (!orderId) {
      return res.status(400).json({ success: false, error: { message: 'Order ID is required' } });
    }

    // Amazon-style: Only show warranties for DELIVERED orders
    const filter = {
      orderId: { $regex: orderId, $options: 'i' },
      status: 'delivered'
    };

    const orders = await Order.find(filter)
      .select('orderId items source shipTo.fullName customerPhone totals.total payment.method payment.paidAt status createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    // Helper to calculate warranty status and expiry (same as above)
    const getWarrantyDetails = (warranty, orderDate) => {
      const now = new Date();
      const deliveryDate = new Date(orderDate);

      // Calculate expiry date if not set
      let expiresAt = warranty.expiresAt;
      if (!expiresAt && warranty.durationType !== 'lifetime') {
        const expiry = new Date(deliveryDate);
        if (warranty.durationType === 'years') {
          expiry.setFullYear(expiry.getFullYear() + warranty.duration);
        } else { // months
          expiry.setMonth(expiry.getMonth() + warranty.duration);
        }
        expiresAt = expiry;
      }

      // Determine status - only pending if explicitly requires activation
      let status = 'active';
      if (warranty.activationRequired && !warranty.isActivated) {
        status = 'pending_activation';
      } else if (warranty.durationType !== 'lifetime' && expiresAt && new Date(expiresAt) < now) {
        status = 'expired';
      }

      // Calculate days remaining
      let daysRemaining = null;
      if (warranty.durationType === 'lifetime') {
        daysRemaining = null; // Infinite
      } else if (expiresAt) {
        const diffTime = new Date(expiresAt) - now;
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      return {
        duration: warranty.duration,
        durationType: warranty.durationType,
        description: warranty.description,
        provider: warranty.provider,
        isActivated: warranty.activationRequired ? warranty.isActivated : true,
        activatedAt: warranty.activatedAt || deliveryDate,
        expiresAt: expiresAt,
        warrantyCode: warranty.warrantyCode,
        activationRequired: warranty.activationRequired || false,
        status,
        daysRemaining,
      };
    };

    // Extract warranty items
    const warranties = [];
    for (const order of orders) {
      for (const item of order.items) {
        if (item.warranty?.hasWarranty) {
          warranties.push({
            orderId: order.orderId,
            orderDate: order.createdAt,
            source: order.source || 'online',
            customerName: order.shipTo?.fullName,
            productName: item.name,
            productImage: item.image,
            sku: item.sku,
            price: item.priceSnapshot,
            warranty: getWarrantyDetails(item.warranty, order.createdAt),
          });
        }
      }
    }

    res.json({ success: true, data: warranties });
  } catch (error) {
    next(error);
  }
};

// ============ CAROUSEL MANAGEMENT ============

// Get all carousel items (admin)
exports.getCarouselItems = async (req, res, next) => {
  try {
    const items = await Carousel.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate('createdBy', 'name')
      .lean();

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

// Get single carousel item
exports.getCarouselItem = async (req, res, next) => {
  try {
    const item = await Carousel.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Carousel item not found' },
      });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// Create carousel item
exports.createCarouselItem = async (req, res, next) => {
  try {
    const { title, brand, description, tags, imageUrl, link, sortOrder, isActive, startDate, endDate } = req.body;

    // Validation
    if (!title || !imageUrl || !link) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Title, image URL, and link are required' },
      });
    }

    const item = await Carousel.create({
      title: title.trim(),
      brand: brand?.trim(),
      description: description?.trim(),
      tags: tags || [],
      imageUrl,
      link: link.trim(),
      sortOrder: sortOrder || 0,
      isActive: isActive !== false,
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: req.user._id,
    });

    logger.info(`Carousel item created: ${item.title} by admin ${req.user._id}`);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// Update carousel item
exports.updateCarouselItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, brand, description, tags, imageUrl, link, sortOrder, isActive, startDate, endDate } = req.body;

    const item = await Carousel.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Carousel item not found' },
      });
    }

    // Update fields
    if (title) item.title = title.trim();
    if (brand !== undefined) item.brand = brand?.trim() || '';
    if (description !== undefined) item.description = description?.trim() || '';
    if (tags !== undefined) item.tags = tags;
    if (imageUrl) item.imageUrl = imageUrl;
    if (link) item.link = link.trim();
    if (sortOrder !== undefined) item.sortOrder = sortOrder;
    if (isActive !== undefined) item.isActive = isActive;
    if (startDate !== undefined) item.startDate = startDate || null;
    if (endDate !== undefined) item.endDate = endDate || null;
    item.updatedBy = req.user._id;

    await item.save();

    logger.info(`Carousel item updated: ${item.title} by admin ${req.user._id}`);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// Delete carousel item
exports.deleteCarouselItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await Carousel.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Carousel item not found' },
      });
    }

    logger.info(`Carousel item deleted: ${item.title} by admin ${req.user._id}`);
    res.json({ success: true, message: 'Carousel item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Reorder carousel items (bulk update sort order)
exports.reorderCarouselItems = async (req, res, next) => {
  try {
    const { items } = req.body; // Array of { id, sortOrder }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Items array is required' },
      });
    }

    // Update sort orders
    const bulkOps = items.map(({ id, sortOrder }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder, updatedBy: req.user._id } },
      },
    }));

    await Carousel.bulkWrite(bulkOps);

    logger.info(`Carousel items reordered by admin ${req.user._id}`);
    res.json({ success: true, message: 'Carousel items reordered successfully' });
  } catch (error) {
    next(error);
  }
};

// ---------- Inventory Management (Amazon-style) ----------

// Get inventory stats
exports.getInventoryStats = async (req, res, next) => {
  try {
    const [totalSKUs, lowStockProducts, outOfStockProducts, overstockedProducts] = await Promise.all([
      Product.countDocuments({ published: true }),
      Product.countDocuments({
        published: true,
        $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', 10] }] }] }
      }),
      Product.countDocuments({ published: true, stock: 0 }),
      Product.countDocuments({
        published: true,
        $expr: { $gt: ['$stock', { $multiply: [{ $ifNull: ['$lowStockThreshold', 10] }, 5] }] }
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalSKUs,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        overstocked: overstockedProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get inventory list with filters
exports.getInventory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, stockStatus, vendorId, categoryId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = { published: true };

    // Stock status filter
    if (stockStatus === 'out') {
      query.stock = 0;
    } else if (stockStatus === 'low') {
      query.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', 10] }] }] };
    } else if (stockStatus === 'healthy') {
      query.$expr = {
        $and: [
          { $gt: ['$stock', { $ifNull: ['$lowStockThreshold', 10] }] },
          { $lte: ['$stock', { $multiply: [{ $ifNull: ['$lowStockThreshold', 10] }, 5] }] }
        ]
      };
    } else if (stockStatus === 'overstocked') {
      query.$expr = { $gt: ['$stock', { $multiply: [{ $ifNull: ['$lowStockThreshold', 10] }, 5] }] };
    }

    // Vendor filter
    if (vendorId) {
      query.vendorId = vendorId;
    }

    // Category filter
    if (categoryId) {
      query.categoryIds = categoryId;
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('vendorId', 'storeName email userId')
        .populate('categoryIds', 'name')
        .select('title sku stock lowStockThreshold images vendorId categoryIds price reserved')
        .sort({ stock: 1 }) // Sort by lowest stock first
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(query),
    ]);

    // Calculate days of supply based on average sales (simplified calculation)
    const productsWithDaysSupply = await Promise.all(products.map(async (product) => {
      const productObj = product.toObject();

      // Calculate average daily sales from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const salesData = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            'items.productId': product._id,
            status: { $nin: ['cancelled', 'refunded'] }
          }
        },
        { $unwind: '$items' },
        { $match: { 'items.productId': product._id } },
        { $group: { _id: null, totalSold: { $sum: '$items.quantity' } } }
      ]);

      const totalSold = salesData[0]?.totalSold || 0;
      const avgDailySales = totalSold / 30;

      productObj.daysOfSupply = avgDailySales > 0
        ? Math.round(product.stock / avgDailySales)
        : product.stock > 0 ? 999 : 0;

      return productObj;
    }));

    // Generate alerts
    const alerts = [];
    const outOfStockCount = await Product.countDocuments({ published: true, stock: 0 });
    const lowStockCount = await Product.countDocuments({
      published: true,
      $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', 10] }] }] }
    });

    if (outOfStockCount > 0) {
      alerts.push({ type: 'critical', message: `${outOfStockCount} products are out of stock` });
    }
    if (lowStockCount > 0) {
      alerts.push({ type: 'warning', message: `${lowStockCount} products need restocking` });
    }

    res.json({
      success: true,
      data: productsWithDaysSupply,
      alerts,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update product stock
exports.updateInventoryStock = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STOCK', message: 'Valid stock value is required (>= 0)' },
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }

    const previousStock = product.stock;
    product.stock = parseInt(stock);
    await product.save();

    // Log the stock change
    logger.info(`Admin ${req.user._id} updated stock for product ${product.title}: ${previousStock} -> ${stock}`);

    res.json({
      success: true,
      data: {
        productId: product._id,
        title: product.title,
        previousStock,
        newStock: product.stock,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Send restock reminder to vendor
exports.sendRestockReminder = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { vendorId } = req.body;

    const product = await Product.findById(productId).populate('vendorId');
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }

    const vendor = await Vendor.findById(vendorId).populate('userId', 'email name _id');
    if (!vendor || !vendor.userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor not found' },
      });
    }

    const threshold = product.lowStockThreshold || 10;
    const vendorName = vendor.storeName || vendor.userId.name || 'Vendor';

    // Send in-app notification to vendor
    await notificationHelper.createNotification({
      userId: vendor.userId._id,
      type: 'product',
      title: `Low Stock Alert: ${product.title}`,
      message: `Your product "${product.title}" (SKU: ${product.sku || 'N/A'}) has only ${product.stock} unit(s) left in stock. Threshold is ${threshold}. Please restock soon.`,
      data: {
        productId: product._id,
        productName: product.title,
        sku: product.sku || 'N/A',
        currentStock: product.stock,
        threshold,
      },
      link: `/vendor-dashboard/products`,
    });

    logger.info(`Restock reminder sent to vendor ${vendorName} for product ${product.title}`);

    res.json({
      success: true,
      message: 'Restock reminder sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Export inventory to CSV
exports.exportInventory = async (req, res, next) => {
  try {
    const { stockStatus, vendorId, categoryId, search } = req.query;

    // Build query (same as getInventory)
    const query = { published: true };

    if (stockStatus === 'out') {
      query.stock = 0;
    } else if (stockStatus === 'low') {
      query.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', 10] }] }] };
    } else if (stockStatus === 'healthy') {
      query.$expr = {
        $and: [
          { $gt: ['$stock', { $ifNull: ['$lowStockThreshold', 10] }] },
          { $lte: ['$stock', { $multiply: [{ $ifNull: ['$lowStockThreshold', 10] }, 5] }] }
        ]
      };
    } else if (stockStatus === 'overstocked') {
      query.$expr = { $gt: ['$stock', { $multiply: [{ $ifNull: ['$lowStockThreshold', 10] }, 5] }] };
    }

    if (vendorId) query.vendorId = vendorId;
    if (categoryId) query.categoryIds = categoryId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(query)
      .populate('vendorId', 'storeName')
      .populate('categoryIds', 'name')
      .select('title sku stock lowStockThreshold vendorId categoryIds price')
      .sort({ stock: 1 });

    // Generate CSV
    const csvHeader = 'Product Name,SKU,Vendor,Category,Current Stock,Threshold,Status,Price\n';
    const csvRows = products.map(p => {
      const status = p.stock === 0 ? 'Out of Stock' :
                     p.stock <= (p.lowStockThreshold || 10) ? 'Low Stock' :
                     p.stock > (p.lowStockThreshold || 10) * 5 ? 'Overstocked' : 'Healthy';
      return `"${p.title}","${p.sku || 'N/A'}","${p.vendorId?.storeName || 'N/A'}","${p.categoryIds?.[0]?.name || 'N/A'}",${p.stock},${p.lowStockThreshold || 10},"${status}",${p.price}`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// Export internal helper for use in other controllers
exports.activateWarrantiesForOrder = activateWarrantiesForOrder;
