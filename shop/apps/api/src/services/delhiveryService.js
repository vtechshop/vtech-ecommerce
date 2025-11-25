// FILE: apps/api/src/services/delhiveryService.js
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Delhivery Tracking & Shipping Service
 *
 * Features:
 * - Real-time tracking via AWB number
 * - Shipment status updates
 * - Delivery estimates
 * - Pickup scheduling
 * - Rate calculation
 *
 * API Documentation: https://docs.delhivery.com/
 */

class DelhiveryService {
  constructor() {
    this.apiKey = process.env.DELHIVERY_API_KEY;
    this.trackingApiUrl = process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api';
    this.surfaceApiUrl = process.env.DELHIVERY_SURFACE_API_URL || 'https://api.delhivery.com/v1';
    this.enabled = !!this.apiKey && this.apiKey !== 'your_delhivery_api_key_here';

    if (!this.enabled) {
      logger.warn('Delhivery service disabled - API key not configured');
    } else {
      logger.info('Delhivery tracking service initialized');
    }
  }

  /**
   * Check if Delhivery service is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Track shipment by AWB number
   * @param {string} awb - Airway bill number
   * @returns {Promise<Object>} Tracking information
   */
  async trackShipment(awb) {
    if (!this.enabled) {
      return this._getMockTrackingData(awb);
    }

    try {
      const response = await axios.get(`${this.trackingApiUrl}/v1/track/fetch/${awb}`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      const data = response.data;

      // Parse Delhivery response format
      if (data.ShipmentData && data.ShipmentData.length > 0) {
        const shipment = data.ShipmentData[0].Shipment;

        return {
          success: true,
          awb: shipment.AWB,
          status: this._mapDelhiveryStatus(shipment.Status.Status),
          statusCode: shipment.Status.StatusCode,
          statusDescription: shipment.Status.Instructions,
          scans: (shipment.Scans || []).map(scan => ({
            code: scan.ScanDetail.ScanType,
            description: scan.ScanDetail.Scan,
            location: scan.ScanDetail.ScannedLocation,
            timestamp: new Date(scan.ScanDetail.ScanDateTime),
          })),
          origin: shipment.Origin,
          destination: shipment.Destination,
          estimatedDelivery: shipment.ExpectedDeliveryDate ? new Date(shipment.ExpectedDeliveryDate) : null,
          consignee: shipment.Consignee,
          pickupDate: shipment.PickUpDate ? new Date(shipment.PickUpDate) : null,
          deliveredDate: shipment.DeliveredDate ? new Date(shipment.DeliveredDate) : null,
          weight: shipment.Extras?.weight,
        };
      }

      return {
        success: false,
        error: 'Shipment not found',
      };

    } catch (error) {
      logger.error('Delhivery tracking error:', error.message);

      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Tracking number not found',
        };
      }

      return {
        success: false,
        error: 'Unable to fetch tracking information. Please try again later.',
      };
    }
  }

  /**
   * Track multiple shipments at once
   * @param {string[]} awbs - Array of AWB numbers
   * @returns {Promise<Object[]>} Array of tracking information
   */
  async trackMultipleShipments(awbs) {
    if (!this.enabled) {
      return awbs.map(awb => this._getMockTrackingData(awb));
    }

    try {
      const awbString = awbs.join(',');
      const response = await axios.get(`${this.trackingApiUrl}/v1/track/fetch/${awbString}`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 second timeout for bulk
      });

      const data = response.data;
      const results = [];

      if (data.ShipmentData) {
        for (const shipmentData of data.ShipmentData) {
          const shipment = shipmentData.Shipment;
          results.push({
            success: true,
            awb: shipment.AWB,
            status: this._mapDelhiveryStatus(shipment.Status.Status),
            statusCode: shipment.Status.StatusCode,
            statusDescription: shipment.Status.Instructions,
            lastScan: shipment.Scans?.[0] ? {
              description: shipment.Scans[0].ScanDetail.Scan,
              location: shipment.Scans[0].ScanDetail.ScannedLocation,
              timestamp: new Date(shipment.Scans[0].ScanDetail.ScanDateTime),
            } : null,
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Delhivery bulk tracking error:', error.message);
      return awbs.map(awb => ({
        success: false,
        awb,
        error: 'Unable to fetch tracking information',
      }));
    }
  }

  /**
   * Schedule pickup for shipment
   * @param {Object} pickupData - Pickup details
   * @returns {Promise<Object>} Pickup confirmation
   */
  async schedulePickup(pickupData) {
    if (!this.enabled) {
      return {
        success: true,
        pickupId: `PU${Date.now()}`,
        scheduledDate: pickupData.pickupDate,
        message: 'Mock pickup scheduled (Delhivery disabled)',
      };
    }

    try {
      const response = await axios.post(
        `${this.surfaceApiUrl}/pickup/schedule`,
        pickupData,
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        pickupId: response.data.pickup_id,
        scheduledDate: response.data.scheduled_date,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Delhivery pickup scheduling error:', error.message);
      return {
        success: false,
        error: 'Unable to schedule pickup. Please contact support.',
      };
    }
  }

  /**
   * Calculate shipping rate
   * @param {Object} rateData - Rate calculation parameters
   * @returns {Promise<Object>} Rate information
   */
  async calculateRate(rateData) {
    if (!this.enabled) {
      // Return mock rates
      return {
        success: true,
        rates: [
          { service: 'Surface', amount: 50, deliveryDays: 5 },
          { service: 'Express', amount: 100, deliveryDays: 2 },
        ],
      };
    }

    try {
      const response = await axios.get(`${this.surfaceApiUrl}/rate/calculate`, {
        params: {
          origin_pin: rateData.originPin,
          destination_pin: rateData.destinationPin,
          weight: rateData.weight,
          cod: rateData.cod ? 1 : 0,
        },
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return {
        success: true,
        rates: response.data.rates,
      };
    } catch (error) {
      logger.error('Delhivery rate calculation error:', error.message);
      return {
        success: false,
        error: 'Unable to calculate shipping rate',
      };
    }
  }

  /**
   * Create shipment/waybill
   * @param {Object} shipmentData - Shipment details
   * @returns {Promise<Object>} AWB and shipment details
   */
  async createShipment(shipmentData) {
    if (!this.enabled) {
      return {
        success: true,
        awb: `DL${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        label_url: 'https://example.com/mock-label.pdf',
        message: 'Mock shipment created (Delhivery disabled)',
      };
    }

    try {
      const response = await axios.post(
        `${this.surfaceApiUrl}/shipment/create`,
        shipmentData,
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      return {
        success: true,
        awb: response.data.waybill,
        label_url: response.data.label_url,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Delhivery shipment creation error:', error.message);
      return {
        success: false,
        error: 'Unable to create shipment. Please try again.',
      };
    }
  }

  /**
   * Map Delhivery status to our standard status
   * @private
   */
  _mapDelhiveryStatus(delhiveryStatus) {
    const statusMap = {
      'Pending': 'pending',
      'Pickup Scheduled': 'placed',
      'Picked Up': 'packed',
      'In Transit': 'shipped',
      'Out for Delivery': 'out_for_delivery',
      'Delivered': 'delivered',
      'RTO': 'returned',
      'Cancelled': 'cancelled',
    };

    return statusMap[delhiveryStatus] || 'shipped';
  }

  /**
   * Get mock tracking data for development
   * @private
   */
  _getMockTrackingData(awb) {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    return {
      success: true,
      awb,
      status: 'shipped',
      statusCode: 'IT',
      statusDescription: 'Shipment is in transit',
      scans: [
        {
          code: 'UD',
          description: 'Shipment picked up',
          location: 'Mumbai Hub',
          timestamp: twoDaysAgo,
        },
        {
          code: 'IT',
          description: 'In transit to destination city',
          location: 'Delhi Hub',
          timestamp: yesterday,
        },
        {
          code: 'IT',
          description: 'Arrived at destination facility',
          location: 'Bangalore Hub',
          timestamp: now,
        },
      ],
      origin: 'Mumbai',
      destination: 'Bangalore',
      estimatedDelivery: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      consignee: {
        name: 'Customer Name',
        phone: '9876543210',
      },
      pickupDate: twoDaysAgo,
      deliveredDate: null,
      weight: 1.5,
    };
  }
}

// Singleton instance
const delhiveryService = new DelhiveryService();

module.exports = delhiveryService;
