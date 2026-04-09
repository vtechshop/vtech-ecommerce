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
    // Support all env var naming conventions (local: DELHIVERY_API_KEY, Render: DELHIVERY_LIVE_TOKEN)
    this.apiKey = apiKey || process.env.DELHIVERY_LIVE_TOKEN || process.env.DELHIVERY_TEST_TOKEN || process.env.DELHIVERY_API_KEY;
    this.apiUrl = apiUrl || process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api';
    this.surfaceApiUrl = process.env.DELHIVERY_SURFACE_API_URL || 'https://api.delhivery.com/v1';

    // Warehouse / pickup location — must match name registered in Delhivery dashboard
    this.pickupLocation = process.env.DELHIVERY_PICKUP_LOCATION || 'Primary';
    this.storePin      = process.env.STORE_PINCODE  || '';
    this.storeCity     = process.env.STORE_CITY     || '';
    this.storeState    = process.env.STORE_STATE    || '';
    this.storeAddress  = process.env.STORE_ADDRESS  || '';
    this.storePhone    = process.env.STORE_PHONE    || '';
    this.storeName     = process.env.STORE_NAME     || 'V-Tech';
  }

  /**
   * Create shipment/waybill
   * NOTE: This requires a Delhivery account with shipment creation permissions
   * For testing, use mock carriers in development mode
   */
  async createShipment(orderData) {
    try {
      // Pre-check: verify destination pincode is serviceable by Delhivery
      const destPin = orderData.shipTo.zipCode;
      const serviceabilityRes = await axios.get(
        `${this.apiUrl}/c/api/pin-codes/json/`,
        {
          params: { filter_codes: destPin },
          headers: { 'Authorization': `Token ${this.apiKey}` },
        }
      ).catch(() => null); // non-critical — proceed even if check fails

      if (serviceabilityRes) {
        const codes = serviceabilityRes.data?.delivery_codes || [];
        const isServiceable = codes.some(c => String(c.postal_code?.pin) === String(destPin));
        if (!isServiceable) {
          throw new Error(
            `Pincode ${destPin} is not serviceable by Delhivery. Please use Manual Entry to assign tracking.`
          );
        }
      }

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
          payment_mode: 'Prepaid',
          // Return / pickup address from store warehouse env vars
          return_pin: orderData.returnPin || this.storePin,
          return_city: orderData.returnCity || this.storeCity,
          return_phone: orderData.returnPhone || this.storePhone,
          return_add: orderData.returnAddress || this.storeAddress,
          return_state: orderData.returnState || this.storeState,
          return_country: orderData.returnCountry || 'India',
          products_desc: orderData.items.map(item => item.name).join(', '),
          hsn_code: '',
          cod_amount: 0,
          order_date: new Date().toISOString(),
          total_amount: orderData.totals.total,
          seller_add: orderData.sellerAddress || this.storeAddress,
          seller_name: orderData.sellerName || this.storeName,
          seller_inv: orderData.orderId,
          quantity: orderData.items.reduce((sum, item) => sum + item.qty, 0),
          waybill: '',
          shipment_width: orderData.dimensions?.width || 10,
          shipment_height: orderData.dimensions?.height || 10,
          weight: orderData.weight || 500,
          seller_gst_tin: orderData.gstNumber || '',
          shipping_mode: orderData.shippingMode || 'Surface',
          address_type: 'home',
          // Required: name of the pre-registered pickup location in Delhivery dashboard
          pickup_location: orderData.pickupLocation || this.pickupLocation,
        }]
      };

      const response = await axios.post(
        `${this.apiUrl}/cmu/create.json`,
        `format=json&data=${JSON.stringify(payload)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Token ${this.apiKey}`
          }
        }
      );

      const pkg = response.data.packages?.[0];
      if (response.data.success && pkg?.waybill) {
        logger.info(`Delhivery shipment created: ${pkg.waybill}`);
        return {
          success: true,
          awb: pkg.waybill,
          carrier: 'Delhivery',
          trackingUrl: `https://www.delhivery.com/track/package/${pkg.waybill}`,
          estimatedDelivery: null,
          label: pkg.label_url || null,
        };
      }

      // Surface the actual Delhivery error message (remarks field)
      const remarks = pkg?.remarks || response.data.error || 'Failed to create Delhivery shipment';
      throw new Error(remarks);
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
  async calculateRate(originPin, destinationPin, weight, paymentMode = 'Prepaid', mode = 'S') {
    try {
      const response = await axios.get(
        `${this.apiUrl}/kinko/v1/invoice/charges/.json`,
        {
          params: {
            md: mode, // S = Surface, E = Express
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
