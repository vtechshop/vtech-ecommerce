const paymentService = require('../services/paymentService');

exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', provider = 'stripe' } = req.body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Amount must be a positive number' }
      });
    }

    // Validate max amount (10 lakh rupees = 1,000,000 INR)
    if (amount > 1000000) {
      return res.status(400).json({
        success: false,
        error: { code: 'AMOUNT_TOO_LARGE', message: 'Amount exceeds maximum allowed (₹10,00,000)' }
      });
    }

    // Validate provider
    const allowedProviders = ['stripe', 'razorpay'];
    if (!allowedProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PROVIDER', message: 'Invalid payment provider' }
      });
    }

    // Validate currency
    const allowedCurrencies = ['INR', 'USD', 'EUR', 'GBP'];
    if (!allowedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CURRENCY', message: 'Invalid currency code' }
      });
    }

    const intent = await paymentService.createPaymentIntent(provider, amount, currency, { userId: req.user._id });
    res.json({ success: true, data: intent });
  } catch (error) {
    next(error);
  }
};

exports.confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId, provider = 'stripe' } = req.body;
    const result = await paymentService.confirmPayment(provider, paymentIntentId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.stripeWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const stripe = require('stripe')(process.env.STRIPE_KEY);
    const Order = require('../models/Order');
    const WebhookEvent = require('../models/WebhookEvent');
    const logger = require('../config/logger');

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.error(`Stripe webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // SECURITY: Check for replay attacks - ensure event hasn't been processed before
    const eventId = event.id;
    const existingEvent = await WebhookEvent.findOne({ eventId, provider: 'stripe' });
    if (existingEvent) {
      logger.warn(`Duplicate Stripe webhook event detected and rejected: ${eventId}`);
      return res.json({ received: true, note: 'duplicate_event_ignored' });
    }

    // SECURITY: Verify event timestamp (reject events older than 5 minutes to prevent replay)
    const eventTime = event.created * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (currentTime - eventTime > fiveMinutes) {
      logger.warn(`Old Stripe webhook event rejected: ${eventId}, age: ${(currentTime - eventTime) / 1000}s`);
      return res.status(400).json({ error: 'Event too old' });
    }

    // Record the webhook event to prevent replay
    await WebhookEvent.create({
      eventId,
      provider: 'stripe',
      eventType: event.type,
      processedAt: new Date(),
      payload: event,
    });

    // SECURITY: Handle different event types properly
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        // Update order status to paid
        const order = await Order.findOne({ 'payment.paymentIntentId': paymentIntent.id });
        if (order && order.status === 'placed') {
          order.status = 'paid';
          order.payment.status = 'completed';
          order.payment.paidAt = new Date();
          order.events.push({
            status: 'paid',
            description: 'Payment confirmed via Stripe webhook',
            timestamp: new Date()
          });
          await order.save();
          logger.info(`Order ${order.orderId} marked as paid via Stripe webhook`);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        const failedOrder = await Order.findOne({ 'payment.paymentIntentId': failedIntent.id });
        if (failedOrder) {
          failedOrder.payment.status = 'failed';
          failedOrder.events.push({
            status: 'payment_failed',
            description: 'Payment failed',
            timestamp: new Date()
          });
          await failedOrder.save();
          logger.warn(`Order ${failedOrder.orderId} payment failed via Stripe webhook`);
        }
        break;

      default:
        logger.info(`Unhandled Stripe webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

exports.razorpayWebhook = async (req, res, next) => {
  try {
    const crypto = require('crypto');
    const logger = require('../config/logger');
    const Order = require('../models/Order');
    const WebhookEvent = require('../models/WebhookEvent');

    // SECURITY: Verify Razorpay webhook signature
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      logger.error('Razorpay webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body;

    // SECURITY: Check for replay attacks using Razorpay event ID
    const eventId = payload.payment?.entity?.id || payload.order?.entity?.id || `razorpay_${Date.now()}`;
    const existingEvent = await WebhookEvent.findOne({ eventId, provider: 'razorpay' });
    if (existingEvent) {
      logger.warn(`Duplicate Razorpay webhook event detected and rejected: ${eventId}`);
      return res.json({ status: 'ok', note: 'duplicate_event_ignored' });
    }

    // Record the webhook event to prevent replay
    await WebhookEvent.create({
      eventId,
      provider: 'razorpay',
      eventType: event,
      processedAt: new Date(),
      payload: req.body,
    });

    // Handle different event types
    switch (event) {
      case 'payment.captured':
        const paymentId = payload.payment.entity.id;
        const order = await Order.findOne({ 'payment.paymentIntentId': paymentId });
        if (order && order.status === 'placed') {
          order.status = 'paid';
          order.payment.status = 'completed';
          order.payment.paidAt = new Date();
          order.events.push({
            status: 'paid',
            description: 'Payment confirmed via Razorpay webhook',
            timestamp: new Date()
          });
          await order.save();
          logger.info(`Order ${order.orderId} marked as paid via Razorpay webhook`);
        }
        break;

      case 'payment.failed':
        const failedPaymentId = payload.payment.entity.id;
        const failedOrder = await Order.findOne({ 'payment.paymentIntentId': failedPaymentId });
        if (failedOrder) {
          failedOrder.payment.status = 'failed';
          failedOrder.events.push({
            status: 'payment_failed',
            description: 'Payment failed',
            timestamp: new Date()
          });
          await failedOrder.save();
          logger.warn(`Order ${failedOrder.orderId} payment failed via Razorpay webhook`);
        }
        break;

      default:
        logger.info(`Unhandled Razorpay webhook event type: ${event}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};
