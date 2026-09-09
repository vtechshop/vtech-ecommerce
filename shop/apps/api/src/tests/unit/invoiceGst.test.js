/**
 * Unit tests for invoice per-item GST calculation logic.
 *
 * These tests validate the item-level GST separation introduced to fix the
 * "21% vs 18%" inconsistency caused by shipping GST being allocated to product rows.
 *
 * The logic under test (extracted from invoiceService.js forEach body):
 *   - item.taxIncluded  → perItemTaxRate = 'incl', itemTax = 0
 *   - item.taxRate > 0 && item.taxable → itemTax = lineTotal × taxRate/100
 *   - otherwise (historical/zero-rate) → perItemTaxRate = null, itemTax = 0
 */

function computeItemGst(item) {
  const lineTotal = (item.priceSnapshot || 0) * (item.qty || 1);
  let itemTax = 0;
  let perItemTaxRate = null;

  if (item.taxIncluded) {
    perItemTaxRate = 'incl';
  } else if ((item.taxRate || 0) > 0 && item.taxable) {
    itemTax = lineTotal * (item.taxRate / 100);
    perItemTaxRate = item.taxRate;
  }

  return { lineTotal, itemTax, perItemTaxRate, itemGrandTotal: lineTotal + itemTax };
}

// ─── Case 1: Single product @ 18% + ₹400 shipping ────────────────────────────
describe('Case 1 – Single product @ 18%', () => {
  const item = { priceSnapshot: 2700, qty: 1, taxRate: 18, taxable: true, taxIncluded: false };

  it('computes correct product GST (excludes shipping GST)', () => {
    const { itemTax, perItemTaxRate, itemGrandTotal } = computeItemGst(item);
    expect(itemTax).toBeCloseTo(486, 2);          // 2700 × 18% = 486
    expect(perItemTaxRate).toBe(18);
    expect(itemGrandTotal).toBeCloseTo(3186, 2);  // 2700 + 486
  });

  it('bottom IGST @ 18% uses order.totals.tax = 558 (product+shipping GST combined)', () => {
    // order.totals.tax = product GST (486) + shipping GST (72) = 558
    // effectiveRate = 558 / (2700 + 400) = 18%
    const taxTotal = 558;
    const subtotal  = 2700;
    const shipping  = 400;
    const effectiveRate = taxTotal / (subtotal + shipping) * 100;
    expect(effectiveRate).toBeCloseTo(18, 1);
    // Grand total = subtotal + shipping + tax = 2700 + 400 + 558
    expect(subtotal + shipping + taxTotal).toBe(3658);
  });
});

// ─── Case 2: Single product @ 5% + ₹400 shipping ────────────────────────────
describe('Case 2 – Single product @ 5%', () => {
  const item = { priceSnapshot: 5000, qty: 1, taxRate: 5, taxable: true, taxIncluded: false };

  it('computes correct product GST at 5%', () => {
    const { itemTax, perItemTaxRate } = computeItemGst(item);
    expect(itemTax).toBeCloseTo(250, 2);   // 5000 × 5%
    expect(perItemTaxRate).toBe(5);
  });
});

// ─── Case 3: Multiple products, same rate @ 18% ──────────────────────────────
describe('Case 3 – Multiple products, same rate @ 18%', () => {
  const items = [
    { priceSnapshot: 1000, qty: 2, taxRate: 18, taxable: true, taxIncluded: false },
    { priceSnapshot: 500,  qty: 1, taxRate: 18, taxable: true, taxIncluded: false },
  ];

  it('each item uses its own taxRate; sum equals total product GST', () => {
    const results = items.map(computeItemGst);
    expect(results[0].itemTax).toBeCloseTo(360, 2);  // 2000 × 18%
    expect(results[1].itemTax).toBeCloseTo(90,  2);  // 500  × 18%
    const sumProductGst = results.reduce((s, r) => s + r.itemTax, 0);
    // Product subtotal = 2500; product GST = 450; shipping GST (at 18% on shipping) is separate
    expect(sumProductGst).toBeCloseTo(450, 2);
  });
});

// ─── Case 4: Mixed rates @ 18% + 12% ────────────────────────────────────────
describe('Case 4 – Mixed rates: ₹20k @ 18% + ₹10k @ 12%', () => {
  const items = [
    { priceSnapshot: 20000, qty: 1, taxRate: 18, taxable: true, taxIncluded: false },
    { priceSnapshot: 10000, qty: 1, taxRate: 12, taxable: true, taxIncluded: false },
  ];

  it('each item uses its own taxRate independently', () => {
    const results = items.map(computeItemGst);
    expect(results[0].itemTax).toBeCloseTo(3600, 2);  // 20000 × 18%
    expect(results[1].itemTax).toBeCloseTo(1200, 2);  // 10000 × 12%
    expect(results[0].perItemTaxRate).toBe(18);
    expect(results[1].perItemTaxRate).toBe(12);
  });

  it('sum of per-item product GST = 4800 (excludes shipping GST of 540 at principal 18%)', () => {
    const results = items.map(computeItemGst);
    const sumProductGst = results.reduce((s, r) => s + r.itemTax, 0);
    expect(sumProductGst).toBeCloseTo(4800, 2);
    // order.totals.tax = 4800 + 540 = 5340; effectiveRate = 5340/33000 ≈ 16%
    // (blended rate — different from either item rate; totals section shows this correctly)
    const orderTax = 5340;
    const effectiveRate = orderTax / (30000 + 3000) * 100;
    expect(effectiveRate).toBeCloseTo(16.18, 1);
  });
});

// ─── Case 5: Tax-included product ────────────────────────────────────────────
describe('Case 5 – Tax-included product', () => {
  const item = { priceSnapshot: 1500, qty: 1, taxRate: 18, taxable: true, taxIncluded: true };

  it('shows "incl" and zero additional GST', () => {
    const { itemTax, perItemTaxRate, itemGrandTotal } = computeItemGst(item);
    expect(perItemTaxRate).toBe('incl');
    expect(itemTax).toBe(0);
    expect(itemGrandTotal).toBe(1500);  // price unchanged — tax already included
  });
});

// ─── Case 6: Free shipping ────────────────────────────────────────────────────
describe('Case 6 – Free shipping', () => {
  const item = { priceSnapshot: 3000, qty: 1, taxRate: 18, taxable: true, taxIncluded: false };

  it('product GST is unaffected by zero shipping', () => {
    const { itemTax, perItemTaxRate } = computeItemGst(item);
    expect(itemTax).toBeCloseTo(540, 2);  // 3000 × 18%
    expect(perItemTaxRate).toBe(18);
    // With free shipping: shippingTax = 0; order.totals.tax = product GST only = 540
  });
});

// ─── Case 7: Interstate IGST ─────────────────────────────────────────────────
describe('Case 7 – Interstate (IGST)', () => {
  it('per-item computation is identical for interstate and intrastate', () => {
    // isIntraState only affects label/split in the totals section (IGST vs CGST+SGST)
    // per-item itemTax is the same either way
    const item = { priceSnapshot: 2000, qty: 1, taxRate: 18, taxable: true, taxIncluded: false };
    const { itemTax } = computeItemGst(item);
    expect(itemTax).toBeCloseTo(360, 2);  // 2000 × 18%
  });
});

// ─── Case 8: Intrastate CGST+SGST ────────────────────────────────────────────
describe('Case 8 – Intrastate (CGST+SGST)', () => {
  it('per-item amount is total combined GST; totals section splits it', () => {
    const item = { priceSnapshot: 2000, qty: 1, taxRate: 18, taxable: true, taxIncluded: false };
    const { itemTax, perItemTaxRate } = computeItemGst(item);
    // Column header "CGST+SGST" shows combined; totals section shows CGST=180, SGST=180
    expect(itemTax).toBeCloseTo(360, 2);
    expect(perItemTaxRate).toBe(18);
    // Totals split: CGST = itemTax/2 = 180, SGST = 180
    expect(itemTax / 2).toBeCloseTo(180, 2);
  });
});

// ─── Case 9: Historical order — taxRate/taxable not persisted ─────────────────
describe('Case 9 – Historical order (taxRate not persisted)', () => {
  it('returns null perItemTaxRate and zero itemTax (do not invent a rate)', () => {
    const item = { priceSnapshot: 2700, qty: 1 };  // no taxRate/taxable/taxIncluded fields
    const { itemTax, perItemTaxRate, itemGrandTotal } = computeItemGst(item);
    expect(perItemTaxRate).toBeNull();
    expect(itemTax).toBe(0);
    expect(itemGrandTotal).toBe(2700);  // product price only — GST shown in totals section
  });

  it('explicit zero taxRate is treated as historical (rate unknown)', () => {
    const item = { priceSnapshot: 2700, qty: 1, taxRate: 0, taxable: false, taxIncluded: false };
    const { itemTax, perItemTaxRate } = computeItemGst(item);
    expect(perItemTaxRate).toBeNull();
    expect(itemTax).toBe(0);
  });

  it('taxable=true but taxRate=0 is still treated as unknown', () => {
    // Edge: taxable flag set but rate not stored (e.g. old schema default)
    const item = { priceSnapshot: 2700, qty: 1, taxRate: 0, taxable: true, taxIncluded: false };
    const { perItemTaxRate } = computeItemGst(item);
    expect(perItemTaxRate).toBeNull();
  });
});

// ─── Display totals: computeDisplayTotals ────────────────────────────────────
// Mirrors invoiceService.js totals section logic:
//   hasItemTaxData → use item.taxRate to split productGST / shippingGST
//   no taxData     → all tax attributed to displayProductTotal

function computeDisplayTotals(order, items) {
  const taxTotal  = order.totals?.tax      || 0;
  const shippingAmt = order.totals?.shipping || 0;
  const hasItemTaxData = items.some(i => (i.taxRate || 0) > 0 && i.taxable && !i.taxIncluded);
  let displayProductTotal, displayShipping;
  if (hasItemTaxData) {
    const productGST = items.reduce((sum, item) => {
      if (item.taxIncluded || !item.taxable || (item.taxRate || 0) <= 0) return sum;
      return sum + (item.priceSnapshot || 0) * (item.qty || 1) * (item.taxRate / 100);
    }, 0);
    displayProductTotal = (order.totals?.subtotal || 0) + productGST;
    displayShipping = shippingAmt + Math.max(0, taxTotal - productGST);
  } else {
    displayProductTotal = (order.totals?.subtotal || 0) + taxTotal;
    displayShipping = shippingAmt;
  }
  return { displayProductTotal, displayShipping };
}

describe('Display Totals — Test 1: ₹38,000 @ 18% + ₹2,000 shipping', () => {
  const order = { totals: { subtotal: 38000, shipping: 2000, tax: 7200, discount: 0, total: 47200 } };
  const items = [{ priceSnapshot: 38000, qty: 1, taxRate: 18, taxable: true, taxIncluded: false }];

  it('Product Total = ₹44,840', () => {
    const { displayProductTotal } = computeDisplayTotals(order, items);
    expect(displayProductTotal).toBeCloseTo(44840, 2);
  });
  it('Shipping & Delivery = ₹2,360', () => {
    const { displayShipping } = computeDisplayTotals(order, items);
    expect(displayShipping).toBeCloseTo(2360, 2);
  });
  it('Product Total + Shipping = Grand Total', () => {
    const { displayProductTotal, displayShipping } = computeDisplayTotals(order, items);
    expect(displayProductTotal + displayShipping).toBeCloseTo(order.totals.total, 2);
  });
});

describe('Display Totals — Test 2: ₹32,000 @ 5% + ₹2,000 shipping', () => {
  const order = { totals: { subtotal: 32000, shipping: 2000, tax: 1700, discount: 0, total: 35700 } };
  const items = [{ priceSnapshot: 32000, qty: 1, taxRate: 5, taxable: true, taxIncluded: false }];

  it('Product Total = ₹33,600', () => {
    const { displayProductTotal } = computeDisplayTotals(order, items);
    expect(displayProductTotal).toBeCloseTo(33600, 2);
  });
  it('Shipping & Delivery = ₹2,100', () => {
    const { displayShipping } = computeDisplayTotals(order, items);
    expect(displayShipping).toBeCloseTo(2100, 2);
  });
  it('reconciles to Grand Total ₹35,700', () => {
    const { displayProductTotal, displayShipping } = computeDisplayTotals(order, items);
    expect(displayProductTotal + displayShipping).toBeCloseTo(35700, 2);
  });
});

describe('Display Totals — Test 3: Free shipping', () => {
  const order = { totals: { subtotal: 32000, shipping: 0, tax: 5760, discount: 0, total: 37760 } };
  const items = [{ priceSnapshot: 32000, qty: 1, taxRate: 18, taxable: true, taxIncluded: false }];

  it('Product Total = ₹37,760', () => {
    const { displayProductTotal } = computeDisplayTotals(order, items);
    expect(displayProductTotal).toBeCloseTo(37760, 2);
  });
  it('displayShipping = 0 (shown as FREE)', () => {
    const { displayShipping } = computeDisplayTotals(order, items);
    expect(displayShipping).toBe(0);
  });
  it('reconciles to Grand Total ₹37,760', () => {
    const { displayProductTotal, displayShipping } = computeDisplayTotals(order, items);
    expect(displayProductTotal + displayShipping).toBeCloseTo(37760, 2);
  });
});

describe('Display Totals — Test 4: Mixed GST rates ₹20k@18% + ₹10k@12% + ₹3k shipping', () => {
  const order = { totals: { subtotal: 30000, shipping: 3000, tax: 5340, discount: 0, total: 38340 } };
  const items = [
    { priceSnapshot: 20000, qty: 1, taxRate: 18, taxable: true, taxIncluded: false },
    { priceSnapshot: 10000, qty: 1, taxRate: 12, taxable: true, taxIncluded: false },
  ];

  it('Product Total = ₹34,800 (product prices + each item own GST)', () => {
    const { displayProductTotal } = computeDisplayTotals(order, items);
    expect(displayProductTotal).toBeCloseTo(34800, 2);  // 30000 + 3600 + 1200
  });
  it('Shipping & Delivery = ₹3,540 (3000 + 540 shipping GST at principal 18%)', () => {
    const { displayShipping } = computeDisplayTotals(order, items);
    expect(displayShipping).toBeCloseTo(3540, 2);
  });
  it('no GST double-counted: Product Total + Shipping = Grand Total', () => {
    const { displayProductTotal, displayShipping } = computeDisplayTotals(order, items);
    expect(displayProductTotal + displayShipping).toBeCloseTo(38340, 2);
  });
});

describe('Display Totals — Test 5: Historical order (no item tax snapshot)', () => {
  const order = { totals: { subtotal: 2700, shipping: 400, tax: 558, discount: 0, total: 3658 } };
  const items = [{ priceSnapshot: 2700, qty: 1 }];  // no taxRate/taxable

  it('PDF does not crash; displayProductTotal = subtotal + taxTotal', () => {
    const { displayProductTotal } = computeDisplayTotals(order, items);
    expect(displayProductTotal).toBeCloseTo(2700 + 558, 2);
  });
  it('displayShipping = raw shipping (no GST split possible)', () => {
    const { displayShipping } = computeDisplayTotals(order, items);
    expect(displayShipping).toBe(400);
  });
  it('still reconciles to Grand Total', () => {
    const { displayProductTotal, displayShipping } = computeDisplayTotals(order, items);
    expect(displayProductTotal + displayShipping).toBeCloseTo(3658, 2);
  });
});

describe('Display Totals — Test 6: Discount', () => {
  const order = { totals: { subtotal: 38000, shipping: 2000, tax: 7200, discount: 500, total: 46700 } };
  const items = [{ priceSnapshot: 38000, qty: 1, taxRate: 18, taxable: true, taxIncluded: false }];

  it('Product Total and Shipping unchanged by discount', () => {
    const { displayProductTotal, displayShipping } = computeDisplayTotals(order, items);
    expect(displayProductTotal).toBeCloseTo(44840, 2);
    expect(displayShipping).toBeCloseTo(2360, 2);
  });
  it('Product Total + Shipping - Discount = Grand Total', () => {
    const { displayProductTotal, displayShipping } = computeDisplayTotals(order, items);
    const discount = order.totals.discount;
    expect(displayProductTotal + displayShipping - discount).toBeCloseTo(order.totals.total, 2);
  });
});
