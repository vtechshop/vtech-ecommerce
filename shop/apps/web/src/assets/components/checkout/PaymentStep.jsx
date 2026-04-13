// FILE: apps/web/src/components/checkout/PaymentStep.jsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import PaymentMethods from './PaymentMethods';
import { formatCurrency } from '@/utils/format';
import { Lock } from 'lucide-react';

const PaymentStep = ({ order, totals, onBack }) => {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
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
      // Create Razorpay payment intent
      await createPaymentMutation.mutateAsync({
        orderId: order._id,
        provider: 'razorpay',
        method: paymentMethod, // 'razorpay', 'upi', 'card', or 'netbanking'
      });

      // In production, you would:
      // 1. Load Razorpay SDK
      // 2. Open Razorpay checkout modal
      // 3. Handle payment success/failure
      // 4. Call confirmPayment API

      // For demo purposes, simulate success quickly
      setTimeout(() => {
        handlePaymentSuccess({ id: 'razorpay_demo_' + Date.now() });
      }, 800);
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
              {totals.shipping > 0 ? formatCurrency(totals.shipping) : 'Calculated at checkout'}
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

      {/* Razorpay Payment */}
      <div className="space-y-4">
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-primary-800">
              <p className="font-semibold mb-1">Secure Payment by Razorpay</p>
              <p>Your payment is 100% secure. Razorpay uses industry-standard encryption.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="text-center mb-4">
            <h3 className="font-semibold text-lg mb-2">
              {paymentMethod === 'razorpay' && 'All Payment Methods'}
              {paymentMethod === 'upi' && 'UPI Payment'}
              {paymentMethod === 'card' && 'Card Payment'}
              {paymentMethod === 'netbanking' && 'Net Banking'}
            </h3>
            <p className="text-sm text-gray-600">
              {paymentMethod === 'razorpay' && 'Pay using UPI, Cards, Net Banking, or Wallets'}
              {paymentMethod === 'upi' && 'Pay using Google Pay, PhonePe, Paytm, or any UPI app'}
              {paymentMethod === 'card' && 'Pay using Credit or Debit Card (Visa, Mastercard, RuPay)'}
              {paymentMethod === 'netbanking' && 'Pay using your bank account'}
            </p>
          </div>

          <div className="flex justify-center mb-4">
            <img
              src="https://razorpay.com/assets/razorpay-glyph.svg"
              alt="Razorpay"
              className="h-12 opacity-70"
            />
          </div>

          <div className="flex gap-3">
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
              onClick={handleSubmit}
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
        </div>
      </div>

      {/* Security Note */}
      <div className="text-xs text-gray-700 text-center pt-4 border-t">
        <p>🔒 This is a demo. No actual payment will be processed.</p>
      </div>
    </div>
  );
};

export default PaymentStep;