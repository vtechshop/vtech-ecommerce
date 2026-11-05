'use strict';
const crypto = require('crypto');
const WooHandoffToken = require('../models/WooHandoffToken');
const WooUsedNonce = require('../models/WooUsedNonce');
const { generateRawToken, sha256hex, buildCanonical } = require('../utils/wooHmac');
const { resolveItems, importIntoCart, pickContact } = require('../services/wooCartImportService');
const Cart = require('../models/Cart');
const { getOrCreateGuestId } = require('./cartController');
const logger = require('../config/logger');

const TOKEN_TTL_SECONDS = 1800; // 30 minutes
const RAW_TOKEN_RE = /^[a-f0-9]{64}$/;
const SESSION_TOKEN_KEY = 'vtech_woo_handoff';
const SESSION_ERROR_KEY = 'vtech_woo_handoff_error';

function notTransferable(res, externalSource, errors) {
  return res.status(422).json({
    success: false,
    error: {
      code: 'CART_NOT_TRANSFERABLE',
      message: 'Some products in this cart cannot be checked out on VTech Kitchen.',
      externalSource,
      items: errors,
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/woo/handoff
// Called server-to-server by the WooCommerce plugin after HMAC verification.
// ---------------------------------------------------------------------------

exports.createHandoffToken = async (req, res) => {
  // req.woo is set by verifyWooHmac middleware
  const { externalSource, nonce, timestamp, items, address } = req.woo;

  try {
    // Nonce replay protection — atomic insert; E11000 = replay
    try {
      await WooUsedNonce.create({ key: `${externalSource}:${nonce}` });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(401).json({
          success: false,
          error: { code: 'NONCE_REPLAY', message: 'Request could not be authenticated' },
        });
      }
      throw err;
    }

    // Fail fast while the customer is still on the storefront, so WooCommerce can show
    // which products are blocked. Re-checked at import time because state can change.
    const resolved = await resolveItems(externalSource, items);
    if (!resolved.ok) {
      return notTransferable(res, externalSource, resolved.errors);
    }

    const rawToken = generateRawToken();         // 64-char hex, NEVER logged
    const tokenHash = sha256hex(rawToken);

    // Canonical hash for audit trail (proves which payload was signed without exposing secret)
    const canonical = buildCanonical('POST', '/api/woo/handoff', externalSource, nonce, timestamp, items, address);

    await WooHandoffToken.create({
      tokenHash,
      externalSource,
      items,
      address,
      canonicalHash: sha256hex(canonical),
      expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000),
    });

    logger.info(`WooHandoff token created: hash=${tokenHash.slice(0, 12)}… source=${externalSource}`);

    return res.status(201).json({ success: true, token: rawToken });
  } catch (err) {
    logger.error('createHandoffToken error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create handoff token' } });
  }
};

// ---------------------------------------------------------------------------
// POST /api/woo/landing  (application/x-www-form-urlencoded, browser form POST)
// The storefront auto-submits the token here. The page is served on the VTech web origin
// (www.vtechkitchen.com/api/* is proxied to the API), so it can hand the token to the SPA
// through sessionStorage and navigate with location.replace — the token never appears in
// a URL, the browser history, or a Referer header. Nothing is consumed here.
// ---------------------------------------------------------------------------

exports.landing = (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const payload = RAW_TOKEN_RE.test(token) ? JSON.stringify(token) : 'null';
  const nonce = crypto.randomBytes(16).toString('base64');

  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy':
      `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  });

  return res.status(200).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex">
<title>Continuing to VTech Kitchen checkout</title></head>
<body><p>Taking you to VTech Kitchen checkout…</p>
<noscript><p>Turn on JavaScript to continue to checkout.</p></noscript>
<script nonce="${nonce}">(function(){var t=${payload};try{if(t){sessionStorage.setItem('${SESSION_TOKEN_KEY}',t);}else{sessionStorage.setItem('${SESSION_ERROR_KEY}','INVALID_TOKEN');}}catch(e){}location.replace('/woo-checkout');})();</script>
</body></html>`);
};

// ---------------------------------------------------------------------------
// POST /api/woo/cart/import
// Called by the VTech /woo-checkout page with the token in the JSON body. Uses the
// caller's existing VTech identity (Bearer login or guestId cookie) — WooCommerce
// credentials are never used to sign anyone in.
// ---------------------------------------------------------------------------

exports.importCart = async (req, res) => {
  res.set({ 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' });

  const { token } = req.body || {};
  if (typeof token !== 'string' || !RAW_TOKEN_RE.test(token)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token format' } });
  }

  try {
    const userId = req.user?._id;
    const guestId = userId ? null : getOrCreateGuestId(req, res);
    const cartQuery = userId ? { userId } : { guestId };
    const owner = sha256hex(userId ? `user:${userId}` : `guest:${guestId}`);
    const tokenHash = sha256hex(token);
    const now = new Date();

    // Claim: only an unexpired 'issued' token can move on, and only one caller wins.
    const doc = await WooHandoffToken.findOneAndUpdate(
      { tokenHash, status: 'issued', expiresAt: { $gt: now } },
      { $set: { status: 'claimed', importOwner: owner, claimedAt: now, used: true, usedAt: now } },
      { new: true }
    );

    if (!doc) {
      const existing = await WooHandoffToken.findOne({ tokenHash }).select('status importOwner externalSource').lean();
      if (existing && existing.importOwner === owner && existing.status === 'imported') {
        // Same browser re-submitting (double click, refresh): nothing is added again.
        return res.json({ success: true, data: { externalSource: existing.externalSource, alreadyImported: true } });
      }
      if (existing && existing.importOwner === owner && existing.status === 'claimed') {
        return res.status(409).json({
          success: false,
          error: { code: 'IMPORT_IN_PROGRESS', message: 'This cart is already being transferred.' },
        });
      }
      return res.status(410).json({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'This checkout link has expired or has already been used.' },
      });
    }

    const reject = (errors) => WooHandoffToken.updateOne(
      { _id: doc._id },
      { $set: { status: 'rejected', rejectionCodes: [...new Set(errors.map(e => e.code))] } }
    );

    const resolved = await resolveItems(doc.externalSource, doc.items);
    if (!resolved.ok) {
      await reject(resolved.errors);
      return notTransferable(res, doc.externalSource, resolved.errors);
    }

    const result = await importIntoCart(cartQuery, resolved.lines, {
      externalSource: doc.externalSource,
      contact: pickContact(doc.address),
    });
    if (!result.ok && result.busy) {
      // Nothing was written, so the token can safely be claimed again.
      await WooHandoffToken.updateOne(
        { _id: doc._id, status: 'claimed' },
        { $set: { status: 'issued', importOwner: null, claimedAt: null, used: false, usedAt: null } }
      );
      return res.status(409).json({
        success: false,
        error: { code: 'CART_BUSY', message: 'Your cart was being updated. Please try again.' },
      });
    }
    if (!result.ok) {
      await reject(result.errors);
      return notTransferable(res, doc.externalSource, result.errors);
    }

    await WooHandoffToken.updateOne({ _id: doc._id }, { $set: { status: 'imported', importedAt: new Date() } });
    logger.info(`WooHandoff cart imported: hash=${tokenHash.slice(0, 12)}… source=${doc.externalSource} lines=${resolved.lines.length}`);

    return res.json({
      success: true,
      data: {
        externalSource: doc.externalSource,
        importedLines: resolved.lines.length,
        importedQuantity: resolved.lines.reduce((sum, l) => sum + l.qty, 0),
      },
    });
  } catch (err) {
    // Token is left 'claimed' on unexpected errors: the cart write may have happened,
    // so re-opening it could import twice. The customer restarts from the storefront.
    logger.error('importCart error:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to transfer cart' } });
  }
};

// ---------------------------------------------------------------------------
// GET /api/woo/cart/contact
// Checkout pre-fill for the caller's own cart only (same identity rules as /api/cart).
// Never creates a guest cookie: no cookie means no cart, so nothing to return.
// ---------------------------------------------------------------------------

exports.getCartContact = async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    const userId = req.user?._id;
    const guestId = req.cookies?.guestId;
    const query = userId ? { userId } : guestId ? { guestId } : null;
    const cart = query ? await Cart.findOne(query).select('wooContact').lean() : null;
    return res.json({ success: true, data: cart?.wooContact || null });
  } catch (err) {
    next(err);
  }
};
