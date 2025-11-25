// FILE: apps/api/src/utils/pricing.js
const calculateOrderTotals = (items, taxRate = 0.1, shipping = 0, discount = 0) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax + shipping - discount;

  return {
    subtotal,
    tax,
    shipping,
    discount,
    total,
  };
};

module.exports = {
  calculateOrderTotals,
};