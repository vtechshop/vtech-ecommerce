'use strict';

/**
 * Works out, for each requested order item, which storefront it came from — using only the
 * server-side cart. The request may name a cartItemId, but a source is accepted only when that
 * cart line exists and has the same product and variant; anything else counts as native VTech.
 *
 * When the cart holds any WooCommerce line, the request must be exactly the whole cart (every
 * line once, same product, variant and quantity). That stops a transferred cart being split,
 * and stops attribution being dropped by omitting cartItemIds.
 *
 * @returns {{ sources: Array<string|null>, hasExternal: boolean, wholeCart: boolean }}
 */
function attributeOrderItems(requestItems, cartLines = []) {
  const lineById = new Map(cartLines.map(line => [String(line._id), line]));
  const sameLine = (item, line) =>
    String(line.productId) === String(item.productId) &&
    (line.variantId ?? null) === (item.variantId ?? null);

  const usedLineIds = new Set();
  let everyItemMatchesALine = true;

  const sources = requestItems.map(item => {
    const line = item.cartItemId != null ? lineById.get(String(item.cartItemId)) : undefined;
    if (!line || !sameLine(item, line) || usedLineIds.has(String(line._id)) || line.qty !== item.qty) {
      everyItemMatchesALine = false;
      return line && sameLine(item, line) ? (line.externalSource || null) : null;
    }
    usedLineIds.add(String(line._id));
    return line.externalSource || null;
  });

  return {
    sources,
    hasExternal: cartLines.some(line => line.externalSource),
    wholeCart: everyItemMatchesALine && usedLineIds.size === cartLines.length,
  };
}

module.exports = { attributeOrderItems };
