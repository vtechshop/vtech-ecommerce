// Mock Payment Service for Development/Testing
// Used when actual payment API keys are not configured

const logger = require('../config/logger');

class MockPaymentService {
  constructor() {
    logger.info('Using Mock Payment Service (no real payment processing)');
  }

  async createPaymentIntent(provider, amount, currency, metadata) {
    logger.info(`Mock: Creating payment intent for ${provider}`, { amount, currency });

    return {
      id: `mock_pi_${Date.now()}`,
      client_secret: `mock_secret_${Date.now()}`,
      amount,
      currency,
      status: 'requires_payment_method',
      provider,
      metadata
    };
  }

  async confirmPayment(provider, paymentIntentId) {
    logger.info(`Mock: Confirming payment ${paymentIntentId} for ${provider}`);

    return {
      id: paymentIntentId,
      status: 'succeeded',
      amount: 1000,
      currency: 'INR',
      provider
    };
  }

  async refund(provider, paymentId, amount) {
    logger.info(`Mock: Refunding ${amount} for payment ${paymentId} on ${provider}`);

    return {
      id: `mock_refund_${Date.now()}`,
      status: 'succeeded',
      amount,
      payment_id: paymentId,
      provider
    };
  }

  getAdapter(provider) {
    // Return self as adapter for all providers
    return this;
  }

  async createOrder(amount, currency, metadata) {
    // For Razorpay-style order creation
    logger.info('Mock: Creating Razorpay order', { amount, currency });

    return {
      id: `mock_order_${Date.now()}`,
      amount,
      currency,
      status: 'created',
      metadata
    };
  }

  async verifySignature(payload) {
    // Mock signature verification (always passes)
    logger.info('Mock: Verifying payment signature (auto-approved)');
    return true;
  }
}

module.exports = new MockPaymentService();
