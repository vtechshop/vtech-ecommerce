// FILE: apps/web/src/components/checkout/PaymentMethods.jsx
import { CreditCard, Smartphone, Building, Wallet } from 'lucide-react';

const PaymentMethods = ({ selected, onSelect }) => {
  const methods = [
    {
      id: 'razorpay',
      name: 'Razorpay (All Methods)',
      description: 'UPI, Cards, Net Banking & Wallets',
      icon: Wallet,
      popular: true,
    },
    {
      id: 'upi',
      name: 'UPI',
      description: 'Google Pay, PhonePe, Paytm',
      icon: Smartphone,
    },
    {
      id: 'card',
      name: 'Credit / Debit Card',
      description: 'Visa, Mastercard, RuPay',
      icon: CreditCard,
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      description: 'All major banks supported',
      icon: Building,
    },
  ];

  return (
    <div className="space-y-3">
      {methods.map((method) => {
        const Icon = method.icon;
        return (
          <label
            key={method.id}
            className={`relative flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selected === method.id
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            {method.popular && (
              <span className="absolute -top-2 right-4 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                Recommended
              </span>
            )}
            <input
              type="radio"
              name="payment"
              value={method.id}
              checked={selected === method.id}
              onChange={() => onSelect(method.id)}
              className="w-4 h-4 text-blue-600"
            />
            <Icon className="w-6 h-6 text-gray-700" />
            <div className="flex-1">
              <p className="font-medium">{method.name}</p>
              <p className="text-sm text-gray-700">{method.description}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
};

export default PaymentMethods;