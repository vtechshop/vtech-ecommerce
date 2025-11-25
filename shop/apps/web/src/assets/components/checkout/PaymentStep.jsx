// FILE: apps/web/src/components/checkout/PaymentStep.jsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import PaymentMethods from './PaymentMethods';
import { formatCurrency } from '@/utils/format';
import { CreditCard, Lock } from 'lucide-react';

const PaymentStep = ({ order, totals, onBack }) => {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);

  const createPaymentMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/payment/intent', data);
      return response.data.data;
    },
    onSuccess: (paymentIntent) => {
      // In production, you'd integrate with Stripe/Razorpay SDK here
      handlePaymentSuccess(paymentIntent);
    },
    onError: (error) => {
      alert(error.response?.data?.error?.message || 'Payment failed');
      setIsProcessing(false);
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/payment/confirm', data);
      return response.data.data;
    },
    onSuccess: (result) => {
      setIsProcessing(false);
      navigate(`/orders/${result.order._id}/success`);
    },
    onError: (error) => {
      alert(error.response?.data?.error?.message || 'Payment confirmation failed');
      setIsProcessing(false);
    },
  });

  const handlePaymentSuccess = (paymentIntent) => {
    // Confirm the payment
    confirmPaymentMutation.mutate({
      orderId: order._id,
      paymentIntentId: paymentIntent.id,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Create payment intent
      await createPaymentMutation.mutateAsync({
        orderId: order._id,
        provider: paymentMethod === 'card' ? 'stripe' : 'razorpay',
      });

      // In production, you would:
      // 1. Load Stripe/Razorpay SDK
      // 2. Collect card details securely
      // 3. Confirm payment with provider
      // 4. Call confirmPayment API

      // For demo purposes, we'll simulate success after 2 seconds
      setTimeout(() => {
        handlePaymentSuccess({ id: 'demo_payment_' + Date.now() });
      }, 2000);
    } catch (error) {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Payment Information</h2>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <h3 className="font-semibold mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">Subtotal</span>
            <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Shipping</span>
            <span className="font-medium">
              {totals.shipping === 0 ? 'FREE' : formatCurrency(totals.shipping)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Tax</span>
            <span className="font-medium">{formatCurrency(totals.tax)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span className="font-medium">-{formatCurrency(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div>
        <h3 className="font-semibold mb-4">Select Payment Method</h3>
        <PaymentMethods selected={paymentMethod} onSelect={setPaymentMethod} />
      </div>

      {/* Card Details Form (Demo) */}
      {paymentMethod === 'card' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-primary-800">
                <p className="font-semibold mb-1">Secure Payment</p>
                <p>Your payment information is encrypted and secure. We never store your card details.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Card Number</label>
            <div className="relative">
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                maxLength="19"
                className="input w-full pl-10"
                required
                disabled={isProcessing}
              />
              <CreditCard className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Expiry Date</label>
              <input
                type="text"
                placeholder="MM/YY"
                maxLength="5"
                className="input w-full"
                required
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CVV</label>
              <input
                type="text"
                placeholder="123"
                maxLength="3"
                className="input w-full"
                required
                disabled={isProcessing}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cardholder Name</label>
            <input
              type="text"
              placeholder="John Doe"
              className="input w-full"
              required
              disabled={isProcessing}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
              disabled={isProcessing}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Processing...
                </span>
              ) : (
                `Pay ${formatCurrency(totals.total)}`
              )}
            </Button>
          </div>
        </form>
      )}

      {/* UPI/NetBanking Demo */}
      {(paymentMethod === 'upi' || paymentMethod === 'netbanking') && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-700 mb-4">
              In production, this would redirect to {paymentMethod === 'upi' ? 'UPI app' : 'bank'} for payment
            </p>
            <Button
              onClick={handleSubmit}
              variant="primary"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : `Continue to ${paymentMethod === 'upi' ? 'UPI' : 'Bank'}`}
            </Button>
          </div>
        </div>
      )}

      {/* Security Note */}
      <div className="text-xs text-gray-700 text-center pt-4 border-t">
        <p>🔒 This is a demo. No actual payment will be processed.</p>
      </div>
    </div>
  );
};

export default PaymentStep;