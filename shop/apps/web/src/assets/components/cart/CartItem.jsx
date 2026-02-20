// FILE: apps/web/src/components/cart/CartItem.jsx
import { useDispatch } from 'react-redux';
import { updateQuantity, removeFromCart } from '@/store/slices/cartSlice';
import { formatCurrency } from '@/utils/format';
import { normalizeImageUrl } from '@/utils/placeholders';
import { Trash2, Plus, Minus } from 'lucide-react';

const CartItem = ({ item }) => {
  const dispatch = useDispatch();

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;
    if (newQuantity > item.product.stock) {
      alert('Not enough stock available');
      return;
    }
    dispatch(updateQuantity({ id: item.id, quantity: newQuantity }));
  };

  const handleRemove = () => {
    dispatch(removeFromCart(item.id));
  };

  return (
    <div
      className="flex gap-3 p-4 bg-white border-b"
      data-testid="cart-item"
      data-cy="cart-item"
    >
      <img
        src={normalizeImageUrl(item.product.images?.[0])}
        alt={item.product.seo?.title || item.product.title}
        className="w-24 h-24 object-cover rounded"
        data-testid="item-image"
      />

      <div className="flex-1">
        <h3 className="font-semibold" data-testid="item-name">{item.product.title}</h3>
        {item.variant && (
          <p className="text-sm text-gray-700">
            {item.variant.name}: {item.variant.value}
          </p>
        )}
        <p className="text-sm text-gray-700">
          {item.product.brand && `Brand: ${item.product.brand}`}
        </p>

        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center border rounded">
            <button
              onClick={() => handleQuantityChange(item.quantity - 1)}
              className="p-2 hover:bg-gray-100"
              disabled={item.quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-4 font-medium" data-testid="item-quantity">{item.quantity}</span>
            <button
              onClick={() => handleQuantityChange(item.quantity + 1)}
              className="p-2 hover:bg-gray-100"
              disabled={item.quantity >= item.product.stock}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleRemove}
            className="text-red-600 hover:text-red-700 flex items-center gap-1"
            data-testid="remove-item-btn"
            data-cy="remove-item-btn"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Remove</span>
          </button>
        </div>

        {item.quantity === item.product.stock && (
          <p className="text-xs text-orange-600 mt-2">
            Maximum available quantity reached
          </p>
        )}
      </div>

      <div className="text-right">
        <p className="text-lg font-bold text-green-700" data-testid="item-price">
          {formatCurrency(item.product.price * item.quantity)}
        </p>
        {item.product.compareAt && (
          <p className="text-sm text-red-500 line-through">
            {formatCurrency(item.product.compareAt * item.quantity)}
          </p>
        )}
      </div>
    </div>
  );
};

export default CartItem;