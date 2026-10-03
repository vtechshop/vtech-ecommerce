// CRM order events: the outbox, its worker, the trusted-payment rule, and the checkout
// marketing-consent tick box. The CRM is a fake HTTP client; nothing leaves the test process.
const request = require('supertest');
const crypto = require('crypto');
const app = require('../../app');
const Order = require('../../models/Order');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Product = require('../../models/Product');
const CrmOutbox = require('../../models/CrmOutbox');
const WebhookEvent = require('../../models/WebhookEvent');
const webhookWorker = require('../../jobs/webhookWorker');
const crmOutboxWorker = require('../../jobs/crmOutboxWorker');
const crmEventService = require('../../services/crmEventService');
const { generateAccessToken } = require('../../utils/jwt');
const { hashPassword } = require('../../utils/hash');

jest.mock('../../utils/razorpay', () => ({
  isConfigured: true,
  createOrder: jest.fn(),
  verifyPaymentSignature: jest.fn(),
  fetchPayment: jest.fn(),
  createTransfers: jest.fn(),
}));
jest.mock('../../services/notificationService', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  sendOrderCancellationEmail: jest.fn().mockResolvedValue(true),
  sendVendorOrderCancellationEmail: jest.fn().mockResolvedValue(true),
  sendOrderStatusUpdateEmail: jest.fn().mockResolvedValue(true),
  notify: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/notificationHelper', () => ({
  notifyVendorsAboutOrder: jest.fn().mockResolvedValue(true),
  notifyAdminNewOrder: jest.fn().mockResolvedValue(true),
  notifyCustomerOrderStatus: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../services/socketService', () => ({ emitToUser: jest.fn() }));

const razorpay = require('../../utils/razorpay');

const CRM_SECRET = 'crm-test-secret-0123456789-abcdefghij';
const CRM_URL = 'https://crm.example.test/api/webhooks/shop';

const enable = () => {
  process.env.CRM_EVENTS_ENABLED = 'true';
  process.env.CRM_EVENTS_URL = CRM_URL;
  process.env.CRM_EVENTS_SECRET = CRM_SECRET;
};
const disable = () => {
  delete process.env.CRM_EVENTS_ENABLED;
  delete process.env.CRM_EVENTS_URL;
  delete process.env.CRM_EVENTS_SECRET;
};

// A stand-in for the CRM. `answers` are used in order; the last one repeats.
function fakeCrm(...answers) {
  const calls = [];
  let i = 0;
  return {
    calls,
    post: async (url, body, options) => {
      calls.push({ url, body, headers: options.headers });
      const answer = answers[Math.min(i, answers.length - 1)] ?? { status: 200 };
      i += 1;
      if (answer instanceof Error) throw answer;
      return { status: answer.status };
    },
  };
}

let seq = 0;
function makeOrder(overrides = {}) {
  seq += 1;
  return Order.create({
    orderId: `VT-CRM-${Date.now()}-${seq}`,
    userId: '507f1f77bcf86cd799439011',
    status: 'pending_payment',
    items: [{ productId: '507f1f77bcf86cd799439022', qty: 2, priceSnapshot: 500, name: 'Dough Kneader' }],
    totals: { subtotal: 1000, tax: 0, shipping: 0, total: 1000 },
    shipTo: { fullName: 'Kavya R', phone: '9876500011', addressLine1: '12 Private Street', city: 'Coimbatore', zipCode: '641001' },
    payment: { status: 'pending', razorpayOrderId: 'rz_order_test' },
    ...overrides,
  });
}

// Queues a Razorpay event exactly as the webhook route stores it (models/WebhookEvent) and lets
// the real worker process it. The HTTP route itself is covered by webhooks.test.js.
async function razorpayWebhook(event, orderId, eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`) {
  const payload = { payment: { entity: { id: 'pay_crm', notes: { orderId: String(orderId) } } } };
  try {
    await WebhookEvent.create({ eventId, event, payload });
  } catch (err) {
    if (err.code !== 11000) throw err; // same event id delivered twice: stored once, as the route does
  }
  await webhookWorker.runOneTick();
  return eventId;
}

describe('CRM order events', () => {
  beforeEach(async () => {
    await Promise.all([CrmOutbox.deleteMany({}), WebhookEvent.deleteMany({})]);
    enable();
  });

  afterEach(() => {
    disable();
    jest.clearAllMocks();
  });

  // ── A: off by default ──────────────────────────────────────────────────────

  describe('Feature flag', () => {
    test('A1: with the flag off nothing is recorded and the worker does nothing', async () => {
      disable();
      const order = await makeOrder();
      await razorpayWebhook('payment.captured', order._id);

      expect((await Order.findById(order._id)).payment.status).toBe('paid');
      expect(await CrmOutbox.countDocuments()).toBe(0);
      const crm = fakeCrm();
      expect(await crmOutboxWorker.runOneTick(crm)).toEqual({ skipped: true });
      expect(crm.calls).toHaveLength(0);
    });

    test('A2: the flag alone is not enough — a URL and a 32+ character secret are required', async () => {
      delete process.env.CRM_EVENTS_URL;
      expect(crmEventService.isEnabled()).toBe(false);
      process.env.CRM_EVENTS_URL = CRM_URL;
      process.env.CRM_EVENTS_SECRET = 'short';
      expect(crmEventService.isEnabled()).toBe(false);
      process.env.CRM_EVENTS_ENABLED = 'TRUE';
      process.env.CRM_EVENTS_SECRET = CRM_SECRET;
      expect(crmEventService.isEnabled()).toBe(false);
    });
  });

  // ── B: only after trusted payment ──────────────────────────────────────────

  describe('Trusted payment status', () => {
    test('B1: a verified payment webhook records exactly one order.confirmed event', async () => {
      const order = await makeOrder();
      await razorpayWebhook('payment.captured', order._id);

      const rows = await CrmOutbox.find().lean();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ eventId: `${order._id}:order.confirmed`, type: 'order.confirmed', status: 'pending' });
      expect(rows[0].payload).toMatchObject({
        type: 'order.confirmed',
        order: { ref: order.orderId, total: 1000, currency: 'INR', itemCount: 1 },
        customer: { name: 'Kavya R', phone: '9876500011' },
      });
    });

    test('B2: the event carries no address, email or payment identifiers', async () => {
      const order = await makeOrder({ guestEmail: 'private@example.com', isGuest: true });
      await razorpayWebhook('payment.captured', order._id);
      const text = JSON.stringify((await CrmOutbox.findOne().lean()).payload);
      for (const secret of ['Private Street', '641001', 'private@example.com', 'rz_order_test', 'pay_crm']) {
        expect(text).not.toContain(secret);
      }
    });

    test('B3: duplicate payment webhooks record one event', async () => {
      const order = await makeOrder();
      // Same Razorpay event id redelivered, then a second event for the same payment
      const eventId = await razorpayWebhook('payment.captured', order._id);
      await razorpayWebhook('payment.captured', order._id, eventId);
      await razorpayWebhook('payment.captured', order._id);
      expect(await WebhookEvent.countDocuments()).toBe(2);
      expect(await CrmOutbox.countDocuments()).toBe(1);
    });

    test('B4: browser verification followed by the webhook records one event', async () => {
      const user = await User.create({ name: 'Pay User', email: 'pay-crm@test.com', password: await hashPassword('password123456'), emailVerified: true });
      const order = await makeOrder({ userId: user._id });
      razorpay.verifyPaymentSignature.mockReturnValue(true);
      razorpay.fetchPayment.mockResolvedValue({ success: true, payment: { status: 'captured', amount: 100000, currency: 'INR', method: 'upi' } });

      const res = await request(app)
        .post('/api/payment/razorpay/verify')
        .set('Authorization', `Bearer ${generateAccessToken(user._id, 'customer')}`)
        .send({ orderId: String(order._id), razorpayOrderId: 'rz_order_test', razorpayPaymentId: 'pay_crm', razorpaySignature: 'sig' });
      expect(res.status).toBe(200);
      expect(await CrmOutbox.countDocuments({ type: 'order.confirmed' })).toBe(1);

      await razorpayWebhook('payment.captured', order._id);
      expect(await CrmOutbox.countDocuments()).toBe(1);
    });

    test('B5: a rejected payment signature records nothing', async () => {
      const user = await User.create({ name: 'Pay User', email: 'pay-crm2@test.com', password: await hashPassword('password123456'), emailVerified: true });
      const order = await makeOrder({ userId: user._id });
      razorpay.verifyPaymentSignature.mockReturnValue(false);

      const res = await request(app)
        .post('/api/payment/razorpay/verify')
        .set('Authorization', `Bearer ${generateAccessToken(user._id, 'customer')}`)
        .send({ orderId: String(order._id), razorpayOrderId: 'rz_order_test', razorpayPaymentId: 'pay_x', razorpaySignature: 'forged' });
      expect(res.status).toBe(400);
      expect(await CrmOutbox.countDocuments()).toBe(0);
      expect((await Order.findById(order._id)).status).toBe('pending_payment');
    });

    test('B6: a payment still pending, or one that failed, records nothing', async () => {
      const pending = await makeOrder();
      expect(await crmEventService.recordOrderEvent('order.confirmed', pending)).toBe('unpaid');

      const failed = await makeOrder();
      await razorpayWebhook('payment.failed', failed._id);
      expect((await Order.findById(failed._id)).payment.status).toBe('failed');
      expect(await CrmOutbox.countDocuments()).toBe(0);
    });

    test('B7: out of order — failed arrives after captured: still one confirmed event, never a second', async () => {
      const order = await makeOrder();
      await razorpayWebhook('payment.captured', order._id);
      await razorpayWebhook('payment.failed', order._id);
      await razorpayWebhook('payment.captured', order._id);
      expect(await CrmOutbox.countDocuments({ type: 'order.confirmed' })).toBe(1);
      expect(await CrmOutbox.countDocuments()).toBe(1);
    });

    test('B8: an admin changing the status to "paid" by hand records nothing', async () => {
      const admin = await User.create({ name: 'Admin', email: 'admin-crm@test.com', password: await hashPassword('password123456'), role: 'admin', emailVerified: true });
      const order = await makeOrder();

      const res = await request(app)
        .put(`/api/admin/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${generateAccessToken(admin._id, 'admin')}`)
        .send({ status: 'paid' });
      // Whatever the route answers, no event may come out of it
      expect(res.status).toBeLessThan(500);
      const after = await Order.findById(order._id);
      expect(after.payment.status).toBe('pending');
      expect(await CrmOutbox.countDocuments()).toBe(0);

      // ...and later status changes on that never-paid order stay silent too
      for (const type of crmEventService.EVENT_TYPES) {
        expect(await crmEventService.recordOrderEvent(type, after)).toBe('unpaid');
      }
      expect(await CrmOutbox.countDocuments()).toBe(0);
    });

    test('B9: in-store and phone orders are not website events', async () => {
      const order = await makeOrder({ source: 'in-store', payment: { status: 'paid' } });
      expect(await crmEventService.recordOrderEvent('order.confirmed', order)).toBe('ignored');
      expect(await CrmOutbox.countDocuments()).toBe(0);
    });
  });

  // ── C: an outage never touches the order ───────────────────────────────────

  describe('Isolation from the order flow', () => {
    test('C1: if the outbox cannot be written, payment processing still completes', async () => {
      const spy = jest.spyOn(CrmOutbox, 'create').mockRejectedValue(new Error('outbox storage down'));
      const order = await makeOrder();
      const eventId = await razorpayWebhook('payment.captured', order._id);
      spy.mockRestore();

      const after = await Order.findById(order._id);
      expect(after.payment.status).toBe('paid');
      expect(after.status).toBe('paid');
      expect((await WebhookEvent.findOne({ eventId })).status).toBe('completed');
    });

    test('C2: recordOrderEvent never throws, whatever it is given', async () => {
      for (const order of [null, undefined, {}, { _id: 'x' }, { _id: 'x', payment: { status: 'paid' } }]) {
        await expect(crmEventService.recordOrderEvent('order.confirmed', order)).resolves.toEqual(expect.any(String));
      }
      const paid = await makeOrder({ payment: { status: 'paid' } });
      await expect(crmEventService.recordOrderEvent('order.exploded', paid)).resolves.toBe('ignored');
    });

    test('C3: with the CRM down, the order stays paid and the event waits', async () => {
      const order = await makeOrder();
      await razorpayWebhook('payment.captured', order._id);
      const crm = fakeCrm(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }));
      const summary = await crmOutboxWorker.runOneTick(crm);

      expect(summary).toMatchObject({ sent: 0, retried: 1, dead: 0 });
      const row = await CrmOutbox.findOne();
      expect(row.status).toBe('pending');
      expect(row.attemptCount).toBe(1);
      expect(row.nextRetryAt.getTime()).toBeGreaterThan(Date.now() + 30_000);
      expect(row.lastError).toMatch(/ECONNREFUSED/);
      expect((await Order.findById(order._id)).status).toBe('paid');
    });
  });

  // ── D: delivery ────────────────────────────────────────────────────────────

  describe('Outbox worker', () => {
    const paidOrder = () => makeOrder({ status: 'paid', payment: { status: 'paid' } });
    const due = () => CrmOutbox.updateMany({ status: 'pending' }, { $set: { nextRetryAt: new Date(Date.now() - 1000) } });

    test('D1: delivers with a signature the CRM can verify, to the configured address', async () => {
      await crmEventService.recordOrderEvent('order.confirmed', await paidOrder());
      const crm = fakeCrm({ status: 200 });
      expect(await crmOutboxWorker.runOneTick(crm)).toMatchObject({ sent: 1 });

      const [call] = crm.calls;
      expect(call.url).toBe(CRM_URL);
      const timestamp = call.headers['X-VTECH-Timestamp'];
      expect(Math.abs(Date.now() / 1000 - Number(timestamp))).toBeLessThan(5);
      const expected = `sha256=${crypto.createHmac('sha256', CRM_SECRET).update(`${timestamp}.${call.body}`).digest('hex')}`;
      expect(call.headers['X-VTECH-Signature']).toBe(expected);
      expect(JSON.parse(call.body).type).toBe('order.confirmed');
      expect(JSON.stringify(call.headers)).not.toContain(CRM_SECRET);

      const row = await CrmOutbox.findOne();
      expect(row.status).toBe('sent');
      expect(row.sentAt).toBeInstanceOf(Date);
    });

    test('D2: a delivered event is not delivered again', async () => {
      await crmEventService.recordOrderEvent('order.confirmed', await paidOrder());
      const crm = fakeCrm({ status: 200 });
      await crmOutboxWorker.runOneTick(crm);
      await crmOutboxWorker.runOneTick(crm);
      expect(crm.calls).toHaveLength(1);
    });

    test('D3: a timeout or 5xx is retried with growing delays, then succeeds once the CRM is back', async () => {
      await crmEventService.recordOrderEvent('order.confirmed', await paidOrder());
      const crm = fakeCrm(Object.assign(new Error('timeout of 10000ms exceeded'), { code: 'ECONNABORTED' }), { status: 503 }, { status: 200 });

      await crmOutboxWorker.runOneTick(crm);
      const first = (await CrmOutbox.findOne()).nextRetryAt.getTime() - Date.now();
      // Not due yet: a second tick right away must not call the CRM
      await crmOutboxWorker.runOneTick(crm);
      expect(crm.calls).toHaveLength(1);

      await due();
      await crmOutboxWorker.runOneTick(crm);
      const second = (await CrmOutbox.findOne()).nextRetryAt.getTime() - Date.now();
      expect(second).toBeGreaterThan(first);

      await due();
      expect(await crmOutboxWorker.runOneTick(crm)).toMatchObject({ sent: 1 });
      const row = await CrmOutbox.findOne();
      expect(row).toMatchObject({ status: 'sent', attemptCount: 3 });
      // Every attempt sent the same event id, which is what lets the CRM drop duplicates
      expect(new Set(crm.calls.map((c) => JSON.parse(c.body).eventId)).size).toBe(1);
    });

    test('D4: gives up after the maximum number of attempts', async () => {
      await crmEventService.recordOrderEvent('order.confirmed', await paidOrder());
      const crm = fakeCrm({ status: 500 });
      for (let i = 0; i < crmOutboxWorker.MAX_ATTEMPTS + 2; i++) {
        await due();
        await crmOutboxWorker.runOneTick(crm);
      }
      expect(crm.calls).toHaveLength(crmOutboxWorker.MAX_ATTEMPTS);
      expect((await CrmOutbox.findOne()).status).toBe('dead');
    });

    test('D5: an event the CRM refuses outright (401, 422) is not retried', async () => {
      await crmEventService.recordOrderEvent('order.confirmed', await paidOrder());
      const crm = fakeCrm({ status: 422 });
      expect(await crmOutboxWorker.runOneTick(crm)).toMatchObject({ dead: 1 });
      await due();
      await crmOutboxWorker.runOneTick(crm);
      expect(crm.calls).toHaveLength(1);
    });

    test('D6: refuses to post to a non-https address', async () => {
      process.env.CRM_EVENTS_URL = 'http://crm.example.test/api/webhooks/shop';
      await crmEventService.recordOrderEvent('order.confirmed', await paidOrder());
      const crm = fakeCrm({ status: 200 });
      await crmOutboxWorker.runOneTick(crm);
      expect(crm.calls).toHaveLength(0);
      expect((await CrmOutbox.findOne()).status).toBe('pending');
    });

    test('D7: an event stuck in "processing" after a crash is picked up again', async () => {
      await crmEventService.recordOrderEvent('order.confirmed', await paidOrder());
      await CrmOutbox.updateMany({}, { $set: { status: 'processing', claimedAt: new Date(Date.now() - 10 * 60 * 1000) } });
      const crm = fakeCrm({ status: 200 });
      expect(await crmOutboxWorker.runOneTick(crm)).toMatchObject({ sent: 1 });
    });

    test('D8: shipped, delivered and cancelled are separate events, each recorded once', async () => {
      const order = await paidOrder();
      for (const type of ['order.shipped', 'order.shipped', 'order.delivered', 'order.cancelled', 'order.delivered']) {
        await crmEventService.recordOrderEvent(type, order);
      }
      expect((await CrmOutbox.find().lean()).map((r) => r.type).sort()).toEqual(['order.cancelled', 'order.delivered', 'order.shipped']);
    });
  });

  // ── D2: status changes made by staff, and the old direct sender ────────────

  describe('Status changes and the direct WhatsApp sender', () => {
    let adminToken;
    beforeEach(async () => {
      const admin = await User.create({ name: 'Admin', email: 'admin-crm2@test.com', password: await hashPassword('password123456'), role: 'admin', emailVerified: true });
      adminToken = generateAccessToken(admin._id, 'admin');
    });
    const setStatus = (order, status) =>
      request(app).put(`/api/admin/orders/${order._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status });

    test('F1: on a paid order, delivered and cancelled each record one event; packed records none', async () => {
      const order = await makeOrder({ status: 'paid', payment: { status: 'paid' } });
      expect((await setStatus(order, 'packed')).status).toBe(200);
      expect(await CrmOutbox.countDocuments()).toBe(0);
      expect((await setStatus(order, 'delivered')).status).toBe(200);
      expect((await setStatus(order, 'delivered')).status).toBe(200);
      expect((await CrmOutbox.find().lean()).map((r) => r.type)).toEqual(['order.delivered']);
    });

    test('F2: the same status changes on a never-paid order record nothing', async () => {
      const order = await makeOrder();
      for (const status of ['paid', 'shipped', 'delivered', 'cancelled']) await setStatus(order, status);
      expect(await CrmOutbox.countDocuments()).toBe(0);
    });

    test('F3: WHATSAPP_DIRECT_ENABLED=false silences the old direct sender; unset keeps it as it was', async () => {
      const send = async (flag) => {
        let post;
        const saved = { ...process.env };
        process.env.WHATSAPP_PHONE_NUMBER_ID = '1055';
        process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
        if (flag === undefined) delete process.env.WHATSAPP_DIRECT_ENABLED;
        else process.env.WHATSAPP_DIRECT_ENABLED = flag;
        await jest.isolateModulesAsync(async () => {
          jest.doMock('axios', () => ({ post: jest.fn().mockResolvedValue({ data: {} }) }));
          post = require('axios').post;
          await require('../../services/whatsappService').sendOrderConfirmation('9876500011', 'Kavya', 'VT-1', 1000);
        });
        jest.dontMock('axios');
        for (const key of ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_DIRECT_ENABLED']) {
          if (saved[key] === undefined) delete process.env[key];
          else process.env[key] = saved[key];
        }
        return post.mock.calls.length;
      };
      expect(await send('false')).toBe(0);
      expect(await send(undefined)).toBe(1);
      expect(await send('true')).toBe(1);
    });
  });

  // ── E: marketing consent at checkout ───────────────────────────────────────

  describe('Checkout marketing consent', () => {
    let token;
    let productId;

    beforeEach(async () => {
      const user = await User.create({ name: 'Consent User', email: 'consent@test.com', password: await hashPassword('password123456'), emailVerified: true });
      token = generateAccessToken(user._id, 'customer');
      const vendorUser = await User.create({ name: 'Vendor', email: 'consent-vendor@test.com', password: await hashPassword('password123456'), role: 'vendor', emailVerified: true });
      const vendor = await Vendor.create({ userId: vendorUser._id, storeName: 'Consent Store', slug: 'consent-store', status: 'active' });
      const product = await Product.create({ vendorId: vendor._id, title: 'Consent Product', slug: 'consent-product', description: 'Test', price: 100, stock: 50, sku: 'CONSENT-1', published: true });
      productId = product._id;
    });

    const checkout = (extra) =>
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ productId, qty: 1 }],
          shipTo: { fullName: 'John Doe', phone: '9876500022', addressLine1: '123 Main St', city: 'Test City', state: 'Test State', zipCode: '12345', country: 'IN' },
          shippingMethod: 'standard',
          paymentMethod: 'razorpay',
          ...extra,
        });

    const savedOrder = async (res) => Order.findById(res.body.data.vendorOrders[0]._id);

    test('E1: a ticked box is stored with time, source and policy version', async () => {
      const before = Date.now();
      const res = await checkout({ marketingConsent: { whatsappOffers: true } });
      expect(res.status).toBe(201);
      const consent = (await savedOrder(res)).marketingConsent.whatsapp;
      expect(consent.optedIn).toBe(true);
      expect(consent.source).toBe('checkout_whatsapp_offers_checkbox');
      expect(consent.policyVersion).toEqual(expect.any(String));
      expect(consent.at.getTime()).toBeGreaterThanOrEqual(before - 1000);
    });

    test('E2: an unticked box is stored as a "no" and never becomes an opt-in', async () => {
      const res = await checkout({ marketingConsent: { whatsappOffers: false } });
      expect(res.status).toBe(201);
      const order = await savedOrder(res);
      expect(order.marketingConsent.whatsapp.optedIn).toBe(false);

      order.payment.status = 'paid';
      expect(crmEventService.buildPayload('order.confirmed', order)).not.toHaveProperty('marketingConsent');
    });

    test('E3: a request without the field stores no consent at all', async () => {
      const res = await checkout({});
      expect(res.status).toBe(201);
      const order = await savedOrder(res);
      expect(order.marketingConsent?.whatsapp?.optedIn).toBeUndefined();
      order.payment.status = 'paid';
      expect(crmEventService.buildPayload('order.confirmed', order)).not.toHaveProperty('marketingConsent');
    });

    test('E4: anything that is not a real true/false is refused and creates no order', async () => {
      for (const value of ['true', 'yes', 1, 'on', null, {}, [true]]) {
        const res = await checkout({ marketingConsent: { whatsappOffers: value } });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_MARKETING_CONSENT');
      }
      for (const value of ['true', true, 1, []]) {
        const res = await checkout({ marketingConsent: value });
        expect(res.status).toBe(400);
      }
      expect(await Order.countDocuments({ 'shipTo.phone': '9876500022' })).toBe(0);
    });

    test('E5: the client cannot supply its own timestamp, source or policy version', async () => {
      const res = await checkout({ marketingConsent: { whatsappOffers: true, at: '2001-01-01T00:00:00Z', source: 'forged', policyVersion: 'forged' } });
      expect(res.status).toBe(201);
      const consent = (await savedOrder(res)).marketingConsent.whatsapp;
      expect(consent.source).toBe('checkout_whatsapp_offers_checkbox');
      expect(consent.policyVersion).not.toBe('forged');
      expect(consent.at.getFullYear()).toBeGreaterThan(2020);
    });

    test('E6: consent reaches the CRM only with the confirmed order, only after payment, only when ticked', async () => {
      const res = await checkout({ marketingConsent: { whatsappOffers: true } });
      const order = await savedOrder(res);
      // Created but unpaid: nothing recorded
      expect(await CrmOutbox.countDocuments()).toBe(0);

      await razorpayWebhook('payment.captured', order._id);
      const row = await CrmOutbox.findOne({ type: 'order.confirmed' }).lean();
      expect(row.payload.marketingConsent).toMatchObject({ optedIn: true, source: 'checkout_whatsapp_offers_checkbox' });
      expect(new Date(row.payload.marketingConsent.at).getTime()).toBe(order.marketingConsent.whatsapp.at.getTime());

      const paid = await Order.findById(order._id);
      expect(crmEventService.buildPayload('order.shipped', paid)).not.toHaveProperty('marketingConsent');
    });

    test('E7: the order update is sent whether or not the box was ticked', async () => {
      const res = await checkout({ marketingConsent: { whatsappOffers: false } });
      const order = await savedOrder(res);
      await razorpayWebhook('payment.captured', order._id);
      const row = await CrmOutbox.findOne({ type: 'order.confirmed' }).lean();
      expect(row).toBeTruthy();
      expect(row.payload).not.toHaveProperty('marketingConsent');
    });
  });
});
