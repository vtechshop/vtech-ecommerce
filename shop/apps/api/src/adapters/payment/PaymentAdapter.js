// FILE: apps/api/src/adapters/payment/PaymentAdapter.js
// Base payment adapter interface
class PaymentAdapter {
  async createPaymentIntent(amount, currency, metadata) {
    throw new Error('createPaymentIntent must be implemented');
  }

  async confirmPayment(paymentIntentId) {
    throw new Error('confirmPayment must be implemented');
  }

  async refund(paymentId, amount) {
    throw new Error('refund must be implemented');
  }

  async getPaymentStatus(paymentId) {
    throw new Error('getPaymentStatus must be implemented');
  }
}

module.exports = PaymentAdapter;