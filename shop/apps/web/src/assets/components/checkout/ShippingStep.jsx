// FILE: apps/web/src/components/checkout/ShippingStep.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import { formatCurrency } from '@/utils/format';
import { Truck, Clock, Zap } from 'lucide-react';

const ShippingStep = ({ address, onNext, onBack, onShippingSelect }) => {
  const [selectedShipping, setSelectedShipping] = useState(null);

  const { data: shippingOptions, isLoading } = useQuery({
    queryKey: ['shipping-options', address],
    queryFn: async () => {
      // In production, this would calculate real shipping rates
      return [
        {
          id: 'standard',
          name: 'Standard Shipping',
          description: 'Delivery in 5-7 business days',
          price: 5.99,
          estimatedDays: '5-7',
          icon: Truck,
        },
        {
          id: 'express',
          name: 'Express Shipping',
          description: 'Delivery in 2-3 business days',
          price: 12.99,
          estimatedDays: '2-3',
          icon: Clock,
        },
        {
          id: 'overnight',
          name: 'Overnight Shipping',
          description: 'Next business day delivery',
          price: 24.99,
          estimatedDays: '1',
          icon: Zap,
        },
      ];
    },
    enabled: !!address,
  });

  const handleSelectShipping = (option) => {
    setSelectedShipping(option.id);
    onShippingSelect(option);
  };

  const handleContinue = () => {
    if (selectedShipping) {
      const option = shippingOptions.find((o) => o.id === selectedShipping);
      onShippingSelect(option);
      onNext();
    }
  };

  if (!address) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-700">Please select a shipping address first</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Shipping Method</h2>

      {/* Shipping Address Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <p className="text-sm font-semibold mb-2">Shipping to:</p>
        <p className="text-sm">{address.fullName}</p>
        <p className="text-sm text-gray-700">
          {address.addressLine1}
          {address.addressLine2 && `, ${address.addressLine2}`}
        </p>
        <p className="text-sm text-gray-700">
          {address.city}, {address.state} {address.zipCode}
        </p>
      </div>

      {/* Shipping Options */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-700 mt-4">Calculating shipping rates...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shippingOptions?.map((option) => {
            const Icon = option.icon;
            return (
              <label
                key={option.id}
                className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedShipping === option.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="shipping"
                  value={option.id}
                  checked={selectedShipping === option.id}
                  onChange={() => handleSelectShipping(option)}
                  className="sr-only"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        selectedShipping === option.id
                          ? 'bg-primary-100 text-blue-600'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold">{option.name}</p>
                      <p className="text-sm text-gray-700">{option.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Estimated delivery: {option.estimatedDays} days
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {option.price === 0 ? 'FREE' : formatCurrency(option.price)}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleContinue}
          className="flex-1"
          disabled={!selectedShipping}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
};

export default ShippingStep;