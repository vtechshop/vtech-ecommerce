'use strict';
const express = require('express');
const router = express.Router();
const { verifyWooHmac } = require('../middleware/wooHmacAuth');
const { optionalAuth } = require('../middleware/auth');
const { webhookLimiter, checkoutLimiter } = require('../middleware/rateLimiter');
const handoff = require('../controllers/wooHandoffController');

// Server-to-server handoff token creation (called by WooCommerce plugin)
// Protected exclusively by HMAC-SHA256 — no JWT, no session
router.post('/handoff', webhookLimiter, verifyWooHmac, handoff.createHandoffToken);

// Browser form POST from the storefront; relays the token to the SPA without a URL
router.post('/landing', checkoutLimiter, handoff.landing);

// Called by the /woo-checkout page; imports into the caller's existing VTech cart
router.post('/cart/import', checkoutLimiter, optionalAuth, handoff.importCart);

// Checkout pre-fill from the verified handoff, for the cart's owner only
router.get('/cart/contact', optionalAuth, handoff.getCartContact);

module.exports = router;
