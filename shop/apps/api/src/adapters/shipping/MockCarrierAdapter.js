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
      success: true,
      shipmentId: awb,
      awb,
      carrier: this.carrierName,
      status: 'created',
      trackingUrl: `https://example.com/track/${awb}`,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      label: null
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

  async calculateRate(originPin, destinationPin, weight, paymentMode = 'Prepaid') {
    // Mock rates based on carrier name with realistic pricing
    const baseRates = {
      'DHL': 80,
      'FedEx': 75,
      'USPS': 55,
      'delhivery': 45,
      'shiprocket': 50,
      'bluedart': 60,
    };

    const deliveryDays = {
      'DHL': '2-3',
      'FedEx': '2-4',
      'USPS': '5-7',
      'delhivery': '3-5',
      'shiprocket': '4-6',
      'bluedart': '2-3',
    };

    const baseRate = baseRates[this.carrierName] || 50;

    // Add weight-based pricing (₹10 per 500g)
    const weightCharge = Math.ceil(weight / 500) * 10;

    // Add COD charges if applicable
    const codCharge = paymentMode === 'COD' ? 30 : 0;

    const totalRate = baseRate + weightCharge + codCharge;

    return {
      success: true,
      rate: totalRate,
      currency: 'INR',
      estimatedDays: deliveryDays[this.carrierName] || '5-7',
      serviceName: `${this.carrierName} Express`,
    };
  }
}

module.exports = MockCarrierAdapter;