// FILE: apps/web/src/pages/Cart.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { updateCartItem, removeCartItem, loadCart } from '@/store/slices/cartSlice';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import Button from '@/components/common/Button';
import AdBanner from '@/components/common/AdBanner';
import ShinyButton from '@/components/animations/ShinyButton';
import { formatCurrency } from '@/utils/format';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

const Cart = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, totals, loading } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(loadCart());
  }, [dispatch]);

  const handleUpdateQuantity = (itemId, newQty) => {
    if (newQty < 1) return;
    dispatch(updateCartItem({ itemId, quantity: newQty }));
  };

  const handleRemoveItem = (itemId) => {
    dispatch(removeCartItem(itemId));
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl py-6">
          <div className="mb-6">
            <div className="h-10 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-20 h-20 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 w-1/4 bg-gray-200 rounded mb-3"></div>
                      <div className="h-8 w-32 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border p-6 animate-pulse">
                <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-10 w-full bg-gray-200 rounded mt-4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white min-h-screen">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-12">
          <div className="max-w-xl mx-auto text-center bg-white rounded-lg border p-12 fade-in scale-in">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 empty-state-icon">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-gray-900 fade-in-down">Your cart is empty</h1>
            <p className="text-gray-700 mb-6 fade-in stagger-1">Start shopping to add items to your cart!</p>
            <Link to="/search" className="fade-in stagger-2">
              <button className="px-4 py-2 sm:px-6 sm:py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors inline-flex items-center gap-2 text-sm sm:text-base btn-scale hover-lift">
                Continue Shopping
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        {/* Ad Banner - Top of Cart */}
        <AdBanner placement="cart_top" position="top" className="mb-6 md:mb-8 fade-in" />

        {/* Header */}
        <div className="mb-6 md:mb-8 fade-in-down">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-700 mt-1">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item, index) => (
              <div
                key={item._id}
                className={`cart-item bg-white rounded-lg border overflow-hidden hover-lift transition-all duration-300 fade-in stagger-${Math.min(index + 1, 6)}`}
                data-cy="cart-item"
              >
                <div className="p-4 flex gap-3">
                  {/* Image */}
                  <Link to={`/product/${item.productSlug}`} className="flex-shrink-0">
                    <div className="w-20 h-20 bg-blue-100 rounded overflow-hidden border">
                      <img
                        src={item.image || PLACEHOLDER_IMAGE_SM}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                      />
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.productSlug}`}
                      className="text-base font-semibold text-gray-900 hover:text-gray-600 line-clamp-2"
                    >
                      {item.name}
                    </Link>

                    {item.variant && (
                      <p className="text-xs text-gray-700 mt-1 bg-blue-100 inline-block px-2 py-1 rounded">
                        {typeof item.variant === 'string'
                          ? JSON.parse(item.variant).join(', ')
                          : Object.values(item.variant).join(', ')}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-300 rounded">
                        <button
                          onClick={() => handleUpdateQuantity(item._id, item.qty - 1)}
                          className="px-2 py-1 hover:bg-blue-100"
                          disabled={item.qty <= 1}
                        >
                          <Minus className="w-4 h-4 text-gray-700" />
                        </button>
                        <input
                          type="number"
                          name="qty"
                          value={item.qty}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value) && value > 0) {
                              handleUpdateQuantity(item._id, value);
                            }
                          }}
                          className="w-14 text-center py-1 font-semibold text-gray-900 text-sm border-0 focus:outline-none focus:ring-0"
                          min="1"
                        />
                        <button
                          onClick={() => handleUpdateQuantity(item._id, item.qty + 1)}
                          className="px-2 py-1 hover:bg-blue-100"
                        >
                          <Plus className="w-4 h-4 text-gray-700" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency((item.priceSnapshot || item.price || 0) * item.qty)}
                        </p>
                        <p className="text-xs text-gray-500" data-cy="item-price">
                          {formatCurrency(item.priceSnapshot || item.price || 0)} each
                        </p>
                        {item.taxIncluded ? (
                          <p className="text-xs text-green-600 font-medium mt-0.5">
                            Tax Included
                          </p>
                        ) : item.taxable && item.taxRate > 0 ? (
                          <p className="text-xs text-blue-600 font-medium mt-0.5">
                            +{item.taxRate}% Tax
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      className="mt-3 text-red-600 hover:text-red-700 font-medium text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary and Ads */}
          <div className="lg:col-span-1 space-y-6">
            {/* Ad Banner - Sidebar */}
            <AdBanner placement="cart_sidebar" position="right" className="sticky top-4" />

            <div className="bg-white rounded-lg border p-5 sticky top-4 fade-in-right hover-lift">
              <h2 className="text-lg font-bold text-gray-900 mb-4 fade-in-down">Order Summary</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="font-semibold" data-cy="subtotal">{formatCurrency(totals.subtotal)}</span>
                </div>

                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span className="font-semibold">-{formatCurrency(totals.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm text-gray-700">
                  <span>Shipping</span>
                  <span className="font-semibold">
                    {totals.shipping === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      formatCurrency(totals.shipping)
                    )}
                  </span>
                </div>

                {totals.tax > 0 && (
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Tax</span>
                    <span className="font-semibold">{formatCurrency(totals.tax)}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 mb-4 fade-in stagger-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900 price-highlight">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>

              <ShinyButton
                onClick={handleCheckout}
                variant="primary"
                size="md"
                className="w-full mb-3 fade-in stagger-2"
              >
                Proceed to Checkout
              </ShinyButton>

              <Link to="/search">
                <button className="w-full bg-blue-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors btn-scale fade-in stagger-3" data-testid="continue-shopping-btn">
                  Continue Shopping
                </button>
              </Link>

              {/* Trust Badges */}
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Secure Checkout</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Free Returns within 30 days</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Fast & Free Shipping over ₹500</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ad Banner - Bottom of Cart */}
        <div className="mt-8">
          <AdBanner placement="cart_bottom" position="bottom" />
        </div>
      </div>
    </div>
  );
};

export default Cart;
