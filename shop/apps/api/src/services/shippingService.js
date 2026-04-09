// FILE: apps/api/src/services/shippingService.js
const DelhiveryAdapter = require('../adapters/shipping/DelhiveryAdapter');
const ShiprocketAdapter = require('../adapters/shipping/ShiprocketAdapter');
const BlueDartAdapter = require('../adapters/shipping/BlueDartAdapter');
const MockCarrierAdapter = require('../adapters/shipping/MockCarrierAdapter');
const logger = require('../config/logger');

/**
 * Unified Shipping Service
 * Supports multiple carriers through adapter pattern
 */
class ShippingService {
  constructor() {
    this.carriers = {};

    // Initialize carriers based on environment configuration
    this.initializeCarriers();
  }

  /**
   * Initialize available carriers based on .env configuration
   */
  initializeCarriers() {
    // Delhivery
    if (process.env.DELHIVERY_LIVE_TOKEN || process.env.DELHIVERY_TEST_TOKEN || process.env.DELHIVERY_API_KEY) {
      this.carriers.delhivery = new DelhiveryAdapter();
      logger.info('✅ Delhivery adapter initialized');
    }

    // Shiprocket
    if (process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD) {
      this.carriers.shiprocket = new ShiprocketAdapter();
      logger.info('✅ Shiprocket adapter initialized');
    }

    // BlueDart
    if (process.env.BLUEDART_LICENSE_KEY) {
      this.carriers.bluedart = new BlueDartAdapter();
      logger.info('✅ BlueDart adapter initialized');
    }

    // Demo mode - show carrier names with mock rates for testing
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      // Only add mock carriers if real ones aren't configured
      if (!this.carriers.shiprocket) {
        this.carriers.shiprocket = new MockCarrierAdapter('shiprocket');
        logger.info('✅ Shiprocket mock adapter initialized for demo');
      }
      if (!this.carriers.bluedart) {
        this.carriers.bluedart = new MockCarrierAdapter('bluedart');
        logger.info('✅ BlueDart mock adapter initialized for demo');
      }
    }

    // If no carriers configured, use mock as fallback
    if (Object.keys(this.carriers).length === 0) {
      this.carriers.mock = new MockCarrierAdapter('Mock Carrier');
      logger.warn('⚠️  No shipping carriers configured - using mock adapter');
    }
  }

  /**
   * Get list of available carriers
   */
  getAvailableCarriers() {
    return Object.keys(this.carriers).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      enabled: true
    }));
  }

  /**
   * Get carrier adapter by name
   */
  getCarrier(carrierName) {
    const carrier = this.carriers[carrierName.toLowerCase()];

    if (!carrier) {
      const available = Object.keys(this.carriers).join(', ');
      throw new Error(`Carrier "${carrierName}" not supported. Available: ${available}`);
    }

    return carrier;
  }

  /**
   * Create shipment with specified carrier
   */
  async createShipment(orderData, carrierName) {
    try {
      const carrier = this.getCarrier(carrierName);
      const shipment = await carrier.createShipment(orderData);

      logger.info(`✅ Shipment created: ${shipment.awb} via ${carrierName}`);

      return {
        ...shipment,
        carrier: carrierName
      };
    } catch (error) {
      logger.error(`❌ Failed to create shipment via ${carrierName}:`, error.message);
      throw error;
    }
  }

  /**
   * Track shipment
   * Tries to auto-detect carrier if not specified
   */
  async trackShipment(trackingNumber, carrierName = null) {
    try {
      // If carrier specified, use it directly
      if (carrierName) {
        const carrier = this.getCarrier(carrierName);
        const tracking = await carrier.trackShipment(trackingNumber);
        return { carrier: carrierName, ...tracking };
      }

      // Otherwise, try all carriers to find the tracking number
      for (const [name, adapter] of Object.entries(this.carriers)) {
        try {
          const tracking = await adapter.trackShipment(trackingNumber);
          logger.info(`✅ Tracking found via ${name}`);
          return { carrier: name, ...tracking };
        } catch (error) {
          // Continue trying other carriers
          continue;
        }
      }

      throw new Error('Tracking number not found in any carrier');
    } catch (error) {
      logger.error('❌ Tracking failed:', error.message);
      throw error;
    }
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(shipmentId, carrierName) {
    try {
      const carrier = this.getCarrier(carrierName);
      const result = await carrier.cancelShipment(shipmentId);

      logger.info(`✅ Shipment cancelled: ${shipmentId} via ${carrierName}`);

      return result;
    } catch (error) {
      logger.error(`❌ Failed to cancel shipment via ${carrierName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get shipping label
   */
  async getLabel(shipmentId, carrierName) {
    try {
      const carrier = this.getCarrier(carrierName);
      const label = await carrier.getLabel(shipmentId);

      logger.info(`✅ Label generated for ${shipmentId} via ${carrierName}`);

      return label;
    } catch (error) {
      logger.error(`❌ Failed to get label via ${carrierName}:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate shipping rates from all available carriers
   * Returns array of rates sorted by price
   */
  async calculateShippingRates(origin, destination, packages, orderValue = 0) {
    const rates = [];

    for (const [name, adapter] of Object.entries(this.carriers)) {
      try {
        // Skip mock carriers in production
        if (process.env.NODE_ENV === 'production' && name.includes('mock')) {
          continue;
        }

        // Different carriers need different parameters
        let rate;
        if (adapter.calculateRate) {
          rate = await adapter.calculateRate(
            origin.zipCode || origin,
            destination.zipCode || destination,
            packages.weight || 500,
            orderValue // For COD calculations
          );

          rates.push({
            carrier: name,
            carrierName: name.charAt(0).toUpperCase() + name.slice(1),
            ...rate
          });
        }
      } catch (error) {
        logger.warn(`Failed to get rate from ${name}:`, error.message);
        // Continue with other carriers
        continue;
      }
    }

    // If no rates found in production, throw error
    if (rates.length === 0 && process.env.NODE_ENV === 'production') {
      throw new Error('No shipping carriers configured. Please configure Delhivery, Shiprocket, or BlueDart in your .env file.');
    }

    // In development, if still no rates, return empty array (will be caught by controller)
    if (rates.length === 0) {
      logger.warn('No shipping rates available from any carrier');
    }

    // Sort by price (cheapest first)
    return rates.sort((a, b) => (a.rate || 0) - (b.rate || 0));
  }

  /**
   * Schedule pickup
   */
  async schedulePickup(pickupDetails, carrierName) {
    try {
      const carrier = this.getCarrier(carrierName);

      if (!carrier.schedulePickup) {
        throw new Error(`${carrierName} does not support pickup scheduling`);
      }

      const result = await carrier.schedulePickup(pickupDetails);

      logger.info(`✅ Pickup scheduled via ${carrierName}`);

      return result;
    } catch (error) {
      logger.error(`❌ Failed to schedule pickup via ${carrierName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get recommended carrier based on:
   * - Delivery location
   * - Package weight
   * - Delivery speed required
   * - Cost
   */
  async getRecommendedCarrier(origin, destination, packages, priority = 'cost') {
    try {
      const rates = await this.calculateShippingRates(origin, destination, packages);

      if (rates.length === 0) {
        throw new Error('No carriers available');
      }

      // Sort based on priority
      if (priority === 'cost') {
        // Already sorted by cost
        return rates[0];
      } else if (priority === 'speed') {
        // Sort by estimated delivery days
        rates.sort((a, b) => {
          const daysA = parseInt(a.estimatedDays) || 999;
          const daysB = parseInt(b.estimatedDays) || 999;
          return daysA - daysB;
        });
        return rates[0];
      }

      return rates[0]; // Default to cheapest
    } catch (error) {
      logger.error('Failed to get recommended carrier:', error.message);
      throw error;
    }
  }

  /**
   * Bulk shipment creation (for multiple orders)
   */
  async createBulkShipments(orders, carrierName) {
    const results = {
      success: [],
      failed: []
    };

    for (const order of orders) {
      try {
        const shipment = await this.createShipment(order, carrierName);
        results.success.push({ orderId: order.orderId, shipment });
      } catch (error) {
        results.failed.push({
          orderId: order.orderId,
          error: error.message
        });
      }
    }

    logger.info(`Bulk shipment: ${results.success.length} success, ${results.failed.length} failed`);

    return results;
  }

  /**
   * Validate carrier configuration
   */
  isCarrierConfigured(carrierName) {
    return !!this.carriers[carrierName.toLowerCase()];
  }

  /**
   * Get carrier service status
   */
  async getCarrierStatus(carrierName) {
    try {
      const carrier = this.getCarrier(carrierName);

      // Try a simple operation to check if carrier is reachable
      if (carrier.calculateRate) {
        await carrier.calculateRate('110001', '110002', 500);
      }

      return {
        carrier: carrierName,
        status: 'operational',
        message: 'Carrier is responding normally'
      };
    } catch (error) {
      return {
        carrier: carrierName,
        status: 'error',
        message: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new ShippingService();
