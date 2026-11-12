// Customers can ask for a return up to RETURN_WINDOW_DAYS after delivery (site policy: 7 days).
const RETURN_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** When the order was delivered: the carrier's delivery date, else the last "delivered" event. */
function deliveredAt(order) {
  if (order?.shipment?.deliveredAt) return new Date(order.shipment.deliveredAt);
  const events = (order?.events || []).filter(e => e.status === 'delivered' && e.timestamp);
  return events.length ? new Date(events[events.length - 1].timestamp) : null;
}

/** Last moment a return can be requested, or null when the delivery date is unknown. */
function returnWindowEndsAt(order) {
  const at = deliveredAt(order);
  return at ? new Date(at.getTime() + RETURN_WINDOW_DAYS * DAY_MS) : null;
}

module.exports = { RETURN_WINDOW_DAYS, deliveredAt, returnWindowEndsAt };
