// FILE: apps/api/src/adapters/shipping/MockCarrierAdapter.js
const ShippingAdapter = require('./ShippingAdapter');

class MockCarrierAdapter extends ShippingAdapter {
  constructor(carrierName) {
    super();
    this.carrierName = carrierName;
  }

  async createShipment(orderData) {
    // Mock shipment creation
    const awb = `${this.carrierName.toUpperCase()}-${Date.now()}`;
    
    return {
      shipmentId: awb,
      awb,
      carrier: this.carrierName,
      status: 'created',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  async trackShipment(trackingNumber) {
    // Mock tracking data
    return {
      awb: trackingNumber,
      status: 'in_transit',
      events: [
        {
          code: 'CREATED',
          description: 'Shipment created',
          location: 'Origin Hub',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          code: 'PICKED_UP',
          description: 'Package picked up',
          location: 'Origin Hub',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          code: 'IN_TRANSIT',
          description: 'Package in transit',
          location: 'Transit Hub',
          timestamp: new Date(),
        },
      ],
    };
  }

  async cancelShipment(shipmentId) {
    return {
      shipmentId,
      status: 'cancelled',
    };
  }

  async getLabel(shipmentId) {
    return {
      shipmentId,
      labelUrl: `https://example.com/labels/${shipmentId}.pdf`,
      format: 'pdf',
    };
  }
}

module.exports = MockCarrierAdapter;