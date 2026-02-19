// FILE: apps/api/src/controllers/vendorController.js
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Commission = require('../models/Commission');
const { slugify, generateSKU, getPaginationMeta } = require('../utils/helpers');
const logger = require('../config/logger');
const notificationHelper = require('../services/notificationHelper');
const notificationService = require('../services/notificationService');
const indexNow = require('../services/indexNowService');

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

// Helper: Get date range for period
const getVendorDateRange = (period) => {
  const now = new Date();
  let startDate, endDate, prevStartDate, prevEndDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = now;
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 1);
      prevEndDate = new Date(startDate);
      break;
    case '7days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      endDate = now;
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      prevEndDate = new Date(startDate);
      break;
    case '30days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      endDate = now;
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 30);
      prevEndDate = new Date(startDate);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      return { startDate: null, endDate: null, prevStartDate: null, prevEndDate: null };
  }

  return { startDate, endDate, prevStartDate, prevEndDate };
};

async function getDashboardStats(req, res, next) {
  try {
    const { period = '30days' } = req.query;
    const { startDate, endDate, prevStartDate, prevEndDate } = getVendorDateRange(period);

    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    // Build date filters
    const dateFilter = startDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};
    const prevDateFilter = prevStartDate ? { createdAt: { $gte: prevStartDate, $lt: prevEndDate } } : {};

    // Current period stats
    const [totalProducts, activeProducts, totalOrders, pendingOrders, totalCommissions, salesAgg, lowStockProducts] =
      await Promise.all([
        Product.countDocuments({ vendorId: vendor._id, ...dateFilter }),
        Product.countDocuments({ vendorId: vendor._id, published: true }),
        Order.countDocuments({ 'items.vendorId': vendor._id, ...dateFilter }),
        Order.countDocuments({ 'items.vendorId': vendor._id, status: { $in: ['placed', 'paid'] } }),
        Commission.aggregate([
          { $match: { subjectId: vendor._id, type: 'vendor', ...dateFilter } },
          { $group: { _id: null, total: { $sum: '$amount' }, paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } } } },
        ]),
        // Calculate actual sales from paid orders containing this vendor's items
        Order.aggregate([
          { $match: { 'items.vendorId': vendor._id, status: { $nin: ['pending', 'pending_payment', 'cancelled'] }, ...dateFilter } },
          { $unwind: '$items' },
          { $match: { 'items.vendorId': vendor._id } },
          { $group: { _id: null, total: { $sum: { $multiply: ['$items.priceSnapshot', '$items.qty'] } } } },
        ]),
        // Low stock products (stock < 10)
        Product.countDocuments({ vendorId: vendor._id, published: true, stock: { $lt: 10, $gt: 0 } }),
      ]);

    // Previous period stats for trend comparison
    const [prevProducts, prevOrders, prevCommissions, prevSalesAgg] = await Promise.all([
      prevStartDate ? Product.countDocuments({ vendorId: vendor._id, ...prevDateFilter }) : Promise.resolve(0),
      prevStartDate ? Order.countDocuments({ 'items.vendorId': vendor._id, ...prevDateFilter }) : Promise.resolve(0),
      prevStartDate ? Commission.aggregate([
        { $match: { subjectId: vendor._id, type: 'vendor', ...prevDateFilter } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]) : Promise.resolve([]),
      prevStartDate ? Order.aggregate([
        { $match: { 'items.vendorId': vendor._id, status: { $nin: ['pending', 'pending_payment', 'cancelled'] }, ...prevDateFilter } },
        { $unwind: '$items' },
        { $match: { 'items.vendorId': vendor._id } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$items.priceSnapshot', '$items.qty'] } } } },
      ]) : Promise.resolve([]),
    ]);

    // Generate sales chart data based on period
    let salesChart = [];
    const chartDays = period === 'today' ? 24 : period === '7days' ? 7 : period === 'month' ? 30 : 30;

    if (period === 'today') {
      // Hourly data for today
      const hourlyData = await Order.aggregate([
        { $match: { 'items.vendorId': vendor._id, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['pending', 'pending_payment', 'cancelled'] } } },
        { $unwind: '$items' },
        { $match: { 'items.vendorId': vendor._id } },
        { $group: { _id: { $hour: '$createdAt' }, sales: { $sum: { $multiply: ['$items.priceSnapshot', '$items.qty'] } } } },
        { $sort: { _id: 1 } },
      ]);
      const hourMap = new Map(hourlyData.map(d => [d._id, d.sales]));
      for (let h = 0; h < 24; h++) {
        salesChart.push({ name: `${h}:00`, sales: hourMap.get(h) || 0 });
      }
    } else {
      // Daily data
      const dailyData = await Order.aggregate([
        { $match: { 'items.vendorId': vendor._id, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['pending', 'pending_payment', 'cancelled'] } } },
        { $unwind: '$items' },
        { $match: { 'items.vendorId': vendor._id } },
        { $group: { _id: { $dayOfWeek: '$createdAt' }, sales: { $sum: { $multiply: ['$items.priceSnapshot', '$items.qty'] } } } },
        { $sort: { _id: 1 } },
      ]);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayMap = new Map(dailyData.map(d => [d._id, d.sales]));
      for (let d = 1; d <= 7; d++) {
        salesChart.push({ name: dayNames[d % 7], sales: dayMap.get(d) || 0 });
      }
    }

    // Debug: log vendor identity for data isolation verification
    logger.info(`Dashboard stats for vendor: ${vendor._id} (${vendor.storeName}), userId: ${req.user._id}, period: ${period}, products: ${totalProducts}, orders: ${totalOrders}`);

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        totalEarnings: totalCommissions[0]?.total || 0,
        paidEarnings: totalCommissions[0]?.paid || 0,
        totalSales: salesAgg[0]?.total || 0,
        lowStockProducts,
        pendingReviews: 0, // TODO: Implement when reviews model has vendor response tracking
        salesChart,
        // Previous period for trend indicators
        previousPeriod: {
          totalProducts: prevProducts,
          totalOrders: prevOrders,
          totalEarnings: prevCommissions[0]?.total || 0,
          totalSales: prevSalesAgg[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// Get product statistics for dashboard cards
async function getProductStats(req, res, next) {
  try {
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    const [
      total,
      published,
      draft,
      outOfStock,
      lowStock,
      mediumStock,
      inventoryValue,
    ] = await Promise.all([
      Product.countDocuments({ vendorId: vendor._id }),
      Product.countDocuments({ vendorId: vendor._id, published: true }),
      Product.countDocuments({ vendorId: vendor._id, published: false }),
      Product.countDocuments({ vendorId: vendor._id, stock: 0 }),
      Product.countDocuments({ vendorId: vendor._id, stock: { $gt: 0, $lt: 10 } }),
      Product.countDocuments({ vendorId: vendor._id, stock: { $gte: 10, $lt: 50 } }),
      Product.aggregate([
        { $match: { vendorId: vendor._id } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$stock'] } } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total,
        published,
        draft,
        outOfStock,
        lowStock,
        mediumStock,
        inStock: total - outOfStock - lowStock - mediumStock,
        inventoryValue: inventoryValue[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getVendorProducts(req, res, next) {
  try {
    const { page = 1, limit = 20, search, published, stockLevel, sortField = 'createdAt', sortOrder = 'desc' } = req.query;

    // SECURITY: Explicit vendor verification with null check
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    const query = { vendorId: vendor._id };

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter
    if (published !== undefined) query.published = published === 'true';

    // Stock level filter
    if (stockLevel === 'out-of-stock') {
      query.stock = 0;
    } else if (stockLevel === 'low-stock') {
      query.stock = { $gt: 0, $lt: 10 };
    } else if (stockLevel === 'in-stock') {
      query.stock = { $gte: 10 };
    }

    // SECURITY: Enforce maximum limit to prevent DoS
    const safeLimit = Math.min(parseInt(limit) || 20, 100); // Max 100 items
    const safePage = Math.max(parseInt(page) || 1, 1); // Min page 1
    const skip = (safePage - 1) * safeLimit;

    // Build sort object
    const allowedSortFields = ['title', 'price', 'stock', 'createdAt', 'updatedAt'];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'createdAt';
    const safeSortOrder = sortOrder === 'asc' ? 1 : -1;
    const sort = { [safeSortField]: safeSortOrder };

    const [products, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(safeLimit).lean(),
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
    indexNow.notifyContentChange('product', product.slug);
  } catch (error) {
    next(error);
  }
}


async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findOne({ userId: req.user._id });

    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'You must be a vendor to update products' },
      });
    }

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
      'sku', 'barcode', 'brand', 'images', 'imageAlts', 'categoryIds', 'tags',
      'variants', 'specifications', 'shippingInfo', 'published',
      'featured', 'taxable', 'taxRate', 'taxIncluded', 'hsnCode', 'seo', 'hasWarranty', 'warranty', 'faqs', 'structuredData', 'youtubeLink'
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
    indexNow.notifyContentChange('product', product.slug);
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findOne({ userId: req.user._id });

    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'You must be a vendor to delete products' },
      });
    }

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

// Bulk delete products
async function bulkDeleteProducts(req, res, next) {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Product IDs array is required' },
      });
    }

    // SECURITY: Limit bulk operations to prevent abuse
    if (productIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: { code: 'LIMIT_EXCEEDED', message: 'Cannot delete more than 50 products at once' },
      });
    }

    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    // Delete only products belonging to this vendor
    const result = await Product.deleteMany({
      _id: { $in: productIds },
      vendorId: vendor._id,
    });

    // Update vendor product count
    if (result.deletedCount > 0) {
      await Vendor.findByIdAndUpdate(vendor._id, {
        $inc: { totalProducts: -result.deletedCount },
      });
    }

    logger.info(`Bulk delete: ${result.deletedCount} products deleted by vendor ${vendor._id}`);

    res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        message: `${result.deletedCount} product(s) deleted successfully`,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Export products to CSV
async function exportProducts(req, res, next) {
  try {
    const { status, stockLevel } = req.query;

    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    const query = { vendorId: vendor._id };

    // Status filter
    if (status === 'published') query.published = true;
    else if (status === 'draft') query.published = false;

    // Stock level filter
    if (stockLevel === 'out-of-stock') query.stock = 0;
    else if (stockLevel === 'low-stock') query.stock = { $gt: 0, $lt: 10 };
    else if (stockLevel === 'in-stock') query.stock = { $gte: 10 };

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Build CSV
    const headers = [
      'Product ID',
      'Title',
      'SKU',
      'Brand',
      'Price',
      'Compare At',
      'Stock',
      'Status',
      'Published',
      'Featured',
      'Created At',
    ];

    const rows = products.map(p => [
      p._id.toString(),
      p.title || '',
      p.sku || '',
      p.brand || '',
      p.price?.toFixed(2) || '0.00',
      p.compareAt?.toFixed(2) || '',
      p.stock || 0,
      p.stock === 0 ? 'Out of Stock' : p.stock < 10 ? 'Low Stock' : 'In Stock',
      p.published ? 'Yes' : 'No',
      p.featured ? 'Yes' : 'No',
      p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '',
    ]);

    // Summary rows
    const totalProducts = products.length;
    const publishedCount = products.filter(p => p.published).length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock < 10).length;
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total Products', totalProducts]);
    rows.push(['Published', publishedCount]);
    rows.push(['Draft', totalProducts - publishedCount]);
    rows.push(['Out of Stock', outOfStockCount]);
    rows.push(['Low Stock', lowStockCount]);
    rows.push(['Inventory Value', totalInventoryValue.toFixed(2)]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const filename = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
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

    // Notify IndexNow for all imported products
    const slugs = imported.map(p => p.slug).filter(Boolean);
    if (slugs.length > 0) {
      const urls = slugs.map(s => `${indexNow.BASE_URL}/product/${s}`);
      indexNow.submitUrls(urls).catch(err => console.error('IndexNow bulk import notify failed:', err.message));
    }
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
        .select('title sku stock lowStockThreshold variants images price')
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

async function getInventoryStats(req, res, next) {
  try {
    // SECURITY: Explicit vendor verification
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    const products = await Product.find({ vendorId: vendor._id })
      .select('stock lowStockThreshold price')
      .lean();

    const totalProducts = products.length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 10)).length;
    const totalUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const inventoryValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);

    res.json({
      success: true,
      data: {
        totalProducts,
        outOfStock,
        lowStock,
        totalUnits,
        inventoryValue,
        needsAttention: outOfStock + lowStock,
      },
    });
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

async function getVendorOrderCounts(req, res, next) {
  try {
    // SECURITY: Explicit vendor verification
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    // Get counts for each status
    const [total, paid, packed, shipped, out_for_delivery, delivered, cancelled] = await Promise.all([
      Order.countDocuments({ 'items.vendorId': vendor._id }),
      Order.countDocuments({ 'items.vendorId': vendor._id, status: 'paid' }),
      Order.countDocuments({ 'items.vendorId': vendor._id, status: 'packed' }),
      Order.countDocuments({ 'items.vendorId': vendor._id, status: 'shipped' }),
      Order.countDocuments({ 'items.vendorId': vendor._id, status: 'out_for_delivery' }),
      Order.countDocuments({ 'items.vendorId': vendor._id, status: 'delivered' }),
      Order.countDocuments({ 'items.vendorId': vendor._id, status: 'cancelled' }),
    ]);

    res.json({
      success: true,
      data: { total, paid, packed, shipped, out_for_delivery, delivered, cancelled },
    });
  } catch (error) {
    next(error);
  }
}

async function getVendorOrders(req, res, next) {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

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
    if (search) query.orderId = { $regex: search, $options: 'i' };

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

// ---------- SETTLEMENT STATS ----------
async function getSettlementStats(req, res, next) {
  try {
    // SECURITY: Explicit vendor verification
    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    const query = { subjectId: vendor._id, type: 'vendor' };

    // Aggregate stats by status
    const stats = await Commission.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get lifetime stats
    const lifetimeStats = await Commission.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          avgEarningsPerOrder: { $avg: '$amount' },
        },
      },
    ]);

    // Map to response format
    const statsByStatus = {};
    stats.forEach(s => {
      statsByStatus[s._id] = { total: s.total, count: s.count };
    });

    res.json({
      success: true,
      data: {
        pending: statsByStatus.pending || { total: 0, count: 0 },
        approved: statsByStatus.approved || { total: 0, count: 0 },
        paid: statsByStatus.paid || { total: 0, count: 0 },
        cancelled: statsByStatus.cancelled || { total: 0, count: 0 },
        lifetime: {
          totalEarnings: lifetimeStats[0]?.totalEarnings || 0,
          totalTransactions: lifetimeStats[0]?.totalTransactions || 0,
          avgEarningsPerOrder: lifetimeStats[0]?.avgEarningsPerOrder || 0,
        },
        availableBalance: (statsByStatus.approved?.total || 0),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ---------- SETTLEMENT REPORT EXPORT ----------
async function exportSettlements(req, res, next) {
  try {
    const { startDate, endDate, status } = req.query;

    const vendor = await Vendor.findOne({ userId: req.user._id });
    if (!vendor) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_VENDOR', message: 'Vendor profile required' },
      });
    }

    const query = { subjectId: vendor._id, type: 'vendor' };
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
      .populate('orderId', 'orderId totals createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Build CSV
    const headers = ['Order ID', 'Date', 'Order Amount', 'Commission %', 'Your Earnings', 'Status', 'Paid Date', 'Payment Ref'];
    const rows = commissions.map(c => [
      c.orderId?.orderId || 'N/A',
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '',
      c.orderId?.totals?.total != null ? c.orderId.totals.total.toFixed(2) : '',
      c.percentage != null ? `${c.percentage}%` : '',
      c.amount.toFixed(2),
      c.status,
      c.paidAt ? new Date(c.paidAt).toLocaleDateString('en-IN') : '',
      c.paymentRef || '',
    ]);

    // Summary rows
    const totalEarnings = commissions.reduce((s, c) => s + c.amount, 0);
    const pendingTotal = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
    const approvedTotal = commissions.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
    const paidTotal = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);

    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total Records', commissions.length]);
    rows.push(['Total Earnings', '', '', '', totalEarnings.toFixed(2)]);
    rows.push(['Pending', '', '', '', pendingTotal.toFixed(2)]);
    rows.push(['Approved', '', '', '', approvedTotal.toFixed(2)]);
    rows.push(['Paid', '', '', '', paidTotal.toFixed(2)]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const filename = `settlements_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
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

async function getKYCStats(req, res, next) {
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

    const kyc = vendor.kyc || {};
    const documents = kyc.documents || [];

    // Calculate business info completion
    const businessInfoFields = ['businessName', 'businessType', 'businessAddress', 'phoneNumber'];
    const businessInfoComplete = businessInfoFields.filter(field => kyc[field]).length;
    const businessInfoTotal = businessInfoFields.length;
    const businessInfoPercentage = Math.round((businessInfoComplete / businessInfoTotal) * 100);

    // GST verification status
    const gstComplete = kyc.gstVerified === true;
    const gstPercentage = gstComplete ? 100 : (kyc.taxId ? 50 : 0);

    // Document requirements
    const requiredDocTypes = ['id_proof', 'address_proof'];
    const uploadedDocTypes = documents.map(d => d.type);
    const documentsComplete = requiredDocTypes.filter(type => uploadedDocTypes.includes(type)).length;
    const documentsTotal = requiredDocTypes.length;
    const documentsPercentage = Math.round((documentsComplete / documentsTotal) * 100);

    // Overall completion
    const overallPercentage = Math.round(
      (businessInfoPercentage * 0.3) + // 30% weight for business info
      (gstPercentage * 0.3) + // 30% weight for GST
      (documentsPercentage * 0.4) // 40% weight for documents
    );

    // Step statuses for progress stepper
    const getStepStatus = (stepNum) => {
      if (kyc.status === 'approved') return 'completed';
      if (kyc.status === 'rejected') return stepNum === 4 ? 'rejected' : 'completed';

      switch (stepNum) {
        case 1: // Business Info
          return businessInfoPercentage === 100 ? 'completed' :
                 businessInfoPercentage > 0 ? 'current' : 'pending';
        case 2: // GST Verify
          if (businessInfoPercentage < 100) return 'pending';
          return gstComplete ? 'completed' :
                 kyc.taxId ? 'current' : 'pending';
        case 3: // Documents
          if (!gstComplete) return 'pending';
          return documentsPercentage === 100 ? 'completed' :
                 documentsPercentage > 0 ? 'current' : 'pending';
        case 4: // Review/Approved
          if (documentsPercentage < 100) return 'pending';
          return kyc.status === 'approved' ? 'completed' : 'current';
        default:
          return 'pending';
      }
    };

    const steps = [
      { number: 1, title: 'Business Info', status: getStepStatus(1) },
      { number: 2, title: 'GST Verify', status: getStepStatus(2) },
      { number: 3, title: 'Documents', status: getStepStatus(3) },
      { number: 4, title: kyc.status === 'approved' ? 'Approved' : 'Review', status: getStepStatus(4) }
    ];

    // Document status breakdown
    const documentStatus = {
      id_proof: {
        uploaded: uploadedDocTypes.includes('id_proof'),
        document: documents.find(d => d.type === 'id_proof') || null
      },
      address_proof: {
        uploaded: uploadedDocTypes.includes('address_proof'),
        document: documents.find(d => d.type === 'address_proof') || null
      },
      business_license: {
        uploaded: uploadedDocTypes.includes('business_license'),
        document: documents.find(d => d.type === 'business_license') || null,
        optional: true
      },
      tax_certificate: {
        uploaded: uploadedDocTypes.includes('tax_certificate'),
        document: documents.find(d => d.type === 'tax_certificate') || null,
        optional: true
      }
    };

    res.json({
      success: true,
      data: {
        status: kyc.status || 'pending',
        rejectionReason: kyc.rejectionReason,
        verifiedAt: kyc.verifiedAt,
        completion: {
          overall: overallPercentage,
          businessInfo: {
            percentage: businessInfoPercentage,
            completed: businessInfoComplete,
            total: businessInfoTotal,
            fields: {
              businessName: !!kyc.businessName,
              businessType: !!kyc.businessType,
              businessAddress: !!kyc.businessAddress,
              phoneNumber: !!kyc.phoneNumber
            }
          },
          gst: {
            percentage: gstPercentage,
            taxIdEntered: !!kyc.taxId,
            verified: kyc.gstVerified || false,
            details: kyc.gstDetails || null
          },
          documents: {
            percentage: documentsPercentage,
            completed: documentsComplete,
            total: documentsTotal,
            status: documentStatus
          }
        },
        steps,
        canSubmitForReview: businessInfoPercentage === 100 && gstComplete && documentsPercentage === 100,
        isApproved: kyc.status === 'approved',
        isRejected: kyc.status === 'rejected',
        isPending: kyc.status === 'pending' || !kyc.status
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updateKYC(req, res, next) {
  try {
    const { businessName, businessType, businessAddress, taxId, phoneNumber, gstVerified, gstDetails, submit } = req.body;

    const vendor = await Vendor.findOne({ userId: req.user._id });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
      });
    }

    // If submitting for review, validate mandatory fields
    if (submit) {
      const missing = [];
      if (!businessName?.trim() && !vendor.kyc.businessName) missing.push('Business Name');
      if (!businessType && !vendor.kyc.businessType) missing.push('Business Type');
      if (!businessAddress?.trim() && !vendor.kyc.businessAddress) missing.push('Business Address');
      if (!phoneNumber?.trim() && !vendor.kyc.phoneNumber) missing.push('Phone Number');
      if (!gstVerified && !vendor.kyc.gstVerified) missing.push('GST Verification');
      // Check documents
      const docs = vendor.kyc.documents || [];
      const hasIdProof = docs.some(d => d.type === 'id_proof');
      const hasAddressProof = docs.some(d => d.type === 'address_proof');
      if (!hasIdProof) missing.push('ID Proof Document');
      if (!hasAddressProof) missing.push('Address Proof Document');

      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: `Please complete the following before submitting: ${missing.join(', ')}`,
            missingFields: missing,
          },
        });
      }
    }

    // Update KYC fields
    if (businessName !== undefined) vendor.kyc.businessName = businessName;
    if (businessType !== undefined) vendor.kyc.businessType = businessType;
    if (businessAddress !== undefined) vendor.kyc.businessAddress = businessAddress;
    if (taxId !== undefined) {
      vendor.kyc.taxId = taxId;
      // Reset GST verification if taxId changes
      if (vendor.kyc.taxId !== taxId) {
        vendor.kyc.gstVerified = false;
        vendor.kyc.gstDetails = undefined;
      }
    }
    if (phoneNumber !== undefined) vendor.kyc.phoneNumber = phoneNumber;
    if (gstVerified !== undefined) vendor.kyc.gstVerified = gstVerified;
    if (gstDetails !== undefined) vendor.kyc.gstDetails = gstDetails;

    // If KYC was rejected and user is updating, reset to pending
    if (vendor.kyc.status === 'rejected') {
      vendor.kyc.status = 'pending';
      vendor.kyc.rejectionReason = undefined;
    }

    // If submitting for review, set status to pending
    if (submit && vendor.kyc.status !== 'approved') {
      vendor.kyc.status = 'pending';
    }

    await vendor.save();

    logger.info(`KYC ${submit ? 'submitted' : 'updated'} for vendor: ${vendor.storeName}`);

    res.json({
      success: true,
      data: {
        kyc: vendor.kyc,
        message: submit ? 'KYC submitted for review successfully' : 'KYC information updated successfully',
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
    const validTypes = ['business_license', 'tax_certificate', 'id_proof', 'address_proof', 'other'];
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
    const { accountHolderName, bankName, accountNumber, ifscCode, swiftCode, panNumber, upiId } = req.body;

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
    if (upiId !== undefined) vendor.bank.upiId = upiId;

    // Save PAN number for TDS compliance
    if (panNumber !== undefined) {
      vendor.panNumber = panNumber.toUpperCase();
    }

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

    // Only "shipped" requires carrier assignment
    if (status === 'shipped') {
      if (!order.shipment || !order.shipment.awb || !order.shipment.carrier) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CARRIER_NOT_ASSIGNED',
            message: 'Assign a courier before marking as shipped.',
          },
        });
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

    // Auto-approve commissions on delivery (money stays on hold until admin releases)
    if (status === 'delivered') {
      const payoutService = require('../services/payoutService');
      payoutService.autoApproveCommissions(order._id).catch(err => {
        logger.error(`Auto-approve commissions failed for order ${order._id}:`, err);
      });
      // NOTE: Held Razorpay transfers are NOT released here.
      // Admin must manually release via dashboard after the 7-day return window.
    }

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
// ---------- CATEGORY MANAGEMENT ----------
async function getCategories(req, res, next) {
  try {
    const { search, includeInactive } = req.query;

    // Build filter - vendors can see all categories including inactive
    const filter = {};
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }

    // Search by name
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const categories = await Category.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Get product counts for each category
    const categoryIds = categories.map(c => c._id);
    const productCounts = await Product.aggregate([
      { $match: { categoryIds: { $in: categoryIds } } },
      { $unwind: '$categoryIds' },
      { $group: { _id: '$categoryIds', count: { $sum: 1 } } }
    ]);

    // Map counts to categories
    const countMap = {};
    productCounts.forEach(pc => { countMap[pc._id.toString()] = pc.count; });

    const categoriesWithCounts = categories.map(cat => ({
      ...cat,
      productCount: countMap[cat._id.toString()] || 0
    }));

    res.json({ success: true, data: categoriesWithCounts });
  } catch (error) {
    next(error);
  }
}

async function getCategoryStats(req, res, next) {
  try {
    const userId = req.user._id;

    // Get all categories
    const categories = await Category.find().lean();

    // Count stats
    const totalCategories = categories.length;
    const activeCategories = categories.filter(c => c.isActive).length;
    const yourCategories = categories.filter(c => c.createdBy?.toString() === userId.toString()).length;
    const pendingDeletion = categories.filter(c => c.deleteRequested).length;

    // Get categories with products
    const categoryIds = categories.map(c => c._id);
    const categoriesWithProducts = await Product.aggregate([
      { $match: { categoryIds: { $in: categoryIds } } },
      { $unwind: '$categoryIds' },
      { $group: { _id: '$categoryIds' } }
    ]);

    res.json({
      success: true,
      data: {
        totalCategories,
        activeCategories,
        yourCategories,
        categoriesWithProducts: categoriesWithProducts.length,
        pendingDeletion
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, description, image, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: { message: 'Category name is required' } });
    }

    const slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, error: { message: 'Category with this name already exists' } });
    }

    const category = await Category.create({
      name,
      slug,
      description,
      image,
      parentId: parentId || null,
      createdBy: req.user._id,
    });

    logger.info(`Category created by vendor ${req.user._id}: ${name}`);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: { message: 'Category not found' } });
    }
    if (!category.createdBy || category.createdBy.toString() !== req.user._id) {
      return res.status(403).json({ success: false, error: { message: 'You can only edit categories you created' } });
    }

    const { name, description, image, parentId } = req.body;
    if (name) {
      category.name = name;
      category.slug = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    }
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (parentId !== undefined) category.parentId = parentId || null;

    await category.save();
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, error: { message: 'Category not found' } });
    }

    // Vendors can only request deletion of their own categories
    if (req.user.role !== 'admin') {
      if (!category.createdBy || category.createdBy.toString() !== req.user._id) {
        return res.status(403).json({ success: false, error: { message: 'You can only request deletion of categories you created' } });
      }
      if (category.deleteRequested) {
        return res.status(400).json({ success: false, error: { message: 'Delete request already submitted for this category' } });
      }
      category.deleteRequested = true;
      category.deleteRequestedBy = req.user._id;
      category.deleteRequestedAt = new Date();
      await category.save();
      logger.info(`Category delete requested by vendor ${req.user._id}: ${category.name}`);
      return res.json({ success: true, message: 'Delete request submitted. Admin will review it.' });
    }

    // Admin can directly delete
    const productCount = await Product.countDocuments({ categoryIds: category._id });
    if (productCount > 0) {
      return res.status(400).json({ success: false, error: { message: `Cannot delete: ${productCount} products are using this category` } });
    }

    await Category.findByIdAndDelete(req.params.id);
    logger.info(`Category deleted by admin ${req.user._id}: ${category.name}`);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getVendorBySlug,
  getVendorReviews,
  onboard,
  getDashboardStats,
  getProductStats,
  getVendorProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  exportProducts,
  importProducts,
  getInventory,
  getInventoryStats,
  updateInventory,
  getVendorOrderCounts,
  getVendorOrders,
  updateOrderStatus,
  getSettlements,
  getSettlementStats,
  exportSettlements,
  getKYC,
  getKYCStats,
  updateKYC,
  uploadKYCDocument,
  deleteKYCDocument,
  // Settings
  getSettings,
  updateProfile,
  updateBank,
  updatePolicies,
  updatePayout,
  // Categories
  getCategories,
  getCategoryStats,
  createCategory,
  updateCategory,
  deleteCategory,
};
