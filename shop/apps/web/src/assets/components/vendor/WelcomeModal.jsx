import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, CheckCircle, DollarSign, Target, Package, TrendingUp } from 'lucide-react';
import Modal from '@/components/common/Modal';

const WelcomeModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to VTech!',
      icon: <CheckCircle className="w-12 h-12 text-green-600" />,
      content: (
        <div className="text-center">
          <p className="text-lg text-gray-700 mb-4">
            Congratulations on becoming a VTech vendor! You're now part of a thriving marketplace with thousands of customers.
          </p>
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4">
            <p className="font-semibold text-primary-900 mb-2">What's Next?</p>
            <p className="text-sm text-primary-800">
              Let's take a quick tour to help you get started and understand how to maximize your success on our platform.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Understanding Commissions',
      icon: <DollarSign className="w-12 h-12 text-green-600" />,
      content: (
        <div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-5 mb-4">
            <p className="font-bold text-green-900 text-xl mb-2">You keep 85% of every sale!</p>
            <p className="text-green-800">VTech platform commission: 15%</p>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
              <div>
                <p className="font-semibold">Commission Created</p>
                <p className="text-sm text-gray-700">When customer places an order</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
              <div>
                <p className="font-semibold">Admin Approval</p>
                <p className="text-sm text-gray-700">After successful delivery</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
              <div>
                <p className="font-semibold">Payment to You</p>
                <p className="text-sm text-gray-700">Direct to your bank account</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-900 font-semibold mb-1">Example:</p>
            <p className="text-sm text-blue-800">
              Sell ₹10,000 worth of products → Earn <span className="font-bold text-green-600">₹8,500</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Boost Sales with Sponsored Ads',
      icon: <Target className="w-12 h-12 text-purple-600" />,
      content: (
        <div>
          <p className="text-gray-700 mb-4">
            Increase your product visibility with Sponsored Ads! Get featured on homepage, category pages, and search results.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-700 font-semibold mb-1">CPC</p>
              <p className="text-lg font-bold text-purple-600">₹5-₹20</p>
              <p className="text-xs text-purple-700">per click</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-700 font-semibold mb-1">CPM</p>
              <p className="text-lg font-bold text-purple-600">₹100-₹300</p>
              <p className="text-xs text-purple-700">per 1000 views</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-700 font-semibold mb-1">Budget</p>
              <p className="text-lg font-bold text-purple-600">₹500+</p>
              <p className="text-xs text-purple-700">daily min</p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
            <p className="font-semibold text-purple-900 mb-2">✨ Benefits:</p>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• 3-5x more product views</li>
              <li>• Higher conversion rates</li>
              <li>• Targeted customer reach</li>
              <li>• Track performance metrics</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Quick Tips for Success',
      icon: <TrendingUp className="w-12 h-12 text-blue-600" />,
      content: (
        <div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">High-Quality Images</p>
                <p className="text-sm text-gray-700">Use clear, professional photos from multiple angles</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Detailed Descriptions</p>
                <p className="text-sm text-gray-700">Provide complete specifications and features</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Competitive Pricing</p>
                <p className="text-sm text-gray-700">Research market and factor in 15% commission</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Fast Shipping</p>
                <p className="text-sm text-gray-700">Ship within 24-48 hours for better ratings</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Your Next Steps',
      icon: <Package className="w-12 h-12 text-blue-600" />,
      content: (
        <div>
          <p className="text-gray-700 mb-4">
            You're all set! Here's what you should do next to start selling:
          </p>
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
              <div>
                <p className="font-semibold">Complete Your Profile</p>
                <p className="text-sm text-gray-700">Add store name, logo, and description</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
              <div>
                <p className="font-semibold">Submit KYC Documents</p>
                <p className="text-sm text-gray-700">Business registration and bank details</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
              <div>
                <p className="font-semibold">List Your Products</p>
                <p className="text-sm text-gray-700">Upload products with great images and details</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
              <div>
                <p className="font-semibold">Start Selling</p>
                <p className="text-sm text-gray-700">Process orders and earn commissions!</p>
              </div>
            </div>
          </div>
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-900 font-semibold mb-2">Need Help?</p>
            <p className="text-sm text-primary-800 mb-3">
              Visit our comprehensive Vendor Guide for detailed information about commissions, ads, and best practices.
            </p>
            <Link
              to="/page/vendor-guide"
              className="inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
              onClick={onClose}
            >
              View Vendor Guide →
            </Link>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 mx-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-700 text-center">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          {currentStepData.icon}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
          {currentStepData.title}
        </h2>

        {/* Content */}
        <div className="mb-8">
          {currentStepData.content}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-gray-700 hover:text-gray-900 font-medium text-sm"
          >
            Skip Tour
          </button>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Get Started'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WelcomeModal;
