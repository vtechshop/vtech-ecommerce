// FILE: apps/web/src/pages/Checkout.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/utils/api';
import { clearCart } from '@/store/slices/cartSlice';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Spinner from '@/components/common/Spinner';
import AdBanner from '@/components/common/AdBanner';
import ShinyButton from '@/components/animations/ShinyButton';
import { formatCurrency } from '@/utils/format';
import { trackBeginCheckout } from '@/utils/analytics';
import { DEFAULT_COUNTRY } from '@/utils/locationData';
import SmartAddressForm from '@/components/checkout/SmartAddressForm';
import { useToast } from '@/components/common/ToastContainer';
import { PLACEHOLDER_IMAGE_SM, handleImageError } from '@/utils/placeholders';
import AnimatedDiv from '@/components/common/AnimatedDiv';
import { getAffiliateCode, clearAffiliateCode } from '@/utils/affiliateTracking';
import ScrollReveal from '@/components/common/ScrollReveal';

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
    district: '',
    area: '',
    state: '',
    zipCode: '',
    country: DEFAULT_COUNTRY, // 'IN' for India
  });
  const [shippingMethod, setShippingMethod] = useState({ id: 'standard', name: 'Standard Shipping', cost: 0 }); // Default shipping
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // Default to Razorpay
  const [saveAddress, setSaveAddress] = useState(true); // Save address to account by default
  const [orderPlaced, setOrderPlaced] = useState(false); // Flag to prevent redirect after order success
  const [guestEmail, setGuestEmail] = useState(''); // Email for guest checkout

  useEffect(() => {
    // Don't redirect if order was just placed (cart will be empty but that's expected)
    if (orderPlaced) {
      return;
    }

    // Allow guest checkout - don't force login
    // User can checkout as guest or choose to login

    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    trackBeginCheckout({ items, totals });
  }, [items, totals, navigate, orderPlaced]);


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

  // Shipping quotes removed - will be added in future

  // Create order mutation
  // NOTE: onSuccess/onError are handled inline in handlePaymentSubmit for Razorpay flow
  // This allows proper control over when to navigate vs open payment modal
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const response = await api.post('/orders', orderData);
      return response.data.data;
    },
    // Don't define onSuccess here - it's handled inline in handlePaymentSubmit
    // to allow Razorpay payment modal to open before navigation
  });

  const validateAddress = () => {
    const errors = {};

    // For guest checkout, email is required
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

    // Validate all fields
    const errors = validateAddress();

    if (Object.keys(errors).length > 0) {
      // Show first validation error
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    // Save address to user account if checkbox is checked
    if (saveAddress && user) {
      try {
        await api.post('/user/addresses', newAddress);
        toast.success('Address saved to your account');
      } catch {
        // Don't block checkout if address save fails - silent failure is acceptable here
      }
    }

    setSelectedAddress(newAddress);
    setStep(2); // Go directly to payment
  };

  const handleSelectExistingAddress = (address) => {
    setSelectedAddress(address);
    setStep(2); // Go directly to payment
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields before submitting
    if (!selectedAddress) {
      toast.error('Please select or enter a shipping address');
      setStep(1);
      return;
    }

    // Get affiliate code from cookie for commission tracking
    const affiliateCode = getAffiliateCode();

    const orderData = {
      items: items.map(item => {
        // Handle both populated (object) and non-populated (string) productId
        let productId = item.productId;

        // If productId is an object (populated), extract the _id
        if (typeof productId === 'object' && productId !== null) {
          productId = productId._id || productId.id;
        }

        // Fallback to item._id if productId is still not valid
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
      shippingMethod: shippingMethod.id,
      paymentMethod,
      paymentDetails: {},
      // Include guest email if not logged in
      ...((!user && guestEmail) && { guestEmail: guestEmail.trim() }),
      // Include affiliate code for commission tracking
      ...(affiliateCode && { affiliateCode }),
    };

    // For Razorpay, create order first then initiate payment
    if (paymentMethod === 'razorpay') {
      try {
        // Import dynamically to avoid loading Razorpay on initial page load
        const { initiateRazorpayPayment } = await import('@/utils/razorpay');

        // Create order first
        createOrderMutation.mutate(orderData, {
          onSuccess: async (response) => {
            // Backend returns vendorOrders array for multi-vendor support
            // Extract the first order for payment (or use the main order if single vendor)
            let orderForPayment;

            if (response.vendorOrders && response.vendorOrders.length > 0) {
              // Multi-vendor order: use first vendor order for payment
              orderForPayment = response.vendorOrders[0];
            } else if (response._id) {
              // Single order response
              orderForPayment = response;
            } else {
              console.error('❌ Invalid response format:', response);
              toast.error('Order was created but has invalid format. Please contact support.');
              return;
            }

            // Validate order has required fields
            if (!orderForPayment || !orderForPayment._id) {
              console.error('❌ Order missing ID:', orderForPayment);
              toast.error('Order was created but missing ID. Please contact support.');
              return;
            }

            try {
              // Initiate Razorpay payment
              await initiateRazorpayPayment({
                orderId: orderForPayment._id,
                amount: orderForPayment.totals.total,
                customer: {
                  name: selectedAddress.fullName,
                  email: user?.email || guestEmail || '',
                  phone: selectedAddress.phone,
                },
                onSuccess: (paymentResult) => {
                  toast.success('Payment successful!');
                  // Set flag to prevent cart redirect
                  setOrderPlaced(true);
                  // Clear cart and affiliate cookie (prevent repeat commission on future orders)
                  dispatch(clearCart());
                  clearAffiliateCode();
                  // Navigate to order confirmation page (consistent with failure path)
                  navigate(`/order-confirmation/${orderForPayment._id}`);
                },
                onFailure: (error) => {
                  console.error('❌ Payment failed:', error);
                  toast.error(error.description || error.message || 'Payment failed. Please try again.');
                  // Don't clear cart on payment failure
                  // User can retry payment from order page
                  navigate(`/order-confirmation/${orderForPayment._id}`);
                },
              });
            } catch (error) {
              console.error('❌ Razorpay payment error:', error);
              console.error('Error details:', error.message, error.stack);
              toast.error(`Payment initialization failed: ${error.message}`);
              // Only navigate if we have a valid order ID
              if (orderForPayment && orderForPayment._id) {
                navigate(`/order-confirmation/${orderForPayment._id}`);
              } else {
                toast.error('Cannot navigate to order page - order ID is missing');
              }
            }
          },
          onError: (error) => {
            console.error('❌ Order creation failed:', error);
            const errorMessage = error.response?.data?.error?.message ||
                                error.response?.data?.message ||
                                'Failed to create order. Please try again.';
            toast.error(errorMessage);

            // If user is not authenticated (for registered user orders), redirect to login
            if (error.response?.status === 401) {
              navigate('/login?redirect=/checkout');
            }
            // Otherwise stay on checkout page so user can retry
          }
        });
      } catch (error) {
        console.error('❌ Failed to load Razorpay module:', error);
        toast.error('Failed to load payment system. Please refresh and try again.');
      }
    } else {
      // Only Razorpay is supported - this is a fallback that shouldn't be reached
      toast.error('Invalid payment method. Please refresh the page.');
    }
  };

  // Don't render anything if cart is empty (unless order was just placed - navigation will handle it)
  if (items.length === 0 && !orderPlaced) {
    return null;
  }

  // Show loading state while navigating to order confirmation
  if (orderPlaced) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <ScrollReveal animation="fadeUp">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-6 max-w-screen-2xl">
        {/* Header */}
        <div className="mb-6 md:mb-8 fade-in-down">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-700 text-sm mt-1">Complete your purchase securely</p>
        </div>

        {/* Ad Banner - Top of Checkout */}
        <AdBanner placement="checkout_top" position="top" className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checkout Steps */}
          <div className="lg:col-span-2">
          {/* Progress Steps */}
          {step > 0 && (
            <AnimatedDiv animation="fadeInDown" duration={0.5}>

              <div className="mb-6">
                <div className="flex items-center justify-between">
                  {[
                    { num: 1, label: 'Address' },
                    { num: 2, label: 'Payment' },
                  ].map((s, index) => (
                  <div key={s.num} className="flex items-center flex-1">
                    <div className={`flex items-center ${index > 0 ? 'flex-1' : ''}`}>
                      {index > 0 && (
                        <div
                          className={`flex-1 h-1 transition-all duration-500 ${
                            step > s.num - 1 ? 'bg-primary-600 progress-fill' : 'bg-gray-300'
                          }`}
                        />
                      )}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                          step >= s.num
                            ? 'bg-primary-600 text-white scale-110'
                            : 'bg-gray-300 text-gray-700'
                        }`}
                      >
                        {step >= s.num ? (
                          <AnimatedDiv animation="scale" duration={0.3}>
                            <span>{s.num}</span>
                          </AnimatedDiv>
                        ) : (
                          s.num
                        )}
                      </div>
                    </div>
                    <span className={`ml-2 transition-colors duration-300 ${step >= s.num ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            </AnimatedDiv>
          )}

          {/* Step 1: Address */}
          {step === 1 && (
            <AnimatedDiv animation="fadeInUp" duration={0.4}>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Shipping Address</h2>

                {/* Existing Addresses */}
                {user && addresses && addresses.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3 fade-in">Your Addresses</h3>
                    <div className="space-y-3">
                      {addresses.map((addr, index) => (
                        <button
                          key={addr._id}
                          onClick={() => handleSelectExistingAddress(addr)}
                          className={`w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-primary-600 transition-all hover-lift fade-in stagger-${Math.min(index + 1, 6)}`}
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

                {/* Guest Checkout Notice */}
                {!user && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg fade-in">
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
                <form onSubmit={handleAddressSubmit}>
                  <SmartAddressForm
                    address={newAddress}
                    onChange={setNewAddress}
                    guestEmail={guestEmail}
                    onGuestEmailChange={setGuestEmail}
                    user={user}
                  />

                  {/* Save Address Checkbox - Only for logged-in users */}
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

                  <ShinyButton type="submit" variant="primary" size="md" className="mt-6 w-full">
                    Continue to Payment
                  </ShinyButton>
                </form>
              </div>
            </AnimatedDiv>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <AnimatedDiv animation="fadeInUp" duration={0.4}>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-4">Payment Method</h2>

                <form onSubmit={handlePaymentSubmit}>
                  {/* Payment Method - Only Razorpay */}
                  <div className="mb-6">
                    <div className="p-4 border-2 border-primary-600 bg-primary-50 rounded-lg fade-in hover-lift">
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <div className="flex-1">
                          <span className="font-semibold text-lg">Online Payment (Razorpay)</span>
                          <p className="text-sm text-gray-700 mt-1">Secure payment via Card, UPI, Net Banking, or Wallet</p>
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
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" onClick={() => setStep(1)} variant="outline" className="btn-scale">
                      Back
                    </Button>
                    <ShinyButton
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={createOrderMutation.isPending}
                      className="flex-1"
                    >
                      {createOrderMutation.isPending ? 'Processing...' : 'Continue to Payment'}
                    </ShinyButton>
                  </div>
                </form>
              </div>
            </AnimatedDiv>
          )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
          {/* Ad Banner - Checkout Sidebar */}
          <AdBanner placement="checkout_sidebar" position="right" className="mb-6 fade-in-right" />

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24 fade-in-right hover-lift">
            <h2 className="text-xl md:text-2xl font-bold mb-4 fade-in-down">Order Summary</h2>

            {/* Items */}
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map((item, index) => (
                <div key={item._id} className={`flex gap-3 fade-in stagger-${Math.min(index + 1, 6)}`}>
                  <img
                    src={item.image || PLACEHOLDER_IMAGE_SM}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => handleImageError(e, PLACEHOLDER_IMAGE_SM)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-700">Qty: {item.qty}</p>
                    <p className="text-sm font-semibold">{formatCurrency(item.priceSnapshot)}</p>
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
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Tax:</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
              )}
              {totals.shipping > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Shipping:</span>
                  <span>{formatCurrency(totals.shipping)}</span>
                </div>
              )}
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(totals.discount)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="price-highlight">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>
          </div>
          </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
};

export default Checkout;