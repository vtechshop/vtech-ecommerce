// FILE: apps/api/src/services/delhiveryService.js
const axios = require('axios');
const logger = require('../config/logger');
const env = require('../config/env');

/**
 * Delhivery API Service
 * Production-ready wrapper for all Delhivery shipping APIs
 */
class DelhiveryService {
  constructor() {
    this.baseURL = env.NODE_ENV === 'production'
      ? 'https://api.delhivery.com'
      : 'https://staging-express.delhivery.com';

    this.apiToken = env.NODE_ENV === 'production'
      ? env.DELHIVERY_LIVE_TOKEN
      : env.DELHIVERY_TEST_TOKEN;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info(`Delhivery API Success: ${response.config.url}`, {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error(`Delhivery API Error: ${error.config?.url}`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Handle API errors with retry logic
   */
  handleError(error) {
    if (error.response) {
      return {
        success: false,
        error: {
          code: 'DELHIVERY_API_ERROR',
          status: error.response.status,
          message: error.response.data?.error || error.response.data?.message || 'Delhivery API error',
          details: error.response.data,
        },
      };
    } else if (error.request) {
      return {
        success: false,
        error: {
          code: 'DELHIVERY_NO_RESPONSE',
          message: 'No response from Delhivery API',
        },
      };
    } else {
      return {
        success: false,
        error: {
          code: 'DELHIVERY_REQUEST_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * Retry logic for API calls
   */
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        logger.warn(`Retry attempt ${attempt}/${maxRetries} for Delhivery API`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  // ================= 1. PINCODE SERVICEABILITY =================

  async checkPincodeServiceability(pincodes) {
    try {
      const pincodeString = Array.isArray(pincodes) ? pincodes.join(',') : pincodes;
      const response = await this.client.get('/c/api/pin-codes/json/', {
        params: { filter_codes: pincodeString },
      });
      return {
        success: true,
        data: response.data.delivery_codes || [],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ================= 2. WAREHOUSE MANAGEMENT =================

  async createWarehouse(warehouseData) {
    try {
      const payload = {
        name: warehouseData.name,
        phone: warehouseData.phone,
        email: warehouseData.email,
        address: warehouseData.address,
        city: warehouseData.city,
        state: warehouseData.state,
        country: warehouseData.country || 'India',
        pin: warehouseData.pincode,
        return_address: warehouseData.returnAddress !== false,
        registered_name: warehouseData.registeredName || warehouseData.name,
      };

      const response = await this.client.post('/api/backend/clientwarehouse/create/', payload);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateWarehouse(warehouseName, updateData) {
    try {
      const payload = { name: warehouseName, ...updateData };
      const response = await this.client.post('/api/backend/clientwarehouse/edit/', payload);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ================= 3. WAYBILL MANAGEMENT =================

  async fetchWaybills(count = 10) {
    try {
      if (count > 10000) {
        return {
          success: false,
          error: {
            code: 'INVALID_COUNT',
            message: 'Maximum 10000 waybills can be fetched at once',
          },
        };
      }

      const response = await this.client.get('/waybill/api/bulk/json/', {
        params: { count },
      });

      const waybills = typeof response.data === 'string'
        ? response.data.split(',').filter(Boolean)
        : response.data;

      return {
        success: true,
        data: waybills,
        count: waybills.length,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ================= 4. SHIPPING COST CALCULATION =================

  async calculateShippingCost(params) {
    try {
      const queryParams = {
        md: params.mode || 'S',
        ss: params.status || 'Delivered',
        d_pin: params.destinationPincode,
        o_pin: params.originPincode,
        cgm: params.weightInGrams,
        pt: params.paymentType || 'Pre-paid',
      };

      const response = await this.client.get('/api/kinko/v1/invoice/charges/.json', {
        params: queryParams,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ================= 5. SHIPMENT CREATION =================

  async createShipment(shipmentData) {
    try {
      const payload = {
        format: 'json',
        data: {
          shipments: [
            {
              name: shipmentData.pickup.name,
              add: shipmentData.pickup.address,
              pin: shipmentData.pickup.pincode,
              city: shipmentData.pickup.city,
              state: shipmentData.pickup.state,
              country: shipmentData.pickup.country || 'India',
              phone: shipmentData.pickup.phone,
              order: shipmentData.referenceId,
              payment_mode: shipmentData.paymentMode,
              return_pin: shipmentData.pickup.pincode,
              return_city: shipmentData.pickup.city,
              return_phone: shipmentData.pickup.phone,
              return_add: shipmentData.pickup.address,
              return_state: shipmentData.pickup.state,
              return_country: shipmentData.pickup.country || 'India',
              products_desc: shipmentData.products.description || 'Products',
              hsn_code: shipmentData.products.hsnCode || '',
              cod_amount: shipmentData.codAmount || 0,
              order_date: shipmentData.orderDate || new Date().toISOString(),
              total_amount: shipmentData.totalAmount,
              seller_add: shipmentData.pickup.address,
              seller_name: shipmentData.pickup.name,
              seller_inv: shipmentData.invoiceNumber || '',
              quantity: shipmentData.quantity || 1,
              waybill: shipmentData.waybill || '',
              shipment_width: shipmentData.dimensions?.width || 10,
              shipment_height: shipmentData.dimensions?.height || 10,
              weight: shipmentData.weightInGrams || 500,
              seller_gst_tin: shipmentData.gstNumber || '',
              shipping_mode: shipmentData.shippingMode || 'Surface',
              address_type: shipmentData.addressType || 'home',
            },
          ],
        },
      };

      const response = await this.retryRequest(
        () => this.client.post('/api/cmu/create.json', payload),
        3,
        2000
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ================= 6. SHIPMENT TRACKING =================

  async trackShipment(waybills) {
    try {
      const waybillString = Array.isArray(waybills) ? waybills.join(',') : waybills;
      const response = await this.client.get('/api/v1/packages/json/', {
        params: {
          waybill: waybillString,
          verbose: true,
        },
      });

      return {
        success: true,
        data: response.data.ShipmentData || [],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ================= 7. SHIPPING LABEL GENERATION =================

  async generateShippingLabel(waybills) {
    try {
      const waybillString = Array.isArray(waybills) ? waybills.join(',') : waybills;
      const response = await this.client.get('/api/p/packing_slip', {
        params: {
          wbns: waybillString,
          pdf: true,
        },
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(response.data, 'binary').toString('base64');

      return {
        success: true,
        data: {
          pdf: base64,
          url: `${this.baseURL}/api/p/packing_slip?wbns=${waybillString}&pdf=true`,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ================= 8. PICKUP REQUEST =================

  async raisePickupRequest(pickupData) {
    try {
      const payload = {
        pickup_location: pickupData.warehouseName,
        pickup_time: pickupData.pickupTime,
        pickup_date: pickupData.pickupDate,
        expected_package_count: pickupData.packageCount || 1,
      };

      const response = await this.client.post('/fm/request/new/', payload);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ================= 9. NDR =================

  async handleNDR(ndrData) {
    try {
      const payload = {
        data: [
          {
            waybill: ndrData.waybill,
            action: ndrData.action,
            deferred_date: ndrData.deferredDate || '',
          },
        ],
      };

      const response = await this.client.post('/api/p/update', payload);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async checkNDRStatus(requestId) {
    try {
      const response = await this.client.get('/api/cnm/get_bulk_upd_url_15660', {
        params: { request_id: requestId },
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ================= 10. SERVICE STATUS =================

  async getServiceStatus() {
    try {
      // Check API health by making a simple pincode serviceability call
      const testResult = await this.checkPincodeServiceability('110001');

      return {
        success: true,
        data: {
          status: testResult.success ? 'operational' : 'degraded',
          apiConnected: testResult.success,
          environment: env.NODE_ENV === 'production' ? 'production' : 'staging',
          baseURL: this.baseURL,
          tokenConfigured: !!this.apiToken,
          lastChecked: new Date().toISOString(),
          message: testResult.success
            ? 'Delhivery API is operational'
            : 'Delhivery API may be experiencing issues',
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          status: 'down',
          apiConnected: false,
          environment: env.NODE_ENV === 'production' ? 'production' : 'staging',
          baseURL: this.baseURL,
          tokenConfigured: !!this.apiToken,
          lastChecked: new Date().toISOString(),
          message: 'Unable to connect to Delhivery API',
          error: error.message,
        },
      };
    }
  }
}

module.exports = new DelhiveryService();
