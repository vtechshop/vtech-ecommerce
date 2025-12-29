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
import { formatCurrency } from '@/utils/format';
import { trackBeginCheckout } from '@/utils/analytics';
import { COUNTRIES, DEFAULT_COUNTRY, getStatesForCountry } from '@/utils/locationData';
import { useToast } from '@/components/common/ToastContainer';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { items, totals } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  const [step, setStep] = useState(1); // 1: Address, 2: Payment
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [newAddress, setNewAddress] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: DEFAULT_COUNTRY, // 'IN' for India
  });
  const paymentMethod = 'razorpay'; // Fixed to Razorpay only
  const [saveAddress, setSaveAddress] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');

  // Standard shipping cost (simplified - no shipping selection)
  const SHIPPING_COST = 50; // Flat ₹50 shipping
  const FREE_SHIPPING_THRESHOLD = 500; // Free shipping above ₹500
  const shippingCost = totals.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const ESTIMATED_DELIVERY_DAYS = 5; // 5-7 business days

  useEffect(() => {
    if (orderPlaced) {
      return;
    }

    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    trackBeginCheckout({ items, totals });
  }, [items, totals, navigate, orderPlaced]);

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

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const response = await api.post('/orders', orderData);
      return response.data.data;
    },
    onSuccess: (data) => {
      setOrderPlaced(true);
      const orderId = data.vendorOrders?.[0]?._id || data.orderIds?.[0] || data._id;
      navigate(`/order-confirmation/${orderId}`, { replace: true });
      setTimeout(() => {
        dispatch(clearCart());
      }, 100);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create order';
      toast.error(`Order failed: ${errorMessage}`);
      if (error.response?.status === 401) {
        navigate('/login?redirect=/checkout');
      }
    },
  });

  const validateAddress = () => {
    const errors = {};

    if (!user && !guestEmail?.trim()) {
      errors.guestEmail = 'Email is required for order confirmation';
    } else if (!user && guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      errors.guestEmail = 'Please enter a valid email address';
    }

    if (!newAddress.fullName?.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!newAddress.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{10,15}$/.test(newAddress.phone.trim())) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (!newAddress.addressLine1?.trim()) {
      errors.addressLine1 = 'Address is required';
    }

    if (!newAddress.city?.trim()) {
      errors.city = 'City is required';
    }

    if (!newAddress.state?.trim()) {
      errors.state = 'State is required';
    }

    if (!newAddress.zipCode?.trim()) {
      errors.zipCode = 'ZIP/Postal code is required';
    } else if (!/^[0-9A-Za-z\s-]{4,10}$/.test(newAddress.zipCode.trim())) {
      errors.zipCode = 'Please enter a valid ZIP/Postal code';
    }

    return errors;
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();

    const errors = validateAddress();

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    if (saveAddress && user) {
      try {
        await api.post('/user/addresses', newAddress);
        toast.success('Address saved to your account');
      } catch {
        // Silent failure acceptable
      }
    }

    setSelectedAddress(newAddress);
    setStep(2);
  };

  const handleSelectExistingAddress = (address) => {
    setSelectedAddress(address);
    setStep(2);
  };

  const calculateDeliveryDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAddress) {
      toast.error('Please select or enter a shipping address');
      setStep(1);
      return;
    }

    const orderData = {
      items: items.map(item => {
        let productId = item.productId;
        if (typeof productId === 'object' && productId !== null) {
          productId = productId._id || productId.id;
        }
        if (!productId) {
          productId = item._id;
        }

        return {
          productId,
          variantId: item.variantId,
          qty: item.qty || item.quantity,
        };
      }),
      shipTo: selectedAddress,
      shippingMethod: 'standard',
      paymentMethod,
      paymentDetails: {},
      ...((!user && guestEmail) && { guestEmail: guestEmail.trim() }),
    };

    // For Razorpay payment
    if (paymentMethod === 'razorpay') {
      try {
        const { initiateRazorpayPayment } = await import('@/utils/razorpay');

        createOrderMutation.mutate(orderData, {
          onSuccess: async (response) => {
            let orderForPayment;

            if (response.vendorOrders && response.vendorOrders.length > 0) {
              orderForPayment = response.vendorOrders[0];
            } else if (response._id) {
              orderForPayment = response;
            } else {
              toast.error('Order was created but has invalid format. Please contact support.');
              return;
            }

            if (!orderForPayment || !orderForPayment._id) {
              toast.error('Order was created but missing ID. Please contact support.');
              return;
            }

            try {
              await initiateRazorpayPayment({
                orderId: orderForPayment._id,
                amount: orderForPayment.totals.total,
                customer: {
                  name: selectedAddress.fullName,
                  email: user?.email || guestEmail || '',
                  phone: selectedAddress.phone,
                },
                onSuccess: () => {
                  toast.success('Payment successful!');
                  setOrderPlaced(true);
                  dispatch(clearCart());
                  navigate(`/orders/${orderForPayment._id}`);
                },
                onFailure: (error) => {
                  toast.error(error.description || error.message || 'Payment failed. Please try again.');
                  navigate(`/order-confirmation/${orderForPayment._id}`);
                },
              });
            } catch (error) {
              toast.error(`Payment initialization failed: ${error.message}`);
              if (orderForPayment && orderForPayment._id) {
                navigate(`/order-confirmation/${orderForPayment._id}`);
              }
            }
          },
        });
      } catch (error) {
        toast.error('Failed to load payment system. Please refresh and try again.');
      }
    }
  };

  if (items.length === 0 && !orderPlaced) {
    return null;
  }

  if (orderPlaced) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 max-w-screen-2xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between max-w-md">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                1
              </div>
              <span className={`font-medium ${step >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                Address
              </span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`} />
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
              <span className={`font-medium ${step >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                Payment
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Address */}
            {step === 1 && (
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                <h2 className="text-xl font-bold mb-4">Select Delivery Address</h2>

                {/* Existing Addresses */}
                {user && addresses && addresses.length > 0 && (
                  <div className="mb-6">
                    <div className="space-y-3">
                      {addresses.map((addr) => (
                        <button
                          key={addr._id}
                          onClick={() => handleSelectExistingAddress(addr)}
                          className="w-full text-left p-4 border-2 border-gray-300 rounded-lg hover:border-primary-600 hover:bg-primary-50 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{addr.fullName}</p>
                              <p className="text-sm text-gray-700 mt-1">
                                {addr.addressLine1}
                                {addr.addressLine2 && `, ${addr.addressLine2}`}
                              </p>
                              <p className="text-sm text-gray-700">
                                {addr.city}, {addr.state} {addr.zipCode}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">Phone: {addr.phone}</p>
                            </div>
                            <div className="px-3 py-1 bg-blue-100 text-primary-700 text-xs font-medium rounded">
                              DELIVER HERE
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="my-6 flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-300" />
                      <span className="text-sm text-gray-500 font-medium">OR</span>
                      <div className="flex-1 h-px bg-gray-300" />
                    </div>
                  </div>
                )}

                {/* Guest Checkout Notice */}
                {!user && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">Checking out as Guest</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Already have an account?{' '}
                          <button
                            type="button"
                            onClick={() => navigate('/login?redirect=/checkout')}
                            className="underline font-medium hover:text-blue-900"
                          >
                            Login here
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* New Address Form */}
                <h3 className="font-semibold mb-4 text-gray-900">Add New Address</h3>
                <form onSubmit={handleAddressSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!user && (
                      <Input
                        label="Email"
                        name="email"
                        type="email"
                        required
                        placeholder="For order confirmation"
                        className="md:col-span-2"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
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

                  {user && (
                    <div className="mt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAddress}
                          onChange={(e) => setSaveAddress(e.target.checked)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Save this address for future orders</span>
                      </label>
                    </div>
                  )}

                  <Button type="submit" variant="primary" size="lg" className="mt-6 w-full">
                    Continue to Payment
                  </Button>
                </form>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Delivery Address Summary */}
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Delivery Address</h3>
                      <p className="font-medium text-gray-900">{selectedAddress.fullName}</p>
                      <p className="text-sm text-gray-700 mt-1">
                        {selectedAddress.addressLine1}
                        {selectedAddress.addressLine2 && `, ${selectedAddress.addressLine2}`}
                      </p>
                      <p className="text-sm text-gray-700">
                        {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">Phone: {selectedAddress.phone}</p>
                    </div>
                    <Button onClick={() => setStep(1)} variant="outline" size="sm">
                      Change
                    </Button>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                  <h2 className="text-xl font-bold mb-4">Payment Method</h2>

                  <form onSubmit={handlePaymentSubmit}>
                    <div className="p-4 border-2 border-primary-600 bg-primary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <div className="flex-1">
                          <span className="font-semibold text-lg">Online Payment</span>
                          <p className="text-sm text-gray-700 mt-1">Pay securely via Card, UPI, Net Banking, or Wallet</p>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">Secure</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Your payment information is encrypted and secure</span>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={createOrderMutation.isPending}
                      className="mt-6"
                    >
                      Proceed to Payment
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4 text-gray-900">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item._id} className="flex gap-3">
                    <img
                      src={item.image || PLACEHOLDER_IMAGE_SM}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded border"
                      onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-600">Qty: {item.qty}</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.priceSnapshot * item.qty)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Estimate */}
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900">Delivery by {calculateDeliveryDate(ESTIMATED_DELIVERY_DAYS)}</p>
                    <p className="text-xs text-green-700 mt-0.5">Standard delivery (5-7 business days)</p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Subtotal ({items.length} items):</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Shipping:</span>
                  <span className="font-medium">
                    {shippingCost === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      formatCurrency(shippingCost)
                    )}
                  </span>
                </div>
                {totals.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Tax:</span>
                    <span className="font-medium">{formatCurrency(totals.tax)}</span>
                  </div>
                )}
                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span className="font-medium">-{formatCurrency(totals.discount)}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">
                    {formatCurrency(totals.total + shippingCost)}
                  </span>
                </div>
              </div>

              {/* Free Shipping Notice */}
              {shippingCost > 0 && totals.subtotal < FREE_SHIPPING_THRESHOLD && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    Add {formatCurrency(FREE_SHIPPING_THRESHOLD - totals.subtotal)} more to get FREE shipping!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
