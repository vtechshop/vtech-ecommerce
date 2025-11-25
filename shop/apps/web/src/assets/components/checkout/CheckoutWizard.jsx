// FILE: apps/web/src/components/checkout/CheckoutWizard.jsx
import { CheckCircle } from 'lucide-react';

const CheckoutWizard = ({ currentStep }) => {
  const steps = [
    { id: 1, name: 'Address', description: 'Shipping address' },
    { id: 2, name: 'Payment', description: 'Payment method' },
    { id: 3, name: 'Review', description: 'Review order' },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep >= step.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  step.id
                )}
              </div>
              <div className="text-center mt-2">
                <p
                  className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {step.name}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 ${
                  currentStep > step.id ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CheckoutWizard;