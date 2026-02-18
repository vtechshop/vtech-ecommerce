const ShippingAdapter = require('../../adapters/shipping/ShippingAdapter');

describe('ShippingAdapter (Base)', () => {
  let adapter;

  beforeEach(() => {
    adapter = new ShippingAdapter();
  });

  it('should throw error for unimplemented createShipment', async () => {
    await expect(adapter.createShipment({})).rejects.toThrow(
      'createShipment must be implemented'
    );
  });

  it('should throw error for unimplemented trackShipment', async () => {
    await expect(adapter.trackShipment('TRACK123')).rejects.toThrow(
      'trackShipment must be implemented'
    );
  });

  it('should throw error for unimplemented cancelShipment', async () => {
    await expect(adapter.cancelShipment('SHIP123')).rejects.toThrow(
      'cancelShipment must be implemented'
    );
  });

  it('should throw error for unimplemented getLabel', async () => {
    await expect(adapter.getLabel('SHIP123')).rejects.toThrow(
      'getLabel must be implemented'
    );
  });
});
