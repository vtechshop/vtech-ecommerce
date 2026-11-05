// FILE: apps/api/src/controllers/wooMappingController.js
const mongoose = require('mongoose');
const WooProductMapping = require('../models/WooProductMapping');
const Product = require('../models/Product');
const logger = require('../config/logger');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Resolve and validate vtechProductId + vtechVariantId.
 * Returns { product, variantIdStr } on success, or throws an object
 * with { status, code, message } that the caller can send directly.
 */
async function resolveVtechProduct(vtechProductId, vtechVariantId) {
  if (!isValidObjectId(vtechProductId)) {
    throw { status: 400, code: 'INVALID_VTECH_PRODUCT_ID', message: 'vtechProductId is not a valid ObjectId' };
  }

  const product = await Product.findById(vtechProductId).select('title variants published');
  if (!product) {
    throw { status: 404, code: 'VTECH_PRODUCT_NOT_FOUND', message: `VTech product ${vtechProductId} not found` };
  }

  let variantIdStr = null;
  if (vtechVariantId) {
    const variant = product.variants.id(vtechVariantId);
    if (!variant) {
      throw {
        status: 404,
        code: 'VTECH_VARIANT_NOT_FOUND',
        message: `Variant ${vtechVariantId} not found on product ${product.title}`,
      };
    }
    variantIdStr = variant._id.toString();
  }

  return { product, variantIdStr };
}

// ---------------------------------------------------------------------------
// POST /admin/woo-mappings
// ---------------------------------------------------------------------------

exports.createMapping = async (req, res) => {
  try {
    const { externalSource, wooProductId, wooVariantId, vtechProductId, vtechVariantId, notes } = req.body;

    if (!externalSource || !WooProductMapping.EXTERNAL_SOURCES.includes(externalSource)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EXTERNAL_SOURCE',
          message: `externalSource must be one of: ${WooProductMapping.EXTERNAL_SOURCES.join(', ')}`,
        },
      });
    }

    if (!wooProductId || typeof wooProductId !== 'string' || !wooProductId.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_WOO_PRODUCT_ID', message: 'wooProductId is required and must be a non-empty string' },
      });
    }

    if (!vtechProductId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VTECH_PRODUCT_ID_REQUIRED', message: 'vtechProductId is required' },
      });
    }

    // Validate VTech product + variant
    let resolvedVariantId;
    try {
      const resolved = await resolveVtechProduct(vtechProductId, vtechVariantId || null);
      resolvedVariantId = resolved.variantIdStr;
    } catch (validationError) {
      return res.status(validationError.status).json({
        success: false,
        error: { code: validationError.code, message: validationError.message },
      });
    }

    const normalizedWooVariantId = wooVariantId ? wooVariantId.trim() : null;

    const mapping = await WooProductMapping.create({
      externalSource,
      wooProductId: wooProductId.trim(),
      wooVariantId: normalizedWooVariantId,
      vtechProductId,
      vtechVariantId: resolvedVariantId,
      notes: notes ? notes.trim().slice(0, 500) : undefined,
      active: true,
    });

    logger.info(`WooProductMapping created: ${mapping._id} (${externalSource} → vtechProduct ${vtechProductId})`);

    return res.status(201).json({ success: true, data: mapping });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ACTIVE_MAPPING',
          message: 'An active mapping already exists for this external source and WooCommerce product/variant combination',
        },
      });
    }
    logger.error('createMapping error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create mapping' } });
  }
};

// ---------------------------------------------------------------------------
// GET /admin/woo-mappings
// ---------------------------------------------------------------------------

exports.getMappings = async (req, res) => {
  try {
    const { externalSource, active, wooProductId, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (externalSource) {
      if (!WooProductMapping.EXTERNAL_SOURCES.includes(externalSource)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_EXTERNAL_SOURCE', message: 'Unknown externalSource filter value' },
        });
      }
      filter.externalSource = externalSource;
    }
    if (active !== undefined) {
      filter.active = active === 'true' || active === true;
    }
    if (wooProductId) {
      filter.wooProductId = wooProductId.trim();
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [mappings, total] = await Promise.all([
      WooProductMapping.find(filter)
        .populate('vtechProductId', 'title slug price published images variants')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WooProductMapping.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        mappings,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
    });
  } catch (err) {
    logger.error('getMappings error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch mappings' } });
  }
};

// ---------------------------------------------------------------------------
// GET /admin/woo-mappings/:id
// ---------------------------------------------------------------------------

exports.getMappingById = async (req, res) => {
  try {
    const mapping = await WooProductMapping.findById(req.params.id)
      .populate('vtechProductId', 'title slug price published images variants');

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: { code: 'MAPPING_NOT_FOUND', message: 'Mapping not found' },
      });
    }

    return res.json({ success: true, data: mapping });
  } catch (err) {
    logger.error('getMappingById error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch mapping' } });
  }
};

// ---------------------------------------------------------------------------
// PUT /admin/woo-mappings/:id
// ---------------------------------------------------------------------------

exports.updateMapping = async (req, res) => {
  try {
    const mapping = await WooProductMapping.findById(req.params.id);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: { code: 'MAPPING_NOT_FOUND', message: 'Mapping not found' },
      });
    }

    const { vtechProductId, vtechVariantId, notes } = req.body;

    // Only vtechProductId, vtechVariantId, and notes can be updated.
    // externalSource and wooProductId are immutable after creation (they identify the external resource).
    if (vtechProductId !== undefined) {
      let resolvedVariantId;
      try {
        const resolved = await resolveVtechProduct(vtechProductId, vtechVariantId !== undefined ? vtechVariantId : null);
        resolvedVariantId = resolved.variantIdStr;
      } catch (validationError) {
        return res.status(validationError.status).json({
          success: false,
          error: { code: validationError.code, message: validationError.message },
        });
      }
      mapping.vtechProductId = vtechProductId;
      mapping.vtechVariantId = resolvedVariantId;
    }

    if (notes !== undefined) {
      mapping.notes = notes ? notes.trim().slice(0, 500) : undefined;
    }

    await mapping.save();
    logger.info(`WooProductMapping updated: ${mapping._id}`);

    return res.json({ success: true, data: mapping });
  } catch (err) {
    logger.error('updateMapping error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update mapping' } });
  }
};

// ---------------------------------------------------------------------------
// PUT /admin/woo-mappings/:id/deactivate
// ---------------------------------------------------------------------------

exports.deactivateMapping = async (req, res) => {
  try {
    const mapping = await WooProductMapping.findById(req.params.id);
    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: { code: 'MAPPING_NOT_FOUND', message: 'Mapping not found' },
      });
    }

    if (!mapping.active) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_INACTIVE', message: 'Mapping is already inactive' },
      });
    }

    mapping.active = false;
    await mapping.save();
    logger.info(`WooProductMapping deactivated: ${mapping._id}`);

    return res.json({ success: true, data: mapping });
  } catch (err) {
    logger.error('deactivateMapping error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate mapping' } });
  }
};
