// FILE: apps/api/src/tests/integration/wooProductMapping.test.js
//
// Integration tests for WooProductMapping model and controller.
// Tests run against MongoMemoryServer (see setup.js).

const mongoose = require('mongoose');
const WooProductMapping = require('../../models/WooProductMapping');
const Product = require('../../models/Product');
const Vendor = require('../../models/Vendor');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let vendor;
let productSimple;    // no variants
let productVariant;   // has 2 variants

beforeAll(async () => {
  vendor = await Vendor.create({
    userId: new mongoose.Types.ObjectId(),
    storeName: 'Woo Test Vendor',
    slug: 'woo-test-vendor',
    status: 'active',
  });

  productSimple = await Product.create({
    vendorId: vendor._id,
    title: 'Simple Blender',
    slug: 'simple-blender',
    description: 'A simple product',
    price: 500,
    stock: 10,
    published: true,
  });

  productVariant = await Product.create({
    vendorId: vendor._id,
    title: 'Multi-Cutter',
    slug: 'multi-cutter',
    description: 'Product with variants',
    price: 1000,
    stock: 0,
    published: true,
    variants: [
      { name: 'Red', sku: 'MC-RED', price: 1000, stock: 5 },
      { name: 'Blue', sku: 'MC-BLUE', price: 1100, stock: 8 },
    ],
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapping(overrides = {}) {
  return {
    externalSource: 'woo_vegetablecuttingmachine',
    wooProductId: `woo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    wooVariantId: null,
    vtechProductId: productSimple._id,
    vtechVariantId: null,
    active: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1 — Model: basic create and retrieve
// ---------------------------------------------------------------------------

describe('1 — WooProductMapping model: basic CRUD', () => {
  test('creates an active mapping with required fields', async () => {
    const doc = await WooProductMapping.create(mapping());
    expect(doc._id).toBeDefined();
    expect(doc.active).toBe(true);
    expect(doc.createdAt).toBeDefined();
  });

  test('wooVariantId defaults to null', async () => {
    const doc = await WooProductMapping.create(mapping({ wooVariantId: undefined }));
    expect(doc.wooVariantId).toBeNull();
  });

  test('vtechVariantId defaults to null', async () => {
    const doc = await WooProductMapping.create(mapping({ vtechVariantId: undefined }));
    expect(doc.vtechVariantId).toBeNull();
  });

  test('notes are stored and trimmed', async () => {
    const doc = await WooProductMapping.create(mapping({ notes: '  admin note  ' }));
    expect(doc.notes).toBe('admin note');
  });

  test('notes exceeding 500 chars are rejected by schema maxlength', async () => {
    await expect(
      WooProductMapping.create(mapping({ notes: 'x'.repeat(501) }))
    ).rejects.toThrow();
  });

  test('rejects unknown externalSource', async () => {
    await expect(
      WooProductMapping.create(mapping({ externalSource: 'woo_unknown' }))
    ).rejects.toThrow();
  });

  test('woo_styleyourlyf is a valid externalSource', async () => {
    const doc = await WooProductMapping.create(mapping({ externalSource: 'woo_styleyourlyf' }));
    expect(doc.externalSource).toBe('woo_styleyourlyf');
  });
});

// ---------------------------------------------------------------------------
// 2 — Partial unique index: duplicate active mapping prevention
// ---------------------------------------------------------------------------

describe('2 — Partial unique index: duplicate active mapping prevention', () => {
  test('rejects duplicate (externalSource, wooProductId, wooVariantId) when both active', async () => {
    const base = mapping({ wooProductId: `dup-active-${Date.now()}` });
    await WooProductMapping.create(base);
    await expect(WooProductMapping.create({ ...base })).rejects.toMatchObject({ code: 11000 });
  });

  test('allows same (externalSource, wooProductId, wooVariantId) if first is inactive', async () => {
    const wooProductId = `dup-inactive-${Date.now()}`;
    const base = mapping({ wooProductId });
    const first = await WooProductMapping.create(base);
    await WooProductMapping.findByIdAndUpdate(first._id, { active: false });
    // Now create a new active one with the same key — should succeed
    const second = await WooProductMapping.create({ ...base });
    expect(second.active).toBe(true);
  });

  test('wooVariantId=null is part of the unique key', async () => {
    const wooProductId = `var-key-${Date.now()}`;
    // Simple product (no variant) and variant product — same wooProductId, different wooVariantId
    await WooProductMapping.create(mapping({ wooProductId, wooVariantId: null }));
    const withVariant = await WooProductMapping.create(mapping({ wooProductId, wooVariantId: '999' }));
    expect(withVariant._id).toBeDefined();
  });

  test('two different storefronts can map the same wooProductId', async () => {
    const wooProductId = `cross-store-${Date.now()}`;
    await WooProductMapping.create(mapping({ wooProductId, externalSource: 'woo_vegetablecuttingmachine' }));
    const second = await WooProductMapping.create(mapping({ wooProductId, externalSource: 'woo_styleyourlyf' }));
    expect(second._id).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3 — vtechProductId / vtechVariantId: validation logic used by controller
// ---------------------------------------------------------------------------

describe('3 — VTech product and variant references', () => {
  test('stores a valid vtechProductId ObjectId', async () => {
    const doc = await WooProductMapping.create(mapping({ vtechProductId: productSimple._id }));
    expect(doc.vtechProductId.toString()).toBe(productSimple._id.toString());
  });

  test('stores a vtechVariantId string when provided', async () => {
    const variantId = productVariant.variants[0]._id.toString();
    const doc = await WooProductMapping.create(
      mapping({ vtechProductId: productVariant._id, vtechVariantId: variantId })
    );
    expect(doc.vtechVariantId).toBe(variantId);
  });

  test('mongoose rejects a non-ObjectId string for vtechProductId', async () => {
    await expect(
      WooProductMapping.create(mapping({ vtechProductId: 'not-an-id' }))
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4 — Deactivation: active→false, stays queryable
// ---------------------------------------------------------------------------

describe('4 — Deactivation', () => {
  test('deactivated mapping has active=false and is still persisted', async () => {
    const doc = await WooProductMapping.create(mapping());
    await WooProductMapping.findByIdAndUpdate(doc._id, { active: false });
    const found = await WooProductMapping.findById(doc._id);
    expect(found.active).toBe(false);
  });

  test('active filter correctly excludes inactive documents', async () => {
    const wooProductId = `deact-filter-${Date.now()}`;
    const doc = await WooProductMapping.create(mapping({ wooProductId }));
    await WooProductMapping.findByIdAndUpdate(doc._id, { active: false });
    const results = await WooProductMapping.find({ wooProductId, active: true });
    expect(results).toHaveLength(0);
  });

  test('active filter includes inactive documents when active=false', async () => {
    const wooProductId = `deact-false-${Date.now()}`;
    const doc = await WooProductMapping.create(mapping({ wooProductId }));
    await WooProductMapping.findByIdAndUpdate(doc._id, { active: false });
    const results = await WooProductMapping.find({ wooProductId, active: false });
    expect(results).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 5 — Index lookups
// ---------------------------------------------------------------------------

describe('5 — Index-backed lookups', () => {
  test('lookup by vtechProductId and active returns correct docs', async () => {
    const wooProductId = `idx-vtech-${Date.now()}`;
    await WooProductMapping.create(mapping({ wooProductId, vtechProductId: productSimple._id }));
    const results = await WooProductMapping.find({ vtechProductId: productSimple._id, active: true });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every(r => r.active)).toBe(true);
  });

  test('lookup by externalSource and active', async () => {
    const wooProductId = `idx-src-${Date.now()}`;
    await WooProductMapping.create(mapping({ wooProductId, externalSource: 'woo_styleyourlyf' }));
    const results = await WooProductMapping.find({ externalSource: 'woo_styleyourlyf', active: true });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 6 — EXTERNAL_SOURCES static
// ---------------------------------------------------------------------------

describe('6 — EXTERNAL_SOURCES static property', () => {
  test('EXTERNAL_SOURCES is accessible on the model', () => {
    expect(WooProductMapping.EXTERNAL_SOURCES).toEqual(['woo_vegetablecuttingmachine', 'woo_styleyourlyf']);
  });

  test('every enum value is in EXTERNAL_SOURCES', async () => {
    for (const src of WooProductMapping.EXTERNAL_SOURCES) {
      const doc = await WooProductMapping.create(mapping({ externalSource: src }));
      expect(doc.externalSource).toBe(src);
    }
  });
});
