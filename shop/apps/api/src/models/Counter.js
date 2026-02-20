// FILE: apps/api/src/models/Counter.js
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'invoice_W', 'invoice_M'
  seq: { type: Number, default: 0 },
});

/**
 * Atomically increment and return the next sequence number.
 * @param {string} name - Counter name (e.g., 'invoice_W')
 * @returns {Promise<number>} Next sequence number
 */
counterSchema.statics.getNextSequence = async function (name) {
  const counter = await this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
