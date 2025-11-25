// FILE: apps/web/src/pages/Checkout.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/utils/api';
import { clearCart } from '@/store/slices/cartSlice';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Spinner from '@/components/common/Spinner';
import AdBanner from '@/components/common/AdBanner';
import { formatCurrency } from '@/utils/format';
import { trackBeginCheckout } from '@/utils/analytics';
import { COUNTRIES, DEFAULT_COUNTRY, getStatesForCountry } from '@/utils/locationData';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, totals } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  const [checkoutMode, setCheckoutMode] = useState(user ? 'logged-in' : null); // null, 'guest', 'logged-in'
  const [guestEmail, setGuestEmail] = useState('');
  const [step, setStep] = useState(user ? 1 : 0); // 0: Choose mode, 1: Address, 2: Shipping, 3: Payment
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [newAddress, setNewAddress] = useState({
    fullName: '',
    phone: '',
    email: '', // For guest checkout
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: DEFAULT_COUNTRY, // 'IN' for India
  });
  const [shippingMethod, setShippingMethod] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    // If logged in, skip mode selection
    if (user && checkoutMode === null) {
      setCheckoutMode('logged-in');
      setStep(1);
    }

    trackBeginCheckout({ items, totals });
  }, [items, totals, user, navigate, checkoutMode]);

  // Dynamically get states based on selected country
  const availableStates = useMemo(() => {
    return getStatesForCountry(newAddress.country);
  }, [newAddress.country]);

  // Fetch user addresses
  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      if (!user) return [];
      const response = await api.get('/user/addresses');
      return response.data.data;
    },
    enabled: !!user,
  });

  // Fetch shipping quotes
  const { data: shippingQuotes, isLoading: loadingShipping } = useQuery({
    queryKey: ['shipping-quotes'],
    queryFn: async () => {
      const response = await api.post('/checkout/shipping-quotes', {
        items,
      });
      return response.data.data;
    },
    enabled: step >= 2,
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const response = await api.post('/orders', orderData);
      return response.data.data;
    },
    onSuccess: (data) => {
      dispatch(clearCart());
      navigate(`/order-confirmation/${data._id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create order';

      // Show error to user
      alert(`Order failed: ${errorMessage}`);

      // If user is not authenticated, redirect to login
      if (error.response?.status === 401) {
        navigate('/login?redirect=/checkout');
      }
    },
  });

  const handleGuestCheckout = () => {
    setCheckoutMode('guest');
    setStep(1);
  };

  const handleLoginCheckout = () => {
    navigate('/login?redirect=/checkout');
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();

    // For guest checkout, validate email
    if (checkoutMode === 'guest' && !newAddress.email) {
      return;
    }

    setSelectedAddress(newAddress);
    setStep(2);
  };

  const handleSelectExistingAddress = (address) => {
    setSelectedAddress(address);
    setStep(2);
  };

  const handleShippingSubmit = () => {
    if (!shippingMethod) {
      // Don't show alert, just return
      return;
    }
    setStep(3);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    const orderData = {
      items: items.map(item => ({
        productId: item.productId || item._id,
        variantId: item.variantId,
        qty: item.qty || item.quantity,
      })),
      shipTo: selectedAddress,
      shippingMethod: shippingMethod.id,
      paymentMethod,
      paymentDetails: {},
      ...(checkoutMode === 'guest' && { guestEmail: newAddress.email }),
    };

    createOrderMutation.mutate(orderData);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 max-w-screen-2xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-700 text-sm mt-1">Complete your purchase securely</p>
        </div>

        {/* Ad Banner - Top of Checkout */}
        <AdBanner placement="checkout_top" position="top" className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checkout Steps */}
          <div className="lg:col-span-2">
            {/* Step 0: Choose Checkout Mode (Guest only) */}
            {step === 0 && !user && (
              <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-bold mb-4 text-center">How would you like to checkout?</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Guest Checkout */}
                <button
                  onClick={handleGuestCheckout}
                  className="p-5 border-2 border-gray-300 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors group"
                >
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 group-hover:bg-primary-100 rounded-full flex items-center justify-center">
                      <svg className="w-7 h-7 text-gray-700 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold mb-1 group-hover:text-gray-600">Guest Checkout</h3>
                    <p className="text-gray-700 text-xs">Checkout quickly without an account</p>
                  </div>
                </button>

                {/* Login/Register */}
                <button
                  onClick={handleLoginCheckout}
                  className="p-5 border-2 border-gray-300 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-colors group"
                >
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 group-hover:bg-primary-100 rounded-full flex items-center justify-center">
                      <svg className="w-7 h-7 text-gray-700 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold mb-1 group-hover:text-gray-600">Login / Register</h3>
                    <p className="text-gray-700 text-xs">Save your info for faster checkout</p>
                  </div>
                </button>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  Guest checkout is fast and secure. You'll receive order updates via email.
                </p>
              </div>
            </div>
          )}

          {/* Progress Steps */}
          {step > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between">
                {[
                  { num: 1, label: 'Address' },
                  { num: 2, label: 'Shipping' },
                  { num: 3, label: 'Payment' },
                ].map((s, index) => (
                <div key={s.num} className="flex items-center flex-1">
                  <div className={`flex items-center ${index > 0 ? 'flex-1' : ''}`}>
                    {index > 0 && (
                      <div
                        className={`flex-1 h-1 ${
                          step > s.num - 1 ? 'bg-primary-600' : 'bg-gray-300'
                        }`}
                      />
                    )}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        step >= s.num
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}
                    >
                      {s.num}
                    </div>
                  </div>
                  <span className={`ml-2 ${step >= s.num ? 'text-gray-900' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
            </div>
          )}

          {/* Step 1: Address */}
          {step === 1 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4">Shipping Address</h2>

              {/* Existing Addresses */}
              {user && addresses && addresses.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Your Addresses</h3>
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <button
                        key={addr._id}
                        onClick={() => handleSelectExistingAddress(addr)}
                        className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-primary-600 transition-colors"
                      >
                        <p className="font-medium">{addr.fullName}</p>
                        <p className="text-sm text-gray-700">
                          {addr.addressLine1}
                          {addr.addressLine2 && `, ${addr.addressLine2}`}
                        </p>
                        <p className="text-sm text-gray-700">
                          {addr.city}, {addr.state} {addr.zipCode}
                        </p>
                        <p className="text-sm text-gray-700">{addr.phone}</p>
                      </button>
                    ))}
                  </div>
                  <div className="my-6 text-center text-gray-500">OR</div>
                </div>
              )}

              {/* New Address Form */}
              <form onSubmit={handleAddressSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email field for guest checkout */}
                  {checkoutMode === 'guest' && (
                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      required
                      fullWidth
                      className="md:col-span-2"
                      value={newAddress.email}
                      onChange={(e) => setNewAddress({ ...newAddress, email: e.target.value })}
                      placeholder="We'll send your order confirmation here"
                    />
                  )}
                  <Input
                    label="Full Name"
                    name="fullName"
                    required
                    value={newAddress.fullName}
                    onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                  />
                  <Input
                    label="Phone"
                    name="phone"
                    type="tel"
                    required
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  />
                  <Input
                    label="Address Line 1"
                    name="address"
                    required
                    fullWidth
                    className="md:col-span-2"
                    value={newAddress.addressLine1}
                    onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                  />
                  <Input
                    label="Address Line 2 (Optional)"
                    name="addressLine2"
                    fullWidth
                    className="md:col-span-2"
                    value={newAddress.addressLine2}
                    onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })}
                  />
                  <Input
                    label="City"
                    name="city"
                    required
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  />
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State/Province <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="state"
                      name="state"
                      required
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      disabled={!newAddress.country}
                    >
                      <option value="">
                        {!newAddress.country ? 'Select country first' : 'Select State/Province'}
                      </option>
                      {availableStates.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="ZIP/Postal Code"
                    name="zipCode"
                    required
                    value={newAddress.zipCode}
                    onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                  />
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="country"
                      name="country"
                      required
                      value={newAddress.country}
                      onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value, state: '' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country.value} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button type="submit" variant="primary" size="lg" className="mt-6">
                  Continue to Shipping
                </Button>
              </form>
            </div>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4">Shipping Method</h2>

              {loadingShipping ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : shippingQuotes && shippingQuotes.length > 0 ? (
                <div className="space-y-3">
                  {shippingQuotes.map((quote) => (
                    <button
                      key={quote.id}
                      onClick={() => setShippingMethod(quote)}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                        shippingMethod?.id === quote.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{quote.name}</p>
                          <p className="text-sm text-gray-700">{quote.description}</p>
                          <p className="text-sm text-gray-700 mt-1">
                            Estimated delivery: {quote.estimatedDays} business days
                          </p>
                        </div>
                        <p className="font-bold text-lg">{formatCurrency(quote.cost)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No shipping methods available</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button onClick={() => setStep(1)} variant="outline">
                  Back
                </Button>
                <Button onClick={handleShippingSubmit} variant="primary" fullWidth>
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4">Payment Method</h2>

              <form onSubmit={handlePaymentSubmit}>
                {/* Payment Method Selection */}
                <div className="mb-6">
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                        paymentMethod === 'card'
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="font-semibold">Credit/Debit Card</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                        paymentMethod === 'upi'
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="font-semibold">UPI</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                        paymentMethod === 'netbanking'
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                        </svg>
                        <span className="font-semibold">Net Banking</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                        paymentMethod === 'cod'
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <div>
                          <span className="font-semibold">Cash on Delivery</span>
                          <p className="text-xs text-gray-700 mt-1">Pay when you receive your order</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Card Details (if card selected) */}
                {paymentMethod === 'card' && (
                  <div className="space-y-4 mb-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Online card payments coming soon!</strong> Please use <strong>Cash on Delivery</strong> for now.
                      </p>
                      <p className="text-xs text-yellow-700 mt-2">
                        To enable card payments, add your Stripe publishable key to the .env file.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="button" onClick={() => setStep(2)} variant="outline">
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={createOrderMutation.isPending}
                  >
                    Place Order
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Order Summary</h2>

            {/* Items */}
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <div key={item._id} className="flex gap-3">
                  <img
                    src={item.image || '/placeholder.png'}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-700">Qty: {item.qty}</p>
                    <p className="text-sm font-semibold">{formatCurrency(item.priceSnapshot)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {shippingMethod && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Shipping:</span>
                  <span>{formatCurrency(shippingMethod.cost)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Tax:</span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(totals.discount)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>
                  {formatCurrency(
                    totals.total + (shippingMethod?.cost || 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Checkout;