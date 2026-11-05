const mongoose = require('mongoose');

const wooUsedNonceSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // "externalSource:nonce"
  createdAt: { type: Date, default: Date.now },
});

// TTL: auto-delete after 15 minutes (longer than the 5-min timestamp tolerance window)
wooUsedNonceSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

module.exports = mongoose.model('WooUsedNonce', wooUsedNonceSchema);
