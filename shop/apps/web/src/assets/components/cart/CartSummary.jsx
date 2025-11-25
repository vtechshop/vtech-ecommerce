// FILE: apps/web/src/components/cart/CartSummary.jsx
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/common/Button';
import { formatCurrency } from '@/utils/format';

const CartSummary = () => {
  const navigate = useNavigate();
  const { totals, items } = useSelector((state) => state.cart);

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
      <h2 className="text-xl font-bold mb-4">Order Summary</h2>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-700">Subtotal ({items.length} items)</span>
          <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-700">Shipping</span>
          <span className="font-semibold">
            {totals.shipping === 0 ? 'FREE' : formatCurrency(totals.shipping)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-700">Tax</span>
          <span className="font-semibold">{formatCurrency(totals.tax)}</span>
        </div>

        {totals.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span className="font-semibold">-{formatCurrency(totals.discount)}</span>
          </div>
        )}

        <div className="border-t pt-3 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatCurrency(totals.total)}</span>
        </div>
      </div>

      <Button
        onClick={handleCheckout}
        variant="primary"
        className="w-full"
        disabled={items.length === 0}
      >
        Proceed to Checkout
      </Button>

      <p className="text-xs text-gray-700 text-center mt-4">
        Taxes and shipping calculated at checkout
      </p>
    </div>
  );
};

export default CartSummary;