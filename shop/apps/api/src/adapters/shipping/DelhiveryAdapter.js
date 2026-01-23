// FILE: apps/api/src/adapters/shipping/DelhiveryAdapter.js
const ShippingAdapter = require('./ShippingAdapter');
const axios = require('axios');
const logger = require('../../config/logger');

/**
 * Delhivery Shipping Adapter
 * Docs: https://www.delhivery.com/app/settings/api
 */
class DelhiveryAdapter extends ShippingAdapter {
  constructor(apiKey, apiUrl) {
    super();
    this.apiKey = apiKey || process.env.DELHIVERY_API_KEY;
    this.apiUrl = apiUrl || process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api';
    this.surfaceApiUrl = process.env.DELHIVERY_SURFACE_API_URL || 'https://api.delhivery.com/v1';
  }

  /**
   * Create shipment/waybill
   * NOTE: This requires a Delhivery account with shipment creation permissions
   * For testing, use mock carriers in development mode
   */
  async createShipment(orderData) {
    try {
      // Try to create real shipment with new Delhivery API
      const payload = {
        shipments: [{
          name: orderData.shipTo.fullName,
          add: orderData.shipTo.addressLine1,
          add_2: orderData.shipTo.addressLine2 || '',
          city: orderData.shipTo.city,
          state: orderData.shipTo.state,
          country: orderData.shipTo.country || 'India',
          pin: orderData.shipTo.zipCode,
          phone: orderData.shipTo.phone,
          order: orderData.orderId,
          payment_mode: 'Prepaid', // All orders are prepaid (COD removed)
          return_pin: orderData.returnPin || '',
          return_city: orderData.returnCity || '',
          return_phone: orderData.returnPhone || '',
          return_add: orderData.returnAddress || '',
          return_state: orderData.returnState || '',
          return_country: orderData.returnCountry || 'India',
          products_desc: orderData.items.map(item => item.name).join(', '),
          hsn_code: '',
          cod_amount: 0, // No COD - all orders prepaid
          order_date: new Date().toISOString(),
          total_amount: orderData.totals.total,
          seller_add: orderData.sellerAddress || '',
          seller_name: orderData.sellerName || 'V-Tech',
          seller_inv: orderData.orderId,
          quantity: orderData.items.reduce((sum, item) => sum + item.qty, 0),
          waybill: '', // Delhivery auto-generates if empty
          shipment_width: orderData.dimensions?.width || 10,
          shipment_height: orderData.dimensions?.height || 10,
          weight: orderData.weight || 500, // in grams
          seller_gst_tin: orderData.gstNumber || '',
          shipping_mode: orderData.shippingMode || 'Surface',
          address_type: 'home'
        }]
      };

      const response = await axios.post(
        `${this.surfaceApiUrl}/cmu/create.json`,
        `format=json&data=${JSON.stringify(payload)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${this.apiKey}`
          }
        }
      );

      if (response.data.success) {
        const waybill = response.data.packages[0].waybill;

        logger.info(`Delhivery shipment created: ${waybill}`);

        return {
          success: true,
          awb: waybill,
          carrier: 'Delhivery',
          trackingUrl: `https://www.delhivery.com/track/package/${waybill}`,
          estimatedDelivery: null, // Delhivery provides this after pickup
          label: response.data.packages[0].label_url || null
        };
      }

      throw new Error(response.data.error || 'Failed to create Delhivery shipment');
    } catch (error) {
      logger.error('Delhivery createShipment error:', error.response?.data || error.message);
      throw new Error(`Delhivery API Error: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Track shipment
   */
  async trackShipment(trackingNumber) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/packages/json/?waybill=${trackingNumber}`,
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`
          }
        }
      );

      const shipment = response.data.ShipmentData[0]?.Shipment;

      if (!shipment) {
        throw new Error('Tracking number not found');
      }

      return {
        success: true,
        trackingNumber: trackingNumber,
        status: shipment.Status.Status,
        currentLocation: shipment.Status.StatusLocation,
        estimatedDelivery: shipment.PromisedDeliveryDate,
        events: shipment.Scans.map(scan => ({
          code: scan.ScanDetail.ScanType,
          description: scan.ScanDetail.Instructions,
          location: scan.ScanDetail.ScannedLocation,
          timestamp: new Date(scan.ScanDetail.ScanDateTime)
        }))
      };
    } catch (error) {
      logger.error('Delhivery trackShipment error:', error.response?.data || error.message);
      throw new Error(`Delhivery Tracking Error: ${error.message}`);
    }
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(waybill) {
    try {
      const response = await axios.post(
        `${this.surfaceApiUrl}/cancel/shipment.json`,
        { waybill: waybill },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${this.apiKey}`
          }
        }
      );

      if (response.data.success) {
        logger.info(`Delhivery shipment cancelled: ${waybill}`);
        return { success: true, message: 'Shipment cancelled successfully' };
      }

      throw new Error(response.data.error || 'Failed to cancel shipment');
    } catch (error) {
      logger.error('Delhivery cancelShipment error:', error.response?.data || error.message);
      throw new Error(`Delhivery Cancel Error: ${error.message}`);
    }
  }

  /**
   * Get shipping label
   */
  async getLabel(waybill) {
    try {
      const response = await axios.get(
        `${this.surfaceApiUrl}/label/pdf/?wbn=${waybill}`,
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`
          },
          responseType: 'arraybuffer'
        }
      );

      return {
        success: true,
        format: 'pdf',
        data: Buffer.from(response.data).toString('base64'),
        url: `${this.surfaceApiUrl}/label/pdf/?wbn=${waybill}`
      };
    } catch (error) {
      logger.error('Delhivery getLabel error:', error.message);
      throw new Error(`Delhivery Label Error: ${error.message}`);
    }
  }

  /**
   * Calculate shipping rate
   */
  async calculateRate(originPin, destinationPin, weight, paymentMode = 'Prepaid') {
    try {
      const response = await axios.get(
        `${this.apiUrl}/kinko/v1/invoice/charges/.json`,
        {
          params: {
            md: 'S', // S = Surface, E = Express
            ss: 'Delivered',
            d_pin: destinationPin,
            o_pin: originPin,
            cgm: weight, // in grams
            pt: paymentMode === 'COD' ? 'COD' : 'Pre-paid'
          },
          headers: {
            'Authorization': `Token ${this.apiKey}`
          }
        }
      );

      return {
        success: true,
        rate: response.data[0]?.total_amount || 0,
        currency: 'INR',
        estimatedDays: '3-5'
      };
    } catch (error) {
      logger.error('Delhivery calculateRate error:', error.message);
      throw new Error(`Delhivery Rate Error: ${error.message}`);
    }
  }

  /**
   * Schedule pickup
   */
  async schedulePickup(pickupDetails) {
    try {
      const response = await axios.post(
        `${this.surfaceApiUrl}/fm/request/new/`,
        {
          pickup_location: pickupDetails.location,
          pickup_time: pickupDetails.time || '10:00',
          pickup_date: pickupDetails.date || new Date().toISOString().split('T')[0],
          expected_package_count: pickupDetails.packageCount || 1
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${this.apiKey}`
          }
        }
      );

      logger.info('Delhivery pickup scheduled successfully');

      return {
        success: true,
        pickupId: response.data.pickup_id,
        message: 'Pickup scheduled successfully'
      };
    } catch (error) {
      logger.error('Delhivery schedulePickup error:', error.message);
      throw new Error(`Delhivery Pickup Error: ${error.message}`);
    }
  }
}

module.exports = DelhiveryAdapter;
