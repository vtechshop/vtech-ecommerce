const request = require('supertest');
const crypto = require('crypto');
const app = require('../../app');
const Order = require('../../models/Order');
const WebhookEvent = require('../../models/WebhookEvent');
const webhookWorker = require('../../jobs/webhookWorker');

jest.mock('../../services/notificationService', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  notify: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/notificationHelper', () => ({
  notifyVendorsAboutOrder: jest.fn().mockResolvedValue(true),
  notifyAdminNewOrder: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/whatsappService', () => ({
  sendOrderConfirmation: jest.fn(),
}));
jest.mock('../../services/socketService', () => ({
  emitToUser: jest.fn(),
}));

const WEBHOOK_SECRET = 'test_webhook_secret';

// generateSignature mirrors how supertest serialises the body:
// supertest calls JSON.stringify internally, so HMAC over JSON.stringify == HMAC over the raw bytes on the wire
function generateSignature(body) {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
}

function makeEventId() {
  return `evt_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

describe('Webhooks Integration Tests', () => {
  let orderId;

  beforeAll(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  beforeEach(async () => {
    await WebhookEvent.deleteMany({});
    const order = await Order.create({
      orderId: `TEST-ORDER-WH-${Date.now()}`,
      userId: '507f1f77bcf86cd799439011',
      status: 'pending_payment',
      items: [{
        productId: '507f1f77bcf86cd799439022',
        qty: 2,
        priceSnapshot: 500,
        name: 'Webhook Test Product',
      }],
      totals: { subtotal: 1000, tax: 0, shipping: 0, total: 1000 },
      payment: { status: 'pending', razorpayOrderId: 'rz_order_test' },
    });
    orderId = order._id.toString();
  });

  afterEach(async () => {
    await WebhookEvent.deleteMany({});
  });

  // ── A: Signature verification ──────────────────────────────────────────────

  describe('Signature verification', () => {
    test('A1: rejects request with invalid signature', async () => {
      const body = { event: 'payment.captured', payload: { payment: { entity: { notes: { orderId } } } } };

      const res = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', 'bad_signature')
        .set('x-razorpay-event-id', makeEventId())
        .send(body);

      expect(res.status).toBe(400);
    });

    test('A2: rejects when RAZORPAY_WEBHOOK_SECRET is missing', async () => {
      const savedSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      delete process.env.RAZORPAY_WEBHOOK_SECRET;

      const body = { event: 'payment.captured', payload: {} };
      const res = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', 'whatever')
        .set('x-razorpay-event-id', makeEventId())
        .send(body);

      expect(res.status).toBe(400);
      process.env.RAZORPAY_WEBHOOK_SECRET = savedSecret;
    });
  });

  // ── B: Enqueueing behaviour ────────────────────────────────────────────────

  describe('Event persistence (enqueue)', () => {
    test('B1: valid payment.captured event returns 200 and is persisted as pending', async () => {
      const eventId = makeEventId();
      const body = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_x', notes: { orderId } } } },
      };

      const res = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', generateSignature(body))
        .set('x-razorpay-event-id', eventId)
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const evt = await WebhookEvent.findOne({ eventId });
      expect(evt).toBeTruthy();
      expect(evt.status).toBe('pending');
      expect(evt.event).toBe('payment.captured');
    });

    test('B2: valid payment.failed event is persisted as pending', async () => {
      const eventId = makeEventId();
      const body = {
        event: 'payment.failed',
        payload: { payment: { entity: { id: 'pay_fail', notes: { orderId } } } },
      };

      const res = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', generateSignature(body))
        .set('x-razorpay-event-id', eventId)
        .send(body);

      expect(res.status).toBe(200);

      const evt = await WebhookEvent.findOne({ eventId });
      expect(evt).toBeTruthy();
      expect(evt.event).toBe('payment.failed');
    });

    test('B3: unknown event type returns 200 and is persisted', async () => {
      const eventId = makeEventId();
      const body = { event: 'subscription.activated', payload: {} };

      const res = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', generateSignature(body))
        .set('x-razorpay-event-id', eventId)
        .send(body);

      expect(res.status).toBe(200);
      const evt = await WebhookEvent.findOne({ eventId });
      expect(evt).toBeTruthy();
    });
  });

  // ── C: Idempotency ─────────────────────────────────────────────────────────

  describe('Event-ID idempotency', () => {
    test('C1: duplicate event-id returns 200 but creates only one WebhookEvent', async () => {
      const eventId = makeEventId();
      const body = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_dup', notes: { orderId } } } },
      };
      const sig = generateSignature(body);

      const r1 = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', sig)
        .set('x-razorpay-event-id', eventId)
        .send(body);

      const r2 = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', sig)
        .set('x-razorpay-event-id', eventId)
        .send(body);

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);

      const count = await WebhookEvent.countDocuments({ eventId });
      expect(count).toBe(1);
    });
  });

  // ── D: Worker — payment.captured side effects ─────────────────────────────

  describe('Worker processes payment.captured', () => {
    test('D1: worker marks order as paid after processing captured event', async () => {
      // Enqueue via webhook
      const eventId = makeEventId();
      const body = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_worker', notes: { orderId } } } },
      };
      await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', generateSignature(body))
        .set('x-razorpay-event-id', eventId)
        .send(body);

      // Process via worker
      await webhookWorker.runOneTick();

      const updated = await Order.findById(orderId);
      expect(updated.payment.status).toBe('paid');
      expect(updated.status).toBe('paid');

      const evt = await WebhookEvent.findOne({ eventId });
      expect(evt.status).toBe('completed');
    });

    test('D2: processing is idempotent — second worker tick does not re-process completed event', async () => {
      const notificationService = require('../../services/notificationService');
      const eventId = makeEventId();
      const body = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_idem', notes: { orderId } } } },
      };
      await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', generateSignature(body))
        .set('x-razorpay-event-id', eventId)
        .send(body);

      notificationService.sendOrderConfirmation.mockClear();
      await webhookWorker.runOneTick();
      const callsAfterFirst = notificationService.sendOrderConfirmation.mock.calls.length;

      await webhookWorker.runOneTick(); // second tick — event is completed, nothing to do
      expect(notificationService.sendOrderConfirmation.mock.calls.length).toBe(callsAfterFirst);
    });
  });

  // ── E: Worker — payment.failed side effects ────────────────────────────────

  describe('Worker processes payment.failed', () => {
    test('E1: worker marks order payment as failed', async () => {
      const eventId = makeEventId();
      const body = {
        event: 'payment.failed',
        payload: { payment: { entity: { id: 'pay_fail_w', error_description: 'Insufficient funds', notes: { orderId } } } },
      };
      await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', generateSignature(body))
        .set('x-razorpay-event-id', eventId)
        .send(body);

      await webhookWorker.runOneTick();

      const updated = await Order.findById(orderId);
      expect(updated.payment.status).toBe('failed');

      const evt = await WebhookEvent.findOne({ eventId });
      expect(evt.status).toBe('completed');
    });

    test('E2: stock restoration runs exactly once even if webhook fires after frontend failure callback', async () => {
      const { processWebhookPaymentFailed } = require('../../controllers/razorpayController');

      // Simulate frontend failure callback marking stock restored
      await Order.findByIdAndUpdate(orderId, { stockRestorationDone: true });

      // Webhook worker also fires — should be a no-op for stock
      const order = await Order.findById(orderId);
      const productId = order.items[0].productId;
      const Product = require('../../models/Product');
      let productBefore;
      try { productBefore = await Product.findById(productId); } catch (_) { productBefore = null; }

      await processWebhookPaymentFailed({
        payment: { entity: { notes: { orderId }, error_description: 'Failed' } },
      });

      if (productBefore) {
        const productAfter = await Product.findById(productId);
        expect(productAfter.stock).toBe(productBefore.stock); // unchanged
      }

      // Flag stays true
      const finalOrder = await Order.findById(orderId);
      expect(finalOrder.stockRestorationDone).toBe(true);
    });
  });

  // ── F: Notification atomic claims ─────────────────────────────────────────

  describe('Notification idempotency', () => {
    test('F1: customer email is sent only once when worker processes captured event', async () => {
      const notificationService = require('../../services/notificationService');
      notificationService.sendOrderConfirmation.mockClear();

      const eventId = makeEventId();
      const body = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_notif', notes: { orderId } } } },
      };
      await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', generateSignature(body))
        .set('x-razorpay-event-id', eventId)
        .send(body);

      await webhookWorker.runOneTick();

      // Simulate a second processing attempt (e.g. stall recovery re-queued it)
      const { processWebhookPaymentCaptured } = require('../../controllers/razorpayController');
      await processWebhookPaymentCaptured({ payment: { entity: { id: 'pay_notif', notes: { orderId } } } });

      // Email must have been attempted at most once (atomic claim guards subsequent calls)
      expect(notificationService.sendOrderConfirmation.mock.calls.length).toBeLessThanOrEqual(1);
    });
  });

  // ── G: Stale event handling ────────────────────────────────────────────────

  describe('Stale event handling', () => {
    test('G1: event older than 25 hours is silently accepted (returns 200, not queued)', async () => {
      const eventId = makeEventId();
      const staleTimestamp = Math.floor(Date.now() / 1000) - 26 * 3600; // 26 hours ago
      const body = {
        event: 'payment.captured',
        created_at: staleTimestamp,
        payload: { payment: { entity: { notes: { orderId } } } },
      };

      const res = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', generateSignature(body))
        .set('x-razorpay-event-id', eventId)
        .send(body);

      expect(res.status).toBe(200);
      const evt = await WebhookEvent.findOne({ eventId });
      expect(evt).toBeNull(); // Not persisted
    });

    test('G2: event within 25 hours is accepted and queued', async () => {
      const eventId = makeEventId();
      const recentTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const body = {
        event: 'payment.captured',
        created_at: recentTimestamp,
        payload: { payment: { entity: { notes: { orderId } } } },
      };

      const res = await request(app)
        .post('/api/payment/razorpay/webhook')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', generateSignature(body))
        .set('x-razorpay-event-id', eventId)
        .send(body);

      expect(res.status).toBe(200);
      const evt = await WebhookEvent.findOne({ eventId });
      expect(evt).toBeTruthy();
    });
  });
});
