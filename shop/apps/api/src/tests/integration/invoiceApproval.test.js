// Tax invoice only when the admin generates it; before that a paid order downloads as an order summary.
const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Order = require('../../models/Order');
const Counter = require('../../models/Counter');
const { hashPassword } = require('../../utils/hash');
const { generateAccessToken } = require('../../utils/jwt');

jest.mock('../../services/notificationService', () => ({
  sendInvoiceEmail: jest.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  notify: jest.fn().mockResolvedValue(true),
}));
const notificationService = require('../../services/notificationService');

let n = 0;
describe('Admin-approved tax invoices', () => {
  let admin, customer, adminToken, customerToken;
  const makeOrder = (over = {}) => Order.create({
    orderId: `TEST-APPROVE-${Date.now()}-${n++}`,
    userId: customer._id,
    status: 'paid',
    items: [{ productId: '507f1f77bcf86cd799439022', qty: 1, priceSnapshot: 500, name: 'Approval Test Product' }],
    totals: { subtotal: 500, tax: 0, shipping: 0, total: 500 },
    shipTo: { fullName: 'Test Customer', phone: '9876543210', line1: '1 Main St', city: 'Chennai', state: 'Tamil Nadu', zip: '600001', country: 'IN' },
    payment: { status: 'captured', paidAt: new Date() },
    ...over,
  });
  const generate = (order) => request(app).post(`/api/admin/orders/${order._id}/invoice`).set('Authorization', `Bearer ${adminToken}`);
  const customerPdf = (order) => request(app).get(`/api/orders/${order._id}/invoice`).set('Authorization', `Bearer ${customerToken}`)
    .buffer(true).parse((res, cb) => { const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => cb(null, Buffer.concat(chunks))); });

  beforeEach(async () => {
    await Counter.deleteMany({});
    admin = await User.create({ name: 'Admin', email: `admin-inv-${n}@test.com`, password: await hashPassword('password123456'), role: 'admin', emailVerified: true });
    customer = await User.create({ name: 'Cust', email: `cust-inv-${n}@test.com`, password: await hashPassword('password123456'), emailVerified: true });
    adminToken = generateAccessToken(admin._id, 'admin');
    customerToken = generateAccessToken(customer._id, 'customer');
    notificationService.sendInvoiceEmail.mockClear();
  });

  it('a paid order has no invoice number until the admin generates it; customer gets an order summary', async () => {
    const order = await makeOrder();
    const res = await customerPdf(order);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain(`Order-Summary-${order.orderId}.pdf`);
    expect((await Order.findById(order._id)).invoiceNumber).toBeUndefined();
    expect(await Counter.countDocuments()).toBe(0);
  });

  it('admin generate gives the next number, emails the customer, and is not repeated', async () => {
    const first = await makeOrder();
    const second = await makeOrder();
    let res = await generate(second);
    expect(res.status).toBe(200);
    expect(res.body.data.invoiceNumber).toBe('W-00001');
    expect(notificationService.sendInvoiceEmail).toHaveBeenCalledTimes(1);
    res = await generate(first);
    expect(res.body.data.invoiceNumber).toBe('W-00002');
    res = await generate(first);
    expect(res.body.data).toMatchObject({ invoiceNumber: 'W-00002', alreadyGenerated: true });
    expect(notificationService.sendInvoiceEmail).toHaveBeenCalledTimes(2);

    const pdf = await customerPdf(first);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-disposition']).toContain('Invoice-W-00002.pdf');
  });

  it('an unpaid order cannot get an invoice', async () => {
    const order = await makeOrder({ status: 'pending_payment', payment: { status: 'pending' } });
    const res = await generate(order);
    expect(res.status).toBe(400);
    expect((await Order.findById(order._id)).invoiceNumber).toBeUndefined();
    expect((await customerPdf(order)).status).toBe(400);
  });

  it('admin edits billing, GSTIN, item name and HSN before generating; locked after', async () => {
    const order = await makeOrder();
    const itemId = order.items[0]._id.toString();
    const edit = (body) => request(app).put(`/api/admin/orders/${order._id}/invoice-details`).set('Authorization', `Bearer ${adminToken}`).send(body);

    let res = await edit({ billTo: { gstin: 'BAD' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_GSTIN');

    res = await edit({
      billTo: { name: 'Ravi', company: 'Ravi Foods Pvt Ltd', gstin: '33abcde1234f1z5', addressLine1: '5 Market Rd', city: 'Madurai', state: 'Tamil Nadu', zipCode: '625001' },
      items: [{ itemId, name: 'Commercial Vegetable Cutter', hsnCode: '8438' }, { itemId: '507f1f77bcf86cd799439099', name: 'not in order' }],
    });
    expect(res.status).toBe(200);
    const saved = (await Order.findById(order._id)).invoiceDetails;
    expect(saved.billTo.gstin).toBe('33ABCDE1234F1Z5');
    expect(saved.items).toHaveLength(1);
    expect(saved.items[0]).toMatchObject({ name: 'Commercial Vegetable Cutter', hsnCode: '8438' });
    // the order's own data is unchanged
    const after = await Order.findById(order._id);
    expect(after.items[0].name).toBe('Approval Test Product');
    expect(after.totals.total).toBe(500);

    // PDF still renders with the edits
    expect((await customerPdf(order)).status).toBe(200);

    expect((await generate(order)).body.data.invoiceNumber).toBe('W-00001');
    res = await edit({ billTo: { name: 'Someone else' } });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVOICE_LOCKED');
    expect((await customerPdf(order)).status).toBe(200);
  });

  it('a customer cannot generate invoices', async () => {
    const order = await makeOrder();
    const res = await request(app).post(`/api/admin/orders/${order._id}/invoice`).set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });
});
