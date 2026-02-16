// FILE: apps/web/src/components/cart/CartDrawer.jsx
import { useSelector, useDispatch } from 'react-redux';
import { removeCartItem, clearCart, updateCartItem } from '@/store/slices/cartSlice';
import { useNavigate, Link } from 'react-router-dom';
import Button from '@/components/common/Button';
import { formatCurrency } from '@/utils/format';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';
import { X, ShoppingCart, Trash2, CheckCircle, Minus, Plus } from 'lucide-react';

const CartDrawer = ({ isOpen, onClose, justAdded }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, totals, lastAddedProductId, loading } = useSelector((state) => state.cart);

  // Find the just-added item by matching productId
  const justAddedItem = justAdded && lastAddedProductId
    ? items.find((item) =>
        item.productId === lastAddedProductId ||
        item.product === lastAddedProductId ||
        item.product?._id === lastAddedProductId
      )
    : null;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const handleRemove = (itemId) => {
    dispatch(removeCartItem(itemId));
  };

  const handleUpdateQty = (itemId, newQty) => {
    if (newQty < 1) return;
    dispatch(updateCartItem({ itemId, quantity: newQty }));
  };

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      dispatch(clearCart());
    }
  };

  // Check if an item is the one just added
  const isJustAdded = (item) => {
    if (!lastAddedProductId) return false;
    return (
      item.productId === lastAddedProductId ||
      item.product === lastAddedProductId ||
      item.product?._id === lastAddedProductId
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity modal-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform flex flex-col toast-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
            <span className="bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              {items.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Added to Cart confirmation banner with item details */}
        {justAdded && (
          <div className="bg-green-50 border-b border-green-200 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm font-bold text-green-800">Added to Cart</span>
            </div>
            {justAddedItem && (
              <div className="flex gap-3">
                <img
                  src={justAddedItem.image || PLACEHOLDER_IMAGE_SM}
                  alt={justAddedItem.name}
                  className="w-12 h-12 object-cover rounded border border-green-200"
                  onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{justAddedItem.name}</p>
                  <p className="text-sm text-gray-600">
                    Qty: {justAddedItem.qty} &middot; {formatCurrency((justAddedItem.priceSnapshot || justAddedItem.price || 0) * justAddedItem.qty)}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-2 text-xs text-green-700 font-medium">
              Cart subtotal ({items.reduce((sum, i) => sum + i.qty, 0)} items): {formatCurrency(totals.subtotal)}
            </div>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-700 mb-4">Your cart is empty</p>
              <Button onClick={onClose} variant="outline">
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const itemIsJustAdded = justAdded && isJustAdded(item);
                return (
                  <div
                    key={item._id}
                    className={`flex gap-3 p-3 border rounded-lg transition-all ${
                      itemIsJustAdded
                        ? 'border-green-400 bg-green-50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <Link
                      to={`/product/${item.productSlug}`}
                      onClick={onClose}
                      className="flex-shrink-0"
                    >
                      <img
                        src={item.image || PLACEHOLDER_IMAGE_SM}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                        onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate text-gray-900">
                        {item.name}
                      </h3>
                      {item.variant && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {typeof item.variant === 'string'
                            ? JSON.parse(item.variant).join(', ')
                            : Object.values(item.variant).join(', ')}
                        </p>
                      )}
                      {/* Qty controls + Price */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-300 rounded">
                          <button
                            onClick={() => handleUpdateQty(item._id, item.qty - 1)}
                            disabled={item.qty <= 1 || loading}
                            className="px-1.5 py-0.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 py-0.5 text-xs font-medium min-w-[24px] text-center border-x border-gray-300">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(item._id, item.qty + 1)}
                            disabled={loading}
                            className="px-1.5 py-0.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold text-sm">
                          {formatCurrency((item.priceSnapshot || item.price || 0) * item.qty)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(item._id)}
                      className="text-red-500 hover:text-red-700 p-1 h-fit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {items.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-sm text-red-600 hover:text-red-700 underline w-full text-center py-2"
                >
                  Clear Cart
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal ({items.reduce((sum, i) => sum + i.qty, 0)} items)</span>
                <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="font-semibold">
                  {totals.shipping === 0 ? 'FREE' : formatCurrency(totals.shipping)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              variant="primary"
              className="w-full"
            >
              Proceed to Checkout
            </Button>

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Continue Shopping
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
