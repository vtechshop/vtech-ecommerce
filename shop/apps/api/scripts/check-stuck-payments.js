// READ-ONLY: lists orders still "payment pending" here although Razorpay captured the payment.
// Changes nothing in the database or in Razorpay. Prints no keys or secrets.
// Run from the API folder:  node scripts/check-stuck-payments.js
require('dotenv').config();
const mongoose = require('mongoose');
const Razorpay = require('razorpay');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const orders = mongoose.connection.db.collection('orders');
  const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

  const pending = await orders
    .find({ 'payment.status': 'pending' }, { projection: { orderId: 1, status: 1, createdAt: 1, 'totals.total': 1, 'payment.razorpayOrderId': 1 } })
    .sort({ createdAt: -1 })
    .toArray();
  const reachedRazorpay = pending.filter(o => o.payment?.razorpayOrderId);
  console.log(`Orders with payment pending: ${pending.length}`);
  console.log(`  never reached Razorpay (left before paying): ${pending.length - reachedRazorpay.length}`);
  console.log(`  reached Razorpay, checking each now: ${reachedRazorpay.length}\n`);

  const paid = [];
  let failedChecks = 0;
  for (const order of reachedRazorpay) {
    try {
      const { items } = await razorpay.orders.fetchPayments(order.payment.razorpayOrderId);
      const captured = items.find(p => p.status === 'captured');
      if (!captured) continue;
      const orderTotal = Number(order.totals?.total || 0);
      const paidAmount = captured.amount / 100;
      paid.push({
        order: order.orderId,
        created: new Date(order.createdAt).toISOString().slice(0, 16).replace('T', ' '),
        status: order.status,
        orderTotal,
        paidAmount,
        amountMatches: Math.abs(orderTotal - paidAmount) < 1 ? 'yes' : 'NO',
        paymentId: captured.id,
        method: captured.method,
      });
    } catch (err) {
      failedChecks++;
      console.log(`  could not check ${order.orderId}: ${err.error?.description || err.message}`);
    }
  }

  console.log(`PAID on Razorpay but still pending here: ${paid.length}`);
  if (paid.length) console.table(paid);
  if (failedChecks) console.log(`Orders that could not be checked: ${failedChecks}`);
  console.log('\nNothing was changed.');
  await mongoose.disconnect();
})().catch(err => {
  console.error('Check failed:', err.message);
  process.exit(1);
});
