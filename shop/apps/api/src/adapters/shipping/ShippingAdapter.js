// FILE: apps/api/src/adapters/shipping/ShippingAdapter.js
// Base shipping adapter interface
class ShippingAdapter {
  async createShipment(orderData) {
    throw new Error('createShipment must be implemented');
  }

  async trackShipment(trackingNumber) {
    throw new Error('trackShipment must be implemented');
  }

  async cancelShipment(shipmentId) {
    throw new Error('cancelShipment must be implemented');
  }

  async getLabel(shipmentId) {
    throw new Error('getLabel must be implemented');
  }
}

module.exports = ShippingAdapter;