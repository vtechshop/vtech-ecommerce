'use strict';
// GET /admin/woo-store-products: read-only list of a storefront's public products for the mapping picker.
const { getWooStoreProducts } = require('../../controllers/wooMappingController');

const res = () => {
  const r = {};
  r.status = jest.fn(() => r);
  r.json = jest.fn(() => r);
  return r;
};
const okJson = (body) => ({ ok: true, status: 200, json: async () => body });

const SIMPLE = { id: 171, name: 'best cabbage cutting machine &#8211; No1', type: 'simple', sku: 'CAB', prices: { price: '1950000', currency_minor_unit: 2 }, variations: [] };
const VARIABLE = { id: 12, name: 'Blade Set', type: 'variable', sku: '', prices: { price: '40000', currency_minor_unit: 2 },
  variations: [{ id: 13, attributes: [{ name: 'Size', value: 'Small' }] }, { id: 14, attributes: [{ name: 'Size', value: 'Large' }] }] };

describe('getWooStoreProducts', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; delete process.env.WOO_STORE_URL_STYLE; });

  it('rejects an unknown storefront without calling any store', async () => {
    global.fetch = jest.fn();
    const r = res();
    await getWooStoreProducts({ query: { externalSource: 'woo_unknown' } }, r);
    expect(r.status).toHaveBeenCalledWith(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('lists simple products and each variation, with rupee prices and decoded names', async () => {
    process.env.WOO_STORE_URL_STYLE = 'http://store.test';
    global.fetch = jest.fn().mockResolvedValueOnce(okJson([SIMPLE, VARIABLE]));
    const r = res();
    await getWooStoreProducts({ query: { externalSource: 'woo_styleyourlyf', refresh: '1' } }, r);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('http://store.test/wp-json/wc/store/v1/products?per_page=100&page=1');
    const items = r.json.mock.calls[0][0].data;
    expect(items).toEqual([
      { wooProductId: '171', wooVariantId: null, name: 'best cabbage cutting machine – No1', type: 'simple', sku: 'CAB', price: 19500 },
      { wooProductId: '12', wooVariantId: null, name: 'Blade Set', type: 'variable', sku: '', price: 400 },
      { wooProductId: '12', wooVariantId: '13', name: 'Blade Set — Small', type: 'variation', sku: '', price: null },
      { wooProductId: '12', wooVariantId: '14', name: 'Blade Set — Large', type: 'variation', sku: '', price: null },
    ]);
  });

  it('answers 502 with a friendly message when the store is down', async () => {
    process.env.WOO_STORE_URL_STYLE = 'http://store.test';
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    const r = res();
    await getWooStoreProducts({ query: { externalSource: 'woo_styleyourlyf', refresh: '1' } }, r);
    expect(r.status).toHaveBeenCalledWith(502);
    expect(r.json.mock.calls[0][0].error.code).toBe('STORE_UNREACHABLE');
  });
});
