// Regression: payment.cardDetails was declared with a bare `type: String`, which made Mongoose
// treat the whole field as a String. Saving card details after a card payment then failed,
// leaving paid card orders in "Awaiting Payment".
const mongoose = require('mongoose');
const Order = require('../../models/Order');

describe('Order payment.cardDetails', () => {
  test('is an object with network, last4 and type', () => {
    expect(Order.schema.path('payment.cardDetails')).toBeUndefined();
    expect(Order.schema.path('payment.cardDetails.type').instance).toBe('String');
    expect(Order.schema.path('payment.cardDetails.last4').instance).toBe('String');
  });

  test('an order with card details from Razorpay saves and reads back', async () => {
    const order = await Order.create({
      orderId: `CARD-${Date.now()}`,
      userId: new mongoose.Types.ObjectId(),
      status: 'pending_payment',
      items: [{ productId: new mongoose.Types.ObjectId(), qty: 1, priceSnapshot: 100, name: 'Item' }],
      totals: { subtotal: 100, tax: 0, shipping: 0, total: 100 },
      payment: { status: 'pending', razorpayOrderId: 'order_card_test' },
    });

    // What verifyPayment and the reconciliation job write after a card payment
    order.payment.cardDetails = { network: 'Visa', last4: '5938', type: 'credit' };
    order.payment.status = 'paid';
    order.status = 'placed';
    await order.save();

    const saved = await Order.findById(order._id).lean();
    expect(saved.status).toBe('placed');
    expect(saved.payment.status).toBe('paid');
    expect(saved.payment.cardDetails).toEqual({ network: 'Visa', last4: '5938', type: 'credit' });
  });
});
