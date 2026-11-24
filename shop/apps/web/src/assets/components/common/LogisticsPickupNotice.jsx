import { AlertTriangle } from 'lucide-react';

export const LOGISTICS_PICKUP_TEXT =
  'This product will be delivered to the nearest logistics office. Please collect it in person by presenting your LR (Lorry Receipt).';

/** True when the product (or a cart item's populated product) cannot ship by Delhivery door delivery. */
export const needsLogisticsPickup = (productOrItem) => {
  const p = productOrItem?.productId && typeof productOrItem.productId === 'object' ? productOrItem.productId : productOrItem;
  return p?.delhiveryEnabled === false;
};

export const ORDER_PICKUP_TEXT =
  'Your whole order will be sent together to the nearest logistics office, including items that are usually delivered to your door. Please collect it in person by presenting your LR (Lorry Receipt).';

/**
 * Whole-order view of a cart: when any item goes to a logistics office, everything ships with it.
 * mixed: the cart also has items that on their own would be delivered to the door.
 */
export const orderLogisticsPickup = (items = []) => {
  const pickupItems = items.filter(needsLogisticsPickup);
  const required = pickupItems.length > 0;
  const mixed = required && pickupItems.length < items.length;
  return {
    required,
    mixed,
    title: mixed ? `Important – Delivery Notice (${pickupItems.map(i => i.name).join(', ')} in your order):` : undefined,
    text: mixed ? ORDER_PICKUP_TEXT : undefined,
  };
};

/**
 * Amber "Important" box for products that are sent by lorry to a logistics office.
 * compact: smaller version for cart and checkout item rows.
 */
export default function LogisticsPickupNotice({ compact = false, title, text, className = '' }) {
  return (
    <div
      role="note"
      className={`flex gap-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 ${compact ? 'p-2 text-xs' : 'p-3 text-sm'} ${className}`}
    >
      <AlertTriangle className={`flex-shrink-0 text-amber-600 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} aria-hidden="true" />
      <p className="leading-snug">
        <span className="font-bold">{title || 'Important – Delivery Notice:'}</span> {text || LOGISTICS_PICKUP_TEXT}
      </p>
    </div>
  );
}
