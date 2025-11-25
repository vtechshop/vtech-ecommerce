// FILE: apps/api/src/services/paymentService.js
const env = require('../config/env');
const logger = require('../config/logger');

// Use mock payment service if no keys configured (for testing)
const hasPaymentKeys = env.STRIPE_KEY || env.RAZORPAY_KEY_ID;

if (!hasPaymentKeys && env.NODE_ENV === 'development') {
  logger.warn('No payment API keys configured - using mock payment service');
  module.exports = require('./mockPaymentService');
} else {
  // Payment adapter factory
  class PaymentService {
    constructor() {
      this.adapters = {};
      this.useMock = !hasPaymentKeys;

      if (env.STRIPE_KEY) {
        const StripeAdapter = require('../adapters/payment/StripeAdapter');
        this.adapters.stripe = new StripeAdapter(env.STRIPE_KEY);
      }

      if (env.RAZORPAY_KEY_ID) {
        const RazorpayAdapter = require('../adapters/payment/RazorpayAdapter');
        this.adapters.razorpay = new RazorpayAdapter(
          env.RAZORPAY_KEY_ID,
          env.RAZORPAY_KEY_SECRET
        );
      }

      // If no adapters configured, use mock for all providers
      if (Object.keys(this.adapters).length === 0) {
        logger.warn('No payment adapters configured - using mock service');
        const mockService = require('./mockPaymentService');
        this.adapters.stripe = mockService;
        this.adapters.razorpay = mockService;
      }
    }

    getAdapter(provider) {
      const adapter = this.adapters[provider];
      if (!adapter) {
        throw new Error(`Payment adapter ${provider} not configured`);
      }
      return adapter;
    }

  async createPaymentIntent(provider, amount, currency, metadata) {
    const adapter = this.getAdapter(provider);
    return adapter.createPaymentIntent(amount, currency, metadata);
  }

  async confirmPayment(provider, paymentIntentId) {
    const adapter = this.getAdapter(provider);
    return adapter.confirmPayment(paymentIntentId);
  }

    async refund(provider, paymentId, amount) {
      const adapter = this.getAdapter(provider);
      return adapter.refund(paymentId, amount);
    }
  }

  module.exports = new PaymentService();
}