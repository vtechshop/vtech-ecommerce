// FILE: apps/api/src/utils/hash.js
const bcrypt = require('bcryptjs');

async function hashPassword(plain) {
  // SECURITY: Use 12 rounds minimum (2025 OWASP recommendation)
  // Each increment doubles the time, making brute-force exponentially harder
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, comparePassword };
