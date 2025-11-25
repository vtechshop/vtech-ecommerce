const Product = require('../models/Product');
const Category = require('../models/Category');

// Get all categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// Get category by slug
exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({ slug, isActive: true }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Category not found',
        },
      });
    }

    // Fetch products in this category
    const products = await Product.find({
      published: true,
      categoryIds: { $in: [category._id] },
    })
      .populate('vendorId', 'storeName slug')
      .lean();

    res.json({
      success: true,
      data: {
        category,
        items: products,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all products
exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, sort = '-createdAt' } = req.query;

    const query = { published: true };

    if (category) {
      query.categoryIds = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('vendorId', 'storeName slug')
        .lean(),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
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

// Search products
exports.searchProducts = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20, category, minPrice, maxPrice } = req.query;

    const query = { published: true };

    if (q) {
      query.$text = { $search: q };
    }

    if (category) {
      query.categoryIds = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('vendorId', 'storeName slug')
        .lean(),
      Product.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: products,
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

// Get product by slug
exports.getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({ slug, published: true })
      .populate('vendorId', 'storeName slug rating reviewCount')
      .populate('categoryIds', 'name slug')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// Get related products
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 8 } = req.query;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: id },
      published: true,
      categoryIds: { $in: product.categoryIds },
    })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: relatedProducts,
    });
  } catch (error) {
    next(error);
  }
};