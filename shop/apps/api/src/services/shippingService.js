// FILE: apps/api/src/services/shippingService.js
const MockCarrierAdapter = require('../adapters/shipping/MockCarrierAdapter');
const logger = require('../config/logger');

class ShippingService {
  constructor() {
    this.carriers = {
      dhl: new MockCarrierAdapter('DHL'),
      fedex: new MockCarrierAdapter('FedEx'),
      usps: new MockCarrierAdapter('USPS'),
    };
  }

  async createShipment(orderData, carrier = 'dhl') {
    const adapter = this.carriers[carrier.toLowerCase()];

    if (!adapter) {
      throw new Error(`Carrier ${carrier} not supported`);
    }

    const shipment = await adapter.createShipment(orderData);

    logger.info(`Shipment created: ${shipment.awb} via ${carrier}`);

    return shipment;
  }

  async trackShipment(trackingNumber) {
    // Try to find which carrier has this tracking number
    // In production, you'd identify the carrier from the tracking number format
    for (const [name, adapter] of Object.entries(this.carriers)) {
      try {
        const tracking = await adapter.trackShipment(trackingNumber);
        return { carrier: name, ...tracking };
      } catch (error) {
        continue;
      }
    }

    throw new Error('Tracking number not found');
  }

  async cancelShipment(shipmentId, carrier) {
    const adapter = this.carriers[carrier.toLowerCase()];

    if (!adapter) {
      throw new Error(`Carrier ${carrier} not supported`);
    }

    const result = await adapter.cancelShipment(shipmentId);

    logger.info(`Shipment cancelled: ${shipmentId}`);

    return result;
  }

  async getLabel(shipmentId, carrier) {
    const adapter = this.carriers[carrier.toLowerCase()];

    if (!adapter) {
      throw new Error(`Carrier ${carrier} not supported`);
    }

    const label = await adapter.getLabel(shipmentId);

    return label;
  }

  async calculateShippingRates(origin, destination, packages) {
    // In production, call multiple carriers' APIs to get real rates
    const rates = [
      {
        carrier: 'DHL',
        service: 'Standard',
        price: 5.99,
        estimatedDays: '5-7',
      },
      {
        carrier: 'FedEx',
        service: 'Express',
        price: 12.99,
        estimatedDays: '2-3',
      },
      {
        carrier: 'USPS',
        service: 'Priority',
        price: 8.99,
        estimatedDays: '3-5',
      },
    ];

    return rates;
  }

  async updateTrackingWebhook(trackingNumber, eventData) {
    const Order = require('../models/Order');

    // Find order by tracking number
    const order = await Order.findOne({ 'shipment.awb': trackingNumber });

    if (!order) {
      logger.warn(`Order not found for tracking: ${trackingNumber}`);
      return;
    }

    // Add tracking event
    order.shipment.events.push({
      code: eventData.code,
      description: eventData.description,
      location: eventData.location,
      timestamp: eventData.timestamp || new Date(),
    });

    // Update order status based on event
    if (eventData.code === 'DELIVERED') {
      order.status = 'delivered';
      order.events.push({
        status: 'delivered',
        description: 'Order delivered successfully',
        timestamp: new Date(),
      });
    } else if (eventData.code === 'OUT_FOR_DELIVERY') {
      order.status = 'out_for_delivery';
    }

    await order.save();

    logger.info(`Tracking updated: ${trackingNumber} - ${eventData.code}`);

    // TODO: Send notification to customer
  }
}

module.exports = new ShippingService();