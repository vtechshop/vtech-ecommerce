// FILE: apps/api/src/adapters/payment/RazorpayAdapter.js
const PaymentAdapter = require('./PaymentAdapter');
const crypto = require('crypto');

class RazorpayAdapter extends PaymentAdapter {
  constructor(keyId, keySecret) {
    super();
    const Razorpay = require('razorpay');
    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    this.keySecret = keySecret;
  }

  async createPaymentIntent(amount, currency, metadata) {
    const order = await this.razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      notes: metadata,
    });

    return {
      id: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      status: order.status,
    };
  }

  async confirmPayment(orderId) {
    const order = await this.razorpay.orders.fetch(orderId);
    const payments = await this.razorpay.orders.fetchPayments(orderId);

    return {
      id: orderId,
      status: payments.items.length > 0 ? payments.items[0].status : 'pending',
      amount: order.amount / 100,
    };
  }

  async refund(paymentId, amount) {
    const refund = await this.razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return {
      id: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
    };
  }

  async getPaymentStatus(orderId) {
    const order = await this.razorpay.orders.fetch(orderId);
    return order.status;
  }

  verifyWebhookSignature(payload, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');
    
    return expectedSignature === signature;
  }
}

module.exports = RazorpayAdapter;