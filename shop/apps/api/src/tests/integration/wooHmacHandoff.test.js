'use strict';
const path = require('path');
const crypto = require('crypto');
const WooHandoffToken = require('../../models/WooHandoffToken');
const WooUsedNonce   = require('../../models/WooUsedNonce');
const {
  buildCanonical, computeHmac, safeEqual,
  isTimestampValid, sha256hex, generateRawToken, TIMESTAMP_TOLERANCE_SECONDS,
} = require('../../utils/wooHmac');

// Test vectors shared with PHP — 6 levels up from integration/ to workspace root
const vectors = require(path.resolve(__dirname, '../../../../../../woocommerce-plugin/vtech-checkout/test-vectors.json'));

const TEST_SECRET_VEG   = 'test-secret-vegetable-xxxxxxxxxxxxxxxx';
const TEST_SECRET_STYLE = 'test-secret-styleyourlyf-xxxxxxxxxxxx';

// ---------------------------------------------------------------------------
// 1 — Canonical string test vectors
// ---------------------------------------------------------------------------

describe('1 — Canonical string — shared test vectors', () => {
  for (const v of vectors.vectors) {
    test(`[${v.id}] ${v.description}`, () => {
      const { method, path: p, externalSource, nonce, timestamp, items, address } = v.input;
      const canonical = buildCanonical(method, p, externalSource, nonce, timestamp, items, address);
      expect(canonical).toBe(v.expectedCanonical);
      expect(computeHmac(canonical, vectors.testSecret)).toBe(v.expectedSignature);
    });
  }
});

// ---------------------------------------------------------------------------
// 2 — HMAC utility unit tests
// ---------------------------------------------------------------------------

describe('2 — HMAC utility', () => {
  test('computeHmac returns 64-char lowercase hex', () => {
    const sig = computeHmac('some canonical string', 'some-secret');
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  test('computeHmac is deterministic — same inputs produce same output', () => {
    const a = computeHmac('payload', 'key');
    const b = computeHmac('payload', 'key');
    expect(a).toBe(b);
  });

  test('computeHmac differs when payload changes', () => {
    const a = computeHmac('payloadA', 'key');
    const b = computeHmac('payloadB', 'key');
    expect(a).not.toBe(b);
  });

  test('computeHmac differs when secret changes', () => {
    const a = computeHmac('payload', 'key1');
    const b = computeHmac('payload', 'key2');
    expect(a).not.toBe(b);
  });

  test('safeEqual: equal hex strings match', () => {
    const hex = crypto.randomBytes(32).toString('hex');
    expect(safeEqual(hex, hex)).toBe(true);
  });

  test('safeEqual: different hex strings do not match', () => {
    const a = crypto.randomBytes(32).toString('hex');
    const b = crypto.randomBytes(32).toString('hex');
    expect(safeEqual(a, b)).toBe(false);
  });

  test('safeEqual: returns false for non-string inputs', () => {
    expect(safeEqual(null, null)).toBe(false);
    expect(safeEqual(123, 'abc')).toBe(false);
  });

  test('isTimestampValid: accepts timestamp within tolerance', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isTimestampValid(now)).toBe(true);
    expect(isTimestampValid(now - TIMESTAMP_TOLERANCE_SECONDS + 1)).toBe(true);
    expect(isTimestampValid(now + TIMESTAMP_TOLERANCE_SECONDS - 1)).toBe(true);
  });

  test('isTimestampValid: rejects timestamp outside tolerance', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isTimestampValid(now - TIMESTAMP_TOLERANCE_SECONDS - 1)).toBe(false);
    expect(isTimestampValid(now + TIMESTAMP_TOLERANCE_SECONDS + 1)).toBe(false);
  });

  test('generateRawToken returns 64-char lowercase hex', () => {
    const token = generateRawToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  test('generateRawToken returns unique values each call', () => {
    const tokens = new Set(Array.from({ length: 20 }, generateRawToken));
    expect(tokens.size).toBe(20);
  });

  test('sha256hex returns 64-char lowercase hex', () => {
    const h = sha256hex('hello');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  test('sha256hex is deterministic', () => {
    expect(sha256hex('hello')).toBe(sha256hex('hello'));
  });
});

// ---------------------------------------------------------------------------
// 3 — WooHandoffToken model
// ---------------------------------------------------------------------------

describe('3 — WooHandoffToken model', () => {
  test('creates a token document with tokenHash and expiry', async () => {
    const rawToken  = generateRawToken();
    const hash      = sha256hex(rawToken);
    const expiresAt = new Date(Date.now() + 1800000);
    const doc = await WooHandoffToken.create({
      tokenHash:     hash,
      externalSource:'woo_vegetablecuttingmachine',
      items:         [{ wooProductId: '1', wooVariantId: null, qty: 1 }],
      address:       { city: 'Chennai' },
      canonicalHash: sha256hex('canonical'),
      expiresAt,
    });
    expect(doc.used).toBe(false);
    expect(doc.tokenHash).toBe(hash);
  });

  test('prevents duplicate tokenHash', async () => {
    const hash = sha256hex(generateRawToken());
    const base = {
      tokenHash:     hash,
      externalSource:'woo_vegetablecuttingmachine',
      items:         [],
      address:       {},
      canonicalHash: sha256hex('x'),
      expiresAt:     new Date(Date.now() + 1800000),
    };
    await WooHandoffToken.create(base);
    await expect(WooHandoffToken.create({ ...base })).rejects.toMatchObject({ code: 11000 });
  });
});

// ---------------------------------------------------------------------------
// 4 — WooUsedNonce model
// ---------------------------------------------------------------------------

describe('4 — WooUsedNonce model', () => {
  test('creates a nonce record', async () => {
    const doc = await WooUsedNonce.create({ key: `woo_vegetablecuttingmachine:nonce-test-1` });
    expect(doc.key).toBeDefined();
  });

  test('rejects duplicate nonce key (replay protection)', async () => {
    const key = `woo_vegetablecuttingmachine:nonce-dup-${Date.now()}`;
    await WooUsedNonce.create({ key });
    await expect(WooUsedNonce.create({ key })).rejects.toMatchObject({ code: 11000 });
  });
});

// ---------------------------------------------------------------------------
// 5 — Sign → verify round-trip
// ---------------------------------------------------------------------------

describe('5 — Sign → verify round-trip', () => {
  function buildRequest({ externalSource, secret, nonce, timestamp, items, address }) {
    const method = 'POST';
    const p      = '/api/woo/handoff';
    const canonical  = buildCanonical(method, p, externalSource, nonce, timestamp, items, address);
    const signature  = computeHmac(canonical, secret);
    return { signature, canonical };
  }

  const validItems   = [{ wooProductId: '10', wooVariantId: null, qty: 1 }];
  const validAddress = { fullName: 'Test', phone: '1234567890', addressLine1: '1 St', city: 'C', state: 'S', zipCode: '600001', country: 'IN' };
  const validTs      = Math.floor(Date.now() / 1000);

  test('valid signature verifies correctly', () => {
    const { signature } = buildRequest({
      externalSource: 'woo_vegetablecuttingmachine',
      secret:         TEST_SECRET_VEG,
      nonce:          'validnonce12345a',
      timestamp:      validTs,
      items:          validItems,
      address:        validAddress,
    });
    const rebuilt  = buildCanonical('POST', '/api/woo/handoff', 'woo_vegetablecuttingmachine', 'validnonce12345a', validTs, validItems, validAddress);
    const expected = computeHmac(rebuilt, TEST_SECRET_VEG);
    expect(safeEqual(signature, expected)).toBe(true);
  });

  test('wrong storefront secret fails verification', () => {
    const { signature } = buildRequest({
      externalSource: 'woo_vegetablecuttingmachine',
      secret:         TEST_SECRET_VEG,
      nonce:          'wrongsecret1234a',
      timestamp:      validTs,
      items:          validItems,
      address:        validAddress,
    });
    const rebuilt  = buildCanonical('POST', '/api/woo/handoff', 'woo_vegetablecuttingmachine', 'wrongsecret1234a', validTs, validItems, validAddress);
    const expected = computeHmac(rebuilt, TEST_SECRET_STYLE); // wrong secret
    expect(safeEqual(signature, expected)).toBe(false);
  });

  test('expired timestamp fails isTimestampValid', () => {
    const expiredTs = Math.floor(Date.now() / 1000) - TIMESTAMP_TOLERANCE_SECONDS - 10;
    expect(isTimestampValid(expiredTs)).toBe(false);
  });

  test('future timestamp beyond tolerance fails isTimestampValid', () => {
    const futureTs = Math.floor(Date.now() / 1000) + TIMESTAMP_TOLERANCE_SECONDS + 10;
    expect(isTimestampValid(futureTs)).toBe(false);
  });

  test('altered payload (item qty changed) fails signature verification', () => {
    const nonce = 'alteredpayload1a';
    const { signature } = buildRequest({
      externalSource: 'woo_vegetablecuttingmachine',
      secret:         TEST_SECRET_VEG,
      nonce,
      timestamp:      validTs,
      items:          validItems,
      address:        validAddress,
    });
    const tamperedItems = [{ wooProductId: '10', wooVariantId: null, qty: 99 }];
    const rebuilt  = buildCanonical('POST', '/api/woo/handoff', 'woo_vegetablecuttingmachine', nonce, validTs, tamperedItems, validAddress);
    const expected = computeHmac(rebuilt, TEST_SECRET_VEG);
    expect(safeEqual(signature, expected)).toBe(false);
  });

  test('altered payload (address city changed) fails signature verification', () => {
    const nonce = 'alteredaddress1a';
    const { signature } = buildRequest({
      externalSource: 'woo_vegetablecuttingmachine',
      secret:         TEST_SECRET_VEG,
      nonce,
      timestamp:      validTs,
      items:          validItems,
      address:        validAddress,
    });
    const tamperedAddress = { ...validAddress, city: 'EVIL_CITY' };
    const rebuilt  = buildCanonical('POST', '/api/woo/handoff', 'woo_vegetablecuttingmachine', nonce, validTs, validItems, tamperedAddress);
    const expected = computeHmac(rebuilt, TEST_SECRET_VEG);
    expect(safeEqual(signature, expected)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6 — Token lifecycle: create → redeem → replay blocked
// ---------------------------------------------------------------------------

describe('6 — Token lifecycle', () => {
  test('token is not redeemable before creation', async () => {
    const fakeToken = generateRawToken();
    const hash = sha256hex(fakeToken);
    const doc = await WooHandoffToken.findOneAndUpdate(
      { tokenHash: hash, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true, usedAt: new Date() } },
      { new: false }
    );
    expect(doc).toBeNull();
  });

  test('token created correctly and redeemable once', async () => {
    const rawToken  = generateRawToken();
    const tokenHash = sha256hex(rawToken);
    const expiresAt = new Date(Date.now() + 1800000);

    await WooHandoffToken.create({
      tokenHash,
      externalSource: 'woo_vegetablecuttingmachine',
      items:   [{ wooProductId: '5', wooVariantId: null, qty: 1 }],
      address: { city: 'Chennai' },
      canonicalHash: sha256hex('test-canonical'),
      expiresAt,
    });

    // First redeem — succeeds
    const doc1 = await WooHandoffToken.findOneAndUpdate(
      { tokenHash, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true, usedAt: new Date() } },
      { new: false }
    );
    expect(doc1).not.toBeNull();
    expect(doc1.used).toBe(false); // was false before update

    // Second redeem — blocked (already used)
    const doc2 = await WooHandoffToken.findOneAndUpdate(
      { tokenHash, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true, usedAt: new Date() } },
      { new: false }
    );
    expect(doc2).toBeNull();
  });

  test('expired token is not redeemable', async () => {
    const rawToken  = generateRawToken();
    const tokenHash = sha256hex(rawToken);
    const expiresAt = new Date(Date.now() - 1); // expired 1ms ago

    await WooHandoffToken.create({
      tokenHash,
      externalSource: 'woo_vegetablecuttingmachine',
      items:   [],
      address: {},
      canonicalHash: sha256hex('x'),
      expiresAt,
    });

    const doc = await WooHandoffToken.findOneAndUpdate(
      { tokenHash, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true, usedAt: new Date() } },
      { new: false }
    );
    expect(doc).toBeNull();
  });
});
