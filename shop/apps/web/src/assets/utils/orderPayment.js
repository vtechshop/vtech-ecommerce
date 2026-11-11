const PAID_PAYMENT = ['paid', 'captured'];
const NOT_PAID_PAYMENT = ['pending', 'failed', 'refunded'];
const PAID_STATUS = ['paid', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

/** Same rule as the API: the payment status decides whether an order counts as paid. */
export const isOrderPaid = (order) => {
  const p = order?.payment?.status;
  if (PAID_PAYMENT.includes(p)) return true;
  if (NOT_PAID_PAYMENT.includes(p)) return false;
  return PAID_STATUS.includes(order?.status);
};

// Invoices are approved by the admin from this date (older orders were filed by hand).
const INVOICE_APPROVAL_START = new Date('2026-11-11T00:00:00+05:30');

/** Paid order that still waits for the admin to generate its tax invoice. */
export const needsInvoiceApproval = (order) => {
  if (!order || order.invoiceNumber || !isOrderPaid(order)) return false;
  const when = order.payment?.paidAt || order.createdAt;
  return Boolean(when) && new Date(when) >= INVOICE_APPROVAL_START;
};
