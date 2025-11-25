// FILE: apps/api/src/controllers/flashSaleController.js
const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');

// Get all active flash sales
exports.getActiveFlashSales = async (req, res, next) => {
  try {
    // Update statuses first
    await FlashSale.updateStatuses();

    const flashSales = await FlashSale.find({
      status: 'active',
      isActive: true,
    })
      .populate('products.productId')
      .sort({ displayPriority: -1, startDate: -1 })
      .lean();

    // Filter out products that don't exist and add time remaining
    const activeSales = flashSales.map(sale => {
      const validProducts = sale.products.filter(p => p.productId);

      return {
        ...sale,
        products: validProducts,
        timeRemaining: new FlashSale(sale).getTimeRemaining(),
      };
    }).filter(sale => sale.products.length > 0);

    res.json({
      success: true,
      data: activeSales,
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific flash sale by ID
exports.getFlashSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const flashSale = await FlashSale.findById(id)
      .populate('products.productId')
      .lean();

    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: { code: 'FLASH_SALE_NOT_FOUND', message: 'Flash sale not found' },
      });
    }

    // Filter out products that don't exist
    const validProducts = flashSale.products.filter(p => p.productId);

    res.json({
      success: true,
      data: {
        ...flashSale,
        products: validProducts,
        timeRemaining: new FlashSale(flashSale).getTimeRemaining(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Check if a product is in any active flash sale
exports.getProductFlashSale = async (req, res, next) => {
  try {
    const { productId } = req.params;

    await FlashSale.updateStatuses();

    const flashSale = await FlashSale.findOne({
      status: 'active',
      isActive: true,
      'products.productId': productId,
    }).lean();

    if (!flashSale) {
      return res.json({
        success: true,
        data: null,
      });
    }

    const productInSale = flashSale.products.find(
      p => p.productId.toString() === productId
    );

    res.json({
      success: true,
      data: {
        saleId: flashSale._id,
        title: flashSale.title,
        discountType: productInSale.discountType,
        discountValue: productInSale.discountValue,
        flashPrice: productInSale.flashPrice,
        originalPrice: productInSale.originalPrice,
        timeRemaining: new FlashSale(flashSale).getTimeRemaining(),
        stockLimit: productInSale.stockLimit,
        soldCount: productInSale.soldCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Create flash sale
exports.createFlashSale = async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, products, banner, displayPriority } = req.body;

    // Calculate flash prices and validate products
    const processedProducts = [];
    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: `Product ${item.productId} not found` },
        });
      }

      let flashPrice;
      if (item.discountType === 'percentage') {
        flashPrice = Math.round(product.price * (1 - item.discountValue / 100));
      } else {
        flashPrice = product.price - item.discountValue;
      }

      processedProducts.push({
        productId: item.productId,
        discountType: item.discountType,
        discountValue: item.discountValue,
        flashPrice,
        originalPrice: product.price,
        stockLimit: item.stockLimit,
        soldCount: 0,
      });
    }

    // Determine initial status
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    let status = 'scheduled';
    if (now >= start && now <= end) {
      status = 'active';
    } else if (now > end) {
      status = 'ended';
    }

    const flashSale = await FlashSale.create({
      title,
      description,
      startDate,
      endDate,
      products: processedProducts,
      banner,
      displayPriority: displayPriority || 0,
      status,
    });

    res.status(201).json({
      success: true,
      data: flashSale,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update flash sale
exports.updateFlashSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const flashSale = await FlashSale.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: { code: 'FLASH_SALE_NOT_FOUND', message: 'Flash sale not found' },
      });
    }

    res.json({
      success: true,
      data: flashSale,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete flash sale
exports.deleteFlashSale = async (req, res, next) => {
  try {
    const { id } = req.params;

    const flashSale = await FlashSale.findByIdAndDelete(id);

    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: { code: 'FLASH_SALE_NOT_FOUND', message: 'Flash sale not found' },
      });
    }

    res.json({
      success: true,
      message: 'Flash sale deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all flash sales (including inactive)
exports.getAllFlashSales = async (req, res, next) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status) query.status = status;

    const flashSales = await FlashSale.find(query)
      .populate('products.productId', 'title images slug')
      .sort({ displayPriority: -1, createdAt: -1 });

    res.json({
      success: true,
      data: flashSales,
    });
  } catch (error) {
    next(error);
  }
};
