require('dotenv').config();
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const Order = require('../models/Order');

// Initialize Razorpay with your environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Helper to send order confirmation email
 * Replace the console.log with your actual email service (e.g., Nodemailer, SendGrid)
 */
const sendConfirmationEmail = async (order) => {
  const customerEmail = order.guestEmail || order.payment.email || (order.userId && order.userId.email);
  if (!customerEmail) {
    console.warn(`No email found for Order ${order.orderId}, skipping confirmation email.`);
    return;
  }
  // Example: await emailService.sendOrderConfirmation(customerEmail, order);
  console.log(`[Email Service] Sending Order Confirmation for ${order.orderId} to ${customerEmail}`);
};

/**
 * Checks for orders that are 'pending' in DB but 'paid' in Razorpay.
 * Updates them to 'placed' and 'paid'.
 */
const reconcilePayments = async () => {
  try {
    console.log('Running Payment Reconciliation Job...');

    // 1. Find orders created > 5 mins ago (reduced from 15 for faster recovery)
    // This uses the static method defined in your Order model
    // Try to populate userId to get email if available
    let query = Order.findStuckRazorpayOrders(5);
    if (mongoose.models.User) {
      query = query.populate('userId', 'email name');
    }
    const stuckOrders = await query;

    if (stuckOrders.length === 0) {
      // No stuck orders found, nothing to do
      return;
    }

    console.log(`Found ${stuckOrders.length} orders to verify.`);

    for (const order of stuckOrders) {
      try {
        // 2. Fetch payments for this order from Razorpay
        const response = await razorpay.orders.fetchPayments(order.payment.razorpayOrderId);
        
        // 3. Check if any payment was successful (captured)
        const successfulPayment = response.items.find(p => p.status === 'captured');

        if (successfulPayment) {
          console.log(`Order ${order.orderId}: Found successful payment ${successfulPayment.id}. Updating...`);

          // 4. Update Order Status
          order.status = 'placed';
          order.payment.status = 'paid';
          order.payment.razorpayPaymentId = successfulPayment.id;
          order.payment.paidAt = new Date();
          order.payment.method = successfulPayment.method; // e.g., 'card', 'upi'

          // FIX: Capture contact details from Razorpay if missing in DB
          if (successfulPayment.email && !order.payment.email) order.payment.email = successfulPayment.email;
          if (successfulPayment.contact && !order.payment.contact) order.payment.contact = successfulPayment.contact;

          // FIX: Capture card details if available
          if (successfulPayment.card) {
            order.payment.cardDetails = {
              network: successfulPayment.card.network,
              last4: successfulPayment.card.last4,
              type: successfulPayment.card.type
            };
          }
          
          // Add event log
          order.events.push({
            status: 'paid',
            description: 'Payment verified via auto-reconciliation',
            timestamp: new Date()
          });

          await order.save();
          console.log(`Order ${order.orderId} confirmed automatically.`);
          
          // 5. Send Order Confirmation Email
          try {
            await sendConfirmationEmail(order);
          } catch (emailError) {
            console.error(`Failed to send confirmation email for ${order.orderId}:`, emailError.message);
          }
        }
      } catch (err) {
        console.error(`Failed to reconcile order ${order.orderId}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Reconciliation Job Error:', error);
  }
};

// Allow running this script directly from CLI to fix stuck orders immediately
// Usage: node apps/api/src/jobs/reconcilePayments.js
if (require.main === module) {
  (async () => {
    try {
      console.log('Connecting to Database...');
      await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URL);
      await reconcilePayments();
      console.log('Done.');
      process.exit(0);
    } catch (err) {
      console.error('Manual execution failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = reconcilePayments;