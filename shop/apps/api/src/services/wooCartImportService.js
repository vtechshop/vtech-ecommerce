'use strict';
const WooProductMapping = require('../models/WooProductMapping');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

// Same per-item cap as cartController.addItem / updateItem
const MAX_QUANTITY = 100;
const MAX_LINES = 50;
const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CART_WRITE_ATTEMPTS = 3;
const WOO_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const MESSAGES = {
  INVALID_ITEM: 'This cart line is malformed.',
  INVALID_QUANTITY: `Quantity must be a whole number from 1 to ${MAX_QUANTITY}.`,
  TOO_MANY_ITEMS: `A cart can contain at most ${MAX_LINES} different products.`,
  MAPPING_NOT_FOUND: 'This product is not available for VTech Kitchen checkout.',
  MAPPING_INACTIVE: 'This product is no longer available for VTech Kitchen checkout.',
  PRODUCT_NOT_FOUND: 'This product is no longer available.',
  PRODUCT_UNAVAILABLE: 'This product is currently unavailable.',
  VARIANT_REQUIRED: 'This product option is not available for VTech Kitchen checkout.',
  VARIANT_NOT_FOUND: 'This product option is no longer available.',
  QUANTITY_LIMIT: `At most ${MAX_QUANTITY} of one product can be in the cart.`,
  INSUFFICIENT_STOCK: 'Not enough stock for the requested quantity.',
};

function itemError(ref, code) {
  return {
    wooProductId: ref.wooProductId ?? null,
    wooVariantId: ref.wooVariantId ?? null,
    code,
    message: MESSAGES[code],
  };
}

/**
 * Validates and de-duplicates WooCommerce cart lines. Only wooProductId, wooVariantId and
 * qty are read; any other field (price, vendor, title...) is ignored by design.
 */
function normalizeWooItems(rawItems) {
  const errors = [];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { lines: [], errors: [itemError({}, 'INVALID_ITEM')] };
  }

  const byKey = new Map();
  for (const raw of rawItems) {
    const wooProductId = raw && raw.wooProductId != null ? String(raw.wooProductId) : '';
    const wooVariantId = raw && raw.wooVariantId != null && raw.wooVariantId !== '' ? String(raw.wooVariantId) : null;
    const ref = { wooProductId, wooVariantId };

    if (!WOO_ID_RE.test(wooProductId) || (wooVariantId !== null && !WOO_ID_RE.test(wooVariantId))) {
      errors.push(itemError(ref, 'INVALID_ITEM'));
      continue;
    }
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) {
      errors.push(itemError(ref, 'INVALID_QUANTITY'));
      continue;
    }

    const key = `${wooProductId}|${wooVariantId ?? ''}`;
    const line = byKey.get(key);
    if (line) {
      line.qty += qty;
    } else {
      byKey.set(key, { wooProductId, wooVariantId, qty });
    }
  }

  const lines = [...byKey.values()];
  for (const line of lines) {
    if (line.qty > MAX_QUANTITY) errors.push(itemError(line, 'INVALID_QUANTITY'));
  }
  if (lines.length > MAX_LINES) errors.push(itemError({}, 'TOO_MANY_ITEMS'));

  return { lines, errors };
}

/**
 * Resolves every WooCommerce line to an authoritative VTech cart line.
 * Returns { ok: true, lines } or { ok: false, errors } — never a partial result.
 */
async function resolveItems(externalSource, rawItems) {
  const { lines: wooLines, errors } = normalizeWooItems(rawItems);
  if (errors.length) return { ok: false, errors };

  const mappings = await WooProductMapping.find({
    externalSource,
    $or: wooLines.map(l => ({ wooProductId: l.wooProductId, wooVariantId: l.wooVariantId })),
  }).lean();

  const sameWooKey = (m, l) => m.wooProductId === l.wooProductId && (m.wooVariantId ?? null) === l.wooVariantId;

  const mapped = [];
  for (const line of wooLines) {
    const candidates = mappings.filter(m => sameWooKey(m, line));
    const active = candidates.find(m => m.active);
    if (!active) {
      errors.push(itemError(line, candidates.length ? 'MAPPING_INACTIVE' : 'MAPPING_NOT_FOUND'));
      continue;
    }
    mapped.push({ line, mapping: active });
  }
  if (errors.length) return { ok: false, errors };

  const productIds = [...new Set(mapped.map(m => String(m.mapping.vtechProductId)))];
  const products = await Product.find({ _id: { $in: productIds } })
    .select('title price images slug stock published taxIncluded taxable taxRate variants')
    .lean();
  const productById = new Map(products.map(p => [String(p._id), p]));

  // Several Woo lines may map to the same VTech product/variant — merge them.
  const vtechLines = new Map();
  for (const { line, mapping } of mapped) {
    const product = productById.get(String(mapping.vtechProductId));
    if (!product) { errors.push(itemError(line, 'PRODUCT_NOT_FOUND')); continue; }
    if (product.published !== true) { errors.push(itemError(line, 'PRODUCT_UNAVAILABLE')); continue; }

    let variant = null;
    if (mapping.vtechVariantId) {
      variant = (product.variants || []).find(v => String(v._id) === mapping.vtechVariantId) || null;
      if (!variant) { errors.push(itemError(line, 'VARIANT_NOT_FOUND')); continue; }
    } else if (product.variants && product.variants.length > 0) {
      // Stock for variant products lives on the variant; a product-level line would
      // deduct the wrong stock at order time.
      errors.push(itemError(line, 'VARIANT_REQUIRED'));
      continue;
    }

    // Matches orderController: variant price when a variant is selected, else product price.
    const price = variant ? variant.price : product.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      errors.push(itemError(line, 'PRODUCT_UNAVAILABLE'));
      continue;
    }

    const variantId = variant ? String(variant._id) : null;
    const key = `${product._id}|${variantId ?? ''}`;
    const existing = vtechLines.get(key);
    if (existing) {
      existing.qty += line.qty;
      existing.wooRefs.push(line);
      continue;
    }
    vtechLines.set(key, {
      productId: product._id,
      variantId,
      qty: line.qty,
      availableStock: variant ? variant.stock : product.stock,
      wooRefs: [line],
      cartItem: {
        productId: product._id,
        variantId,
        priceSnapshot: price,
        name: product.title,
        image: product.images?.[0] || null,
        productSlug: product.slug,
        variantName: variant ? variant.name : undefined,
        taxIncluded: product.taxIncluded || false,
        taxable: product.taxable || false,
        taxRate: product.taxRate || 0,
      },
    });
  }
  if (errors.length) return { ok: false, errors };

  const lines = [...vtechLines.values()];
  for (const l of lines) {
    if (l.qty > MAX_QUANTITY) l.wooRefs.forEach(ref => errors.push(itemError(ref, 'QUANTITY_LIMIT')));
    else if (!(l.availableStock >= l.qty)) l.wooRefs.forEach(ref => errors.push(itemError(ref, 'INSUFFICIENT_STOCK')));
  }
  if (errors.length) return { ok: false, errors };

  return { ok: true, lines };
}

/**
 * Merges resolved lines into the identity's cart with one conditional single-document
 * write, so the import is all-or-nothing without needing a replica-set transaction.
 * The write is guarded on updatedAt; if any other cart write lands between our read
 * and our write, we re-read and re-validate rather than overwrite it.
 *
 * Imported lines are kept separate from native lines (and from the other storefront's
 * lines) for the same product, so every cart line — and later every order item — has
 * exactly one source.
 *
 * Returns { ok: true, cart } | { ok: false, errors } | { ok: false, busy: true }.
 */
async function importIntoCart(cartQuery, lines, { externalSource, contact }) {
  const sameProduct = (i, line) =>
    String(i.productId) === String(line.productId) && (i.variantId ?? null) === line.variantId;

  for (let attempt = 0; attempt < CART_WRITE_ATTEMPTS; attempt++) {
    let cart = await Cart.findOne(cartQuery);
    if (!cart) {
      cart = await Cart.findOneAndUpdate(cartQuery, { $setOnInsert: { items: [] } }, { upsert: true, new: true });
    }
    const readAt = cart.updatedAt;

    const merged = cart.items.map(i => i.toObject());
    const errors = [];
    for (const line of lines) {
      const idx = merged.findIndex(i => sameProduct(i, line) && (i.externalSource ?? null) === externalSource);
      const lineTotal = (idx >= 0 ? merged[idx].qty : 0) + line.qty;
      // Stock covers every line of this product/variant, whatever its source
      const productTotal = merged.filter(i => sameProduct(i, line)).reduce((sum, i) => sum + i.qty, 0) + line.qty;

      if (lineTotal > MAX_QUANTITY) {
        line.wooRefs.forEach(ref => errors.push(itemError(ref, 'QUANTITY_LIMIT')));
      } else if (!(line.availableStock >= productTotal)) {
        line.wooRefs.forEach(ref => errors.push(itemError(ref, 'INSUFFICIENT_STOCK')));
      } else if (idx >= 0) {
        merged[idx].qty = lineTotal;
      } else {
        merged.push({ ...line.cartItem, qty: line.qty, externalSource });
      }
    }
    if (errors.length) return { ok: false, errors };

    cart.items = merged;
    cart.calculateTotals();

    const result = await Cart.updateOne(
      { _id: cart._id, updatedAt: readAt },
      {
        $set: {
          items: cart.items,
          totals: cart.totals,
          expiresAt: new Date(Date.now() + CART_TTL_MS),
          wooContact: { ...contact, externalSource, importedAt: new Date() },
        },
      }
    );
    if (result.matchedCount === 1) {
      return { ok: true, cart: await Cart.findById(cart._id) };
    }
  }
  return { ok: false, busy: true };
}

const CONTACT_FIELDS = ['fullName', 'email', 'phone', 'addressLine1', 'addressLine2', 'city', 'state', 'zipCode', 'country'];
const CONTACT_MAX_LENGTH = 200;

/** Keeps only known checkout fields from the signed handoff address, as bounded strings. */
function pickContact(address) {
  const contact = {};
  if (!address || typeof address !== 'object') return contact;
  for (const field of CONTACT_FIELDS) {
    const value = address[field];
    if (typeof value === 'string' && value.trim()) contact[field] = value.trim().slice(0, CONTACT_MAX_LENGTH);
  }
  return contact;
}

module.exports = {
  MAX_QUANTITY,
  MAX_LINES,
  normalizeWooItems,
  resolveItems,
  importIntoCart,
  pickContact,
};
