// Same rule as the API (api/src/utils/returnWindow.js): returns up to 7 days after delivery.
export const RETURN_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export function returnWindowEndsAt(order) {
  let at = order?.shipment?.deliveredAt ? new Date(order.shipment.deliveredAt) : null;
  if (!at) {
    const events = (order?.events || []).filter(e => e.status === 'delivered' && e.timestamp);
    if (events.length) at = new Date(events[events.length - 1].timestamp);
  }
  return at ? new Date(at.getTime() + RETURN_WINDOW_DAYS * DAY_MS) : null;
}
