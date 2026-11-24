// Order totals are rounded to the nearest rupee, with the difference shown as "Round off".
// Half a rupee rounds up (₹100.50 → ₹101).

/**
 * @param {number} amount total before rounding (may have paise)
 * @returns {{ total: number, roundOff: number }} whole-rupee total and the adjustment (−0.49 … +0.50)
 */
function roundOffTotal(amount) {
  const exact = Math.round((Number(amount) || 0) * 100) / 100;
  const total = Math.max(0, Math.round(exact));
  const roundOff = Math.round((total - exact) * 100) / 100;
  return { total, roundOff };
}

module.exports = { roundOffTotal };
