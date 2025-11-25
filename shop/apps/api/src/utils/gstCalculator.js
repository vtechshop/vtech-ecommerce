// FILE: apps/api/src/utils/gstCalculator.js
// GST calculation utility for Indian taxation

/**
 * Calculate GST based on buyer and seller locations
 *
 * GST Rules in India:
 * - Intra-state sales (same state): CGST + SGST/UTGST
 * - Inter-state sales (different states): IGST
 *
 * @param {number} amount - The taxable amount
 * @param {string} sellerState - Seller's state code (e.g., 'MH', 'DL')
 * @param {string} buyerState - Buyer's state code (e.g., 'MH', 'DL')
 * @param {number} gstRate - Total GST rate (default: 18%)
 * @returns {object} GST breakdown with CGST, SGST/UTGST, IGST, and total
 */
const calculateGST = (amount, sellerState, buyerState, gstRate = 18) => {
  const isIntraState = sellerState === buyerState;

  const result = {
    amount,
    sellerState,
    buyerState,
    gstRate,
    isIntraState,
    cgst: 0,
    sgst: 0,
    utgst: 0,
    igst: 0,
    totalGst: 0,
    totalAmount: 0,
  };

  if (isIntraState) {
    // Intra-state: CGST + SGST/UTGST (split equally)
    result.cgst = (amount * (gstRate / 2)) / 100;

    // Union Territories use UTGST, States use SGST
    const unionTerritories = ['AN', 'CH', 'DH', 'JK', 'LA', 'LD', 'PY'];
    if (unionTerritories.includes(sellerState)) {
      result.utgst = (amount * (gstRate / 2)) / 100;
    } else {
      result.sgst = (amount * (gstRate / 2)) / 100;
    }

    result.totalGst = result.cgst + result.sgst + result.utgst;
  } else {
    // Inter-state: IGST only
    result.igst = (amount * gstRate) / 100;
    result.totalGst = result.igst;
  }

  result.totalAmount = amount + result.totalGst;

  return result;
};

/**
 * Get GST components as a formatted string for display
 * @param {object} gstBreakdown - Result from calculateGST
 * @returns {string} Formatted GST string
 */
const formatGSTBreakdown = (gstBreakdown) => {
  if (gstBreakdown.isIntraState) {
    if (gstBreakdown.sgst > 0) {
      return `CGST ${gstBreakdown.gstRate / 2}% + SGST ${gstBreakdown.gstRate / 2}%`;
    } else {
      return `CGST ${gstBreakdown.gstRate / 2}% + UTGST ${gstBreakdown.gstRate / 2}%`;
    }
  } else {
    return `IGST ${gstBreakdown.gstRate}%`;
  }
};

/**
 * Calculate GST for multiple items (cart/order)
 * @param {Array} items - Array of items with {amount, sellerState}
 * @param {string} buyerState - Buyer's state code
 * @param {number} gstRate - GST rate (default: 18%)
 * @returns {object} Aggregated GST breakdown
 */
const calculateCartGST = (items, buyerState, gstRate = 18) => {
  const result = {
    subtotal: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalUtgst: 0,
    totalIgst: 0,
    totalGst: 0,
    grandTotal: 0,
    itemBreakdowns: [],
  };

  items.forEach(item => {
    const itemGst = calculateGST(item.amount, item.sellerState || buyerState, buyerState, gstRate);

    result.subtotal += item.amount;
    result.totalCgst += itemGst.cgst;
    result.totalSgst += itemGst.sgst;
    result.totalUtgst += itemGst.utgst;
    result.totalIgst += itemGst.igst;
    result.totalGst += itemGst.totalGst;

    result.itemBreakdowns.push({
      itemId: item.id,
      ...itemGst,
    });
  });

  result.grandTotal = result.subtotal + result.totalGst;

  return result;
};

/**
 * Get common GST rates used in India
 * @returns {object} Common GST rates by category
 */
const getCommonGSTRates = () => {
  return {
    nil: {
      rate: 0,
      description: 'Essential goods (fresh produce, books, newspapers)',
      examples: ['Fresh vegetables', 'Books', 'Newspapers'],
    },
    low: {
      rate: 5,
      description: 'Basic necessities',
      examples: ['Sugar', 'Tea', 'Coffee', 'Edible oil', 'Coal'],
    },
    standard_low: {
      rate: 12,
      description: 'Processed foods and general items',
      examples: ['Butter', 'Ghee', 'Computers', 'Processed food'],
    },
    standard: {
      rate: 18,
      description: 'Most goods and services (default)',
      examples: ['Electronics', 'Garments', 'Services', 'Industrial goods'],
    },
    luxury: {
      rate: 28,
      description: 'Luxury and sin goods',
      examples: ['Cars', 'Motorcycles', 'Tobacco', 'Aerated drinks', 'AC'],
    },
  };
};

module.exports = {
  calculateGST,
  formatGSTBreakdown,
  calculateCartGST,
  getCommonGSTRates,
};
