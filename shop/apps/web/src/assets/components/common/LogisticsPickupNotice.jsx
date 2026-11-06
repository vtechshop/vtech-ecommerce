import { AlertTriangle } from 'lucide-react';

export const LOGISTICS_PICKUP_TEXT =
  'This product will be delivered to the nearest logistics office. Please collect it in person by presenting your LR (Lorry Receipt).';

/** True when the product (or a cart item's populated product) cannot ship by Delhivery door delivery. */
export const needsLogisticsPickup = (productOrItem) => {
  const p = productOrItem?.productId && typeof productOrItem.productId === 'object' ? productOrItem.productId : productOrItem;
  return p?.delhiveryEnabled === false;
};

/**
 * Amber "Important" box for products that are sent by lorry to a logistics office.
 * compact: smaller version for cart and checkout item rows.
 */
export default function LogisticsPickupNotice({ compact = false, title, className = '' }) {
  return (
    <div
      role="note"
      className={`flex gap-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 ${compact ? 'p-2 text-xs' : 'p-3 text-sm'} ${className}`}
    >
      <AlertTriangle className={`flex-shrink-0 text-amber-600 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} aria-hidden="true" />
      <p className="leading-snug">
        <span className="font-bold">{title || 'Important – Delivery Notice:'}</span> {LOGISTICS_PICKUP_TEXT}
      </p>
    </div>
  );
}
