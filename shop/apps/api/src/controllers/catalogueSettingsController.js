// FILE: apps/api/src/controllers/catalogueSettingsController.js
const CatalogueSettings = require('../models/CatalogueSettings');
const AppError = require('../utils/AppError');
const asyncHandler = require('../middleware/asyncHandler');

// Fields projected for populated product items shown on the public catalogue
const PUBLIC_PRODUCT_FIELDS = 'title slug images seo.title published';

// Return (or create) the singleton settings document
async function getOrCreate() {
  let settings = await CatalogueSettings.findOne();
  if (!settings) {
    settings = await CatalogueSettings.create({});
  }
  return settings;
}

// GET /api/catalogue-settings  — public
// Returns settings + populated product list when mode = 'manual'
exports.getSettings = asyncHandler(async (req, res) => {
  let settings = await getOrCreate();

  let manualProducts = [];
  if (settings.productMode === 'manual' && settings.manualProducts.length > 0) {
    // Populate, sort by stored order, filter to published-only
    const populated = await CatalogueSettings
      .findById(settings._id)
      .populate({
        path: 'manualProducts.productId',
        select: PUBLIC_PRODUCT_FIELDS,
        match: { published: true },
      })
      .lean();

    manualProducts = (populated.manualProducts || [])
      .filter(entry => entry.productId !== null)  // removed/unpublished products
      .sort((a, b) => a.order - b.order)
      .map(entry => entry.productId);
  }

  let categorySlug = null;
  if (settings.productMode === 'category' && settings.categoryId) {
    const Category = require('../models/Category');
    const cat = await Category.findById(settings.categoryId).select('slug name').lean();
    categorySlug = cat?.slug || null;
  }

  res.json({
    success: true,
    data: {
      title: settings.title,
      subtitle: settings.subtitle,
      showSearch: settings.showSearch,
      showCategoryFilter: settings.showCategoryFilter,
      productMode: settings.productMode,
      productsPerPage: settings.productsPerPage,
      // Derived fields for the public page
      manualProducts,         // array of product objects (mode=manual only)
      categorySlug,           // string slug (mode=category only)
    },
  });
});

// GET /api/catalogue-settings/admin  — admin only
// Full settings with product/category details for the admin form
exports.getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await CatalogueSettings
    .findOne()
    .populate({
      path: 'manualProducts.productId',
      select: 'title slug images published',
    })
    .populate('categoryId', 'name slug');

  if (!settings) {
    // Return defaults — don't create yet
    return res.json({ success: true, data: new CatalogueSettings() });
  }

  res.json({ success: true, data: settings });
});

// PUT /api/catalogue-settings  — admin only
// Full replace of mutable fields; creates the document if it doesn't exist yet
exports.updateSettings = asyncHandler(async (req, res) => {
  const {
    title,
    subtitle,
    showSearch,
    showCategoryFilter,
    productMode,
    manualProducts,  // array of { productId, order }
    categoryId,
    productsPerPage,
  } = req.body;

  // Validate productMode
  const validModes = ['all', 'manual', 'category'];
  if (productMode !== undefined && !validModes.includes(productMode)) {
    throw AppError.badRequest(`productMode must be one of: ${validModes.join(', ')}`);
  }

  // Validate manualProducts array when provided
  if (manualProducts !== undefined) {
    if (!Array.isArray(manualProducts)) {
      throw AppError.badRequest('manualProducts must be an array');
    }
    // Deduplicate by productId
    const seen = new Set();
    for (const entry of manualProducts) {
      if (!entry.productId) throw AppError.badRequest('Each manualProducts entry must have a productId');
      if (seen.has(String(entry.productId))) {
        throw AppError.badRequest('manualProducts contains duplicate productId entries');
      }
      seen.add(String(entry.productId));
    }
  }

  const update = {};
  if (title !== undefined) update.title = String(title).trim().slice(0, 100);
  if (subtitle !== undefined) update.subtitle = String(subtitle).trim().slice(0, 200);
  if (showSearch !== undefined) update.showSearch = Boolean(showSearch);
  if (showCategoryFilter !== undefined) update.showCategoryFilter = Boolean(showCategoryFilter);
  if (productMode !== undefined) update.productMode = productMode;
  if (manualProducts !== undefined) {
    update.manualProducts = manualProducts.map((p, i) => ({
      productId: p.productId,
      order: typeof p.order === 'number' ? p.order : i,
    }));
  }
  if (categoryId !== undefined) update.categoryId = categoryId || null;
  if (productsPerPage !== undefined) {
    const n = parseInt(productsPerPage, 10);
    if (isNaN(n) || n < 12 || n > 200) throw AppError.badRequest('productsPerPage must be between 12 and 200');
    update.productsPerPage = n;
  }

  const settings = await CatalogueSettings.findOneAndUpdate(
    {},
    { $set: update },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({ success: true, data: settings });
});
