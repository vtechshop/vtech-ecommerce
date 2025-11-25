// FILE: apps/web/src/components/checkout/PaymentMethods.jsx
import { CreditCard, Smartphone, Building } from 'lucide-react';

const PaymentMethods = ({ selected, onSelect }) => {
  const methods = [
    {
      id: 'card',
      name: 'Credit / Debit Card',
      description: 'Pay securely with your card',
      icon: CreditCard,
    },
    {
      id: 'upi',
      name: 'UPI',
      description: 'Pay with UPI apps',
      icon: Smartphone,
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      description: 'Pay via your bank',
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
            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selected === method.id
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
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