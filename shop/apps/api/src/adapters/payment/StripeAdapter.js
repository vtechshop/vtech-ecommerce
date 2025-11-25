// FILE: apps/api/src/adapters/payment/StripeAdapter.js
const PaymentAdapter = require('./PaymentAdapter');

class StripeAdapter extends PaymentAdapter {
  constructor(apiKey) {
    super();
    this.stripe = require('stripe')(apiKey);
  }

  async createPaymentIntent(amount, currency, metadata) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata,
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    };
  }

  async confirmPayment(paymentIntentId) {
    const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
    };
  }

  async refund(paymentId, amount) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return {
      id: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
    };
  }

  async getPaymentStatus(paymentId) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
    return paymentIntent.status;
  }
}

module.exports = StripeAdapter;