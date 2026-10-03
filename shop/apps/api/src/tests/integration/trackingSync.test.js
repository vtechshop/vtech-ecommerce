// Courier tracking sync against the real Order schema (AWB and carrier live under order.shipment,
// statuses are lower case). The carrier is mocked: no courier API is called.
const Order = require('../../models/Order');

jest.mock('../../services/shippingService', () => ({
  trackShipment: jest.fn(),
}));

const shippingService = require('../../services/shippingService');
const trackingSyncService = require('../../services/trackingSyncService');
const trackingSyncJob = require('../../jobs/trackingSyncJob');

let seq = 0;
function makeOrder(overrides = {}) {
  seq += 1;
  return Order.create({
    orderId: `VT-TRK-${Date.now()}-${seq}`,
    userId: '507f1f77bcf86cd799439011',
    status: 'shipped',
    items: [{ productId: '507f1f77bcf86cd799439022', qty: 1, priceSnapshot: 500, name: 'Mixer' }],
    totals: { subtotal: 500, tax: 0, shipping: 0, total: 500 },
    payment: { status: 'paid' },
    shipment: { carrier: 'delhivery', awb: 'AWB1234567', shippedAt: new Date() },
    ...overrides,
  });
}

const carrierSays = (status) =>
  shippingService.trackShipment.mockResolvedValue({ status, currentLocation: 'Coimbatore Hub', events: [] });

describe('Tracking sync', () => {
  afterEach(() => jest.clearAllMocks());

  describe('status mapping', () => {
    test('maps only to statuses the Order schema allows', () => {
      const allowed = Order.schema.path('status').enumValues;
      for (const status of ['Delivered', 'DELIVERED', 'delivered', 'In Transit', 'INTRANSIT', 'in_transit', 'SHIPPED', 'Dispatched', 'Out For Delivery']) {
        expect(allowed).toContain(trackingSyncService.mapCarrierStatusToOrderStatus(status));
      }
      expect(trackingSyncService.mapCarrierStatusToOrderStatus('Delivered')).toBe('delivered');
      expect(trackingSyncService.mapCarrierStatusToOrderStatus('Out For Delivery')).toBe('out_for_delivery');
      expect(trackingSyncService.mapCarrierStatusToOrderStatus('In Transit')).toBe('shipped');
    });

    test('returns, failed deliveries, cancellations and unknown statuses change nothing', () => {
      for (const status of ['RTO', 'RTO-Delivered', 'RTO_DELIVERED', 'UNDELIVERED', 'Not Delivered', 'Cancelled', 'CANCELED', 'Pending', 'BOOKED', 'Shipment Created', 'something new', '', null, undefined, 7]) {
        expect(trackingSyncService.mapCarrierStatusToOrderStatus(status)).toBeNull();
      }
    });
  });

  describe('syncOrderTracking', () => {
    test('reads the AWB and carrier from order.shipment', async () => {
      carrierSays('In Transit');
      const order = await makeOrder();
      const result = await trackingSyncService.syncOrderTracking(order);
      expect(result.success).toBe(true);
      expect(shippingService.trackShipment).toHaveBeenCalledWith('AWB1234567', 'delhivery');
      expect(result.statusChanged).toBe(false);
      expect(result.tracking.status).toBe('In Transit');
    });

    test('an order without a shipment is not sent to the carrier', async () => {
      const order = await makeOrder({ shipment: undefined, status: 'packed' });
      const result = await trackingSyncService.syncOrderTracking(order);
      expect(result.success).toBe(false);
      expect(shippingService.trackShipment).not.toHaveBeenCalled();
    });

    test('a delivered order is not sent to the carrier again', async () => {
      const order = await makeOrder({ status: 'delivered' });
      expect((await trackingSyncService.syncOrderTracking(order)).success).toBe(false);
      expect(shippingService.trackShipment).not.toHaveBeenCalled();
    });

    test('the order only moves forward', async () => {
      carrierSays('In Transit');
      const order = await makeOrder({ status: 'out_for_delivery' });
      const result = await trackingSyncService.syncOrderTracking(order);
      expect(result.statusChanged).toBe(false);
      expect(result.newStatus).toBe('out_for_delivery');
    });

    test('a carrier failure is reported, not thrown', async () => {
      shippingService.trackShipment.mockRejectedValue(new Error('Delhivery Tracking Error: timeout'));
      const result = await trackingSyncService.syncOrderTracking(await makeOrder());
      expect(result).toMatchObject({ success: false, message: expect.stringMatching(/timeout/) });
    });
  });

  describe('background job', () => {
    test('a shipped order becomes delivered and the change is saved', async () => {
      carrierSays('Delivered');
      const order = await makeOrder();
      await trackingSyncJob.run();

      const saved = await Order.findById(order._id);
      expect(saved.status).toBe('delivered');
      expect(saved.shipment.carrierStatus).toBe('Delivered');
      expect(saved.shipment.currentLocation).toBe('Coimbatore Hub');
      expect(saved.shipment.deliveredAt).toBeInstanceOf(Date);
      expect(saved.shipment.trackingLastSynced).toBeInstanceOf(Date);
      expect(saved.events.at(-1).status).toBe('delivered');
    });

    test('"out for delivery" is saved as its own status', async () => {
      carrierSays('Out For Delivery');
      const order = await makeOrder();
      await trackingSyncJob.run();
      expect((await Order.findById(order._id)).status).toBe('out_for_delivery');
    });

    test('an RTO keeps the order status and still records what the carrier said', async () => {
      carrierSays('RTO');
      const order = await makeOrder();
      await trackingSyncJob.run();
      const saved = await Order.findById(order._id);
      expect(saved.status).toBe('shipped');
      expect(saved.shipment.carrierStatus).toBe('RTO');
    });

    test('an order synced a minute ago is left alone', async () => {
      carrierSays('Delivered');
      const order = await makeOrder({ shipment: { carrier: 'delhivery', awb: 'AWB7', trackingLastSynced: new Date(Date.now() - 60_000) } });
      await trackingSyncJob.run();
      expect(shippingService.trackShipment).not.toHaveBeenCalled();
      expect((await Order.findById(order._id)).status).toBe('shipped');
    });
  });
});
