// WooCommerce storefronts that transfer carts to VTech checkout (keys match the API's externalSource)
export const STOREFRONTS = {
  woo_vegetablecuttingmachine: { name: 'vegetablecuttingmachine.com', cartUrl: 'https://vegetablecuttingmachine.com/cart/' },
  woo_styleyourlyf: { name: 'styleyourlyf.com', cartUrl: 'https://styleyourlyf.com/cart/' },
};

/** Display name for an item's source; null/undefined is a native VTech item. */
export const storefrontName = (externalSource) =>
  externalSource ? STOREFRONTS[externalSource]?.name || externalSource : 'VTech Kitchen';
