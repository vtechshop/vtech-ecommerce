// FILE: apps/web/src/components/payment/RazorpayButton.jsx
import { useState } from 'react';
import { initiateRazorpayPayment } from '@/utils/razorpay';
import { CreditCard, Loader } from 'lucide-react';

const RazorpayButton = ({
  orderId,
  amount,
  customer,
  onSuccess,
  onFailure,
  className = '',
  children,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      await initiateRazorpayPayment({
        orderId,
        amount,
        customer,
        onSuccess: (result) => {
          setLoading(false);
          if (onSuccess) {
            onSuccess(result);
          }
        },
        onFailure: (error) => {
          setLoading(false);
          if (onFailure) {
            onFailure(error);
          }
        },
      });
    } catch (error) {
      setLoading(false);
      console.error('Payment error:', error);
      if (onFailure) {
        onFailure(error);
      }
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || loading}
      className={`
        flex items-center justify-center gap-2 px-6 py-3
        bg-gradient-to-r from-blue-600 to-blue-700
        text-white font-semibold rounded-lg
        hover:from-blue-700 hover:to-blue-800
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-300 shadow-lg hover:shadow-xl
        ${className}
      `}
    >
      {loading ? (
        <>
          <Loader className="w-5 h-5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {children || (
            <>
              <CreditCard className="w-5 h-5" />
              <span>Pay with Razorpay</span>
            </>
          )}
        </>
      )}
    </button>
  );
};

export default RazorpayButton;
