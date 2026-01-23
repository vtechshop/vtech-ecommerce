// FILE: apps/api/src/adapters/shipping/ShiprocketAdapter.js
const ShippingAdapter = require('./ShippingAdapter');
const axios = require('axios');
const logger = require('../../config/logger');

/**
 * Shiprocket Shipping Adapter
 * Docs: https://apidocs.shiprocket.in/
 */
class ShiprocketAdapter extends ShippingAdapter {
  constructor(email, password, apiUrl) {
    super();
    this.email = email || process.env.SHIPROCKET_EMAIL;
    this.password = password || process.env.SHIPROCKET_PASSWORD;
    this.apiUrl = apiUrl || 'https://apiv2.shiprocket.in/v1/external';
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate and get token
   */
  async authenticate() {
    // Return cached token if still valid
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        email: this.email,
        password: this.password
      });

      this.token = response.data.token;
      // Shiprocket tokens expire after 10 days, cache for 9 days
      this.tokenExpiry = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);

      logger.info('Shiprocket authentication successful');
      return this.token;
    } catch (error) {
      logger.error('Shiprocket authentication error:', error.response?.data || error.message);
      throw new Error(`Shiprocket Auth Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create shipment order
   */
  async createShipment(orderData) {
    try {
      const token = await this.authenticate();

      const payload = {
        order_id: orderData.orderId,
        order_date: new Date().toISOString().split('T')[0],
        pickup_location: orderData.pickupLocation || 'Primary',
        channel_id: orderData.channelId || '',
        comment: orderData.customerNotes || '',
        billing_customer_name: orderData.shipTo.fullName,
        billing_last_name: '',
        billing_address: orderData.shipTo.addressLine1,
        billing_address_2: orderData.shipTo.addressLine2 || '',
        billing_city: orderData.shipTo.city,
        billing_pincode: orderData.shipTo.zipCode,
        billing_state: orderData.shipTo.state,
        billing_country: orderData.shipTo.country || 'India',
        billing_email: orderData.guestEmail || 'customer@example.com',
        billing_phone: orderData.shipTo.phone,
        shipping_is_billing: true,
        order_items: orderData.items.map(item => ({
          name: item.name,
          sku: item.sku,
          units: item.qty,
          selling_price: item.priceSnapshot / 100, // Convert from paise
          discount: 0,
          tax: 0,
          hsn: item.hsn || ''
        })),
        payment_method: 'Prepaid', // All orders are prepaid (COD removed)
        shipping_charges: orderData.totals.shipping / 100,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: orderData.totals.discount / 100,
        sub_total: orderData.totals.subtotal / 100,
        length: orderData.dimensions?.length || 10,
        breadth: orderData.dimensions?.width || 10,
        height: orderData.dimensions?.height || 10,
        weight: (orderData.weight || 500) / 1000 // Convert grams to kg
      };

      const response = await axios.post(
        `${this.apiUrl}/orders/create/adhoc`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.order_id) {
        logger.info(`Shiprocket order created: ${response.data.order_id}`);

        // Now generate AWB
        const shipmentResponse = await this.generateAWB(response.data.order_id, response.data.shipment_id);

        return {
          success: true,
          orderId: response.data.order_id,
          shipmentId: response.data.shipment_id,
          awb: shipmentResponse.awb_code,
          carrier: shipmentResponse.courier_name,
          trackingUrl: `https://shiprocket.co/tracking/${shipmentResponse.awb_code}`,
          estimatedDelivery: null
        };
      }

      throw new Error(response.data.message || 'Failed to create Shiprocket order');
    } catch (error) {
      logger.error('Shiprocket createShipment error:', error.response?.data || error.message);
      throw new Error(`Shiprocket API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Generate AWB for shipment
   */
  async generateAWB(orderId, shipmentId) {
    try {
      const token = await this.authenticate();

      // First, check courier serviceability
      const courierResponse = await axios.get(
        `${this.apiUrl}/courier/serviceability/?pickup_postcode=110001&delivery_postcode=110002&weight=1&cod=0`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const courier = courierResponse.data.data.available_courier_companies[0];

      // Generate AWB
      const response = await axios.post(
        `${this.apiUrl}/courier/assign/awb`,
        {
          shipment_id: shipmentId,
          courier_id: courier.courier_company_id
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        awb_code: response.data.response.data.awb_code,
        courier_name: courier.courier_name,
        courier_company_id: courier.courier_company_id
      };
    } catch (error) {
      logger.error('Shiprocket generateAWB error:', error.response?.data || error.message);
      throw new Error(`Shiprocket AWB Error: ${error.message}`);
    }
  }

  /**
   * Track shipment
   */
  async trackShipment(shipmentId) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${this.apiUrl}/courier/track/shipment/${shipmentId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const tracking = response.data.tracking_data;

      return {
        success: true,
        trackingNumber: tracking.awb_code,
        status: tracking.shipment_status,
        currentLocation: tracking.current_status,
        estimatedDelivery: tracking.edd,
        events: (tracking.shipment_track || []).map(event => ({
          code: event.activity,
          description: event.status,
          location: event.location,
          timestamp: new Date(event.date)
        }))
      };
    } catch (error) {
      logger.error('Shiprocket trackShipment error:', error.response?.data || error.message);
      throw new Error(`Shiprocket Tracking Error: ${error.message}`);
    }
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(orderId) {
    try {
      const token = await this.authenticate();

      const response = await axios.post(
        `${this.apiUrl}/orders/cancel`,
        { ids: [orderId] },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.message === 'Order cancelled successfully') {
        logger.info(`Shiprocket order cancelled: ${orderId}`);
        return { success: true, message: 'Order cancelled successfully' };
      }

      throw new Error(response.data.message || 'Failed to cancel order');
    } catch (error) {
      logger.error('Shiprocket cancelShipment error:', error.response?.data || error.message);
      throw new Error(`Shiprocket Cancel Error: ${error.message}`);
    }
  }

  /**
   * Get shipping label
   */
  async getLabel(shipmentId) {
    try {
      const token = await this.authenticate();

      const response = await axios.post(
        `${this.apiUrl}/courier/generate/label`,
        { shipment_id: [shipmentId] },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        success: true,
        format: 'pdf',
        url: response.data.label_url,
        data: null // Shiprocket provides URL, not base64
      };
    } catch (error) {
      logger.error('Shiprocket getLabel error:', error.message);
      throw new Error(`Shiprocket Label Error: ${error.message}`);
    }
  }

  /**
   * Calculate shipping rate
   */
  async calculateRate(pickupPincode, deliveryPincode, weight, cod = 0) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${this.apiUrl}/courier/serviceability/`,
        {
          params: {
            pickup_postcode: pickupPincode,
            delivery_postcode: deliveryPincode,
            weight: weight / 1000, // Convert grams to kg
            cod: cod ? 1 : 0
          },
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const couriers = response.data.data.available_courier_companies;

      if (!couriers || couriers.length === 0) {
        throw new Error('No courier available for this route');
      }

      // Return cheapest option
      const cheapest = couriers.reduce((prev, curr) =>
        curr.rate < prev.rate ? curr : prev
      );

      return {
        success: true,
        rate: cheapest.rate,
        currency: 'INR',
        estimatedDays: cheapest.etd,
        courier: cheapest.courier_name
      };
    } catch (error) {
      logger.error('Shiprocket calculateRate error:', error.message);
      throw new Error(`Shiprocket Rate Error: ${error.message}`);
    }
  }

  /**
   * Schedule pickup
   */
  async schedulePickup(shipmentId, pickupDate) {
    try {
      const token = await this.authenticate();

      const response = await axios.post(
        `${this.apiUrl}/courier/generate/pickup`,
        {
          shipment_id: [shipmentId],
          pickup_date: pickupDate || new Date().toISOString().split('T')[0]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      logger.info('Shiprocket pickup scheduled successfully');

      return {
        success: true,
        pickupStatus: response.data.pickup_status,
        message: 'Pickup scheduled successfully'
      };
    } catch (error) {
      logger.error('Shiprocket schedulePickup error:', error.message);
      throw new Error(`Shiprocket Pickup Error: ${error.message}`);
    }
  }
}

module.exports = ShiprocketAdapter;
