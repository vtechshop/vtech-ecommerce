const mongoose = require('mongoose');
const EXTERNAL_SOURCES = require('./WooProductMapping').schema.path('externalSource').enumValues;

const TOKEN_STATUSES = ['issued', 'claimed', 'imported', 'rejected'];

const wooHandoffTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true }, // SHA-256(rawToken) hex
  externalSource: { type: String, enum: EXTERNAL_SOURCES, required: true },
  items: { type: mongoose.Schema.Types.Mixed, required: true },
  address: { type: mongoose.Schema.Types.Mixed, required: true },
  canonicalHash: { type: String, required: true }, // SHA-256(canonicalString) hex — for audit
  expiresAt: { type: Date, required: true },
  // issued → claimed → imported | rejected. Only an 'issued' token can be claimed,
  // so a token can add items to a cart at most once.
  status: { type: String, enum: TOKEN_STATUSES, default: 'issued' },
  // SHA-256 of the claiming cart identity ("user:<id>" / "guest:<id>"); lets the same
  // browser re-submit idempotently without exposing the identity itself.
  importOwner: { type: String, default: null },
  claimedAt: { type: Date, default: null },
  importedAt: { type: Date, default: null },
  rejectionCodes: { type: [String], default: undefined },
  used: { type: Boolean, default: false },
  usedAt: { type: Date, default: null },
}, { timestamps: true });

wooHandoffTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-cleanup after expiry
wooHandoffTokenSchema.index({ externalSource: 1, used: 1 });

module.exports = mongoose.model('WooHandoffToken', wooHandoffTokenSchema);
