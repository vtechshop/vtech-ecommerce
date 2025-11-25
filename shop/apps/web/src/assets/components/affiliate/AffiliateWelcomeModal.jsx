import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, CheckCircle, DollarSign, Link2, TrendingUp, Share2, Award } from 'lucide-react';
import Modal from '@/components/common/Modal';

const AffiliateWelcomeModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to V-Tech Affiliate Program!',
      icon: <Award className="w-12 h-12 text-green-600" />,
      content: (
        <div className="text-center">
          <p className="text-lg text-gray-700 mb-4">
            Congratulations on joining V-Tech's Affiliate Program! Start earning commissions by sharing products you love.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="font-semibold text-green-900 mb-2">What You'll Earn:</p>
            <p className="text-sm text-green-800">
              5% commission on every sale + bonus tiers up to 8% as you grow!
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
            <p className="font-bold text-green-900 text-xl mb-2">You earn 5% on every sale!</p>
            <p className="text-green-800">30-day cookie tracking ensures you get credit</p>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
              <div>
                <p className="font-semibold">Customer Clicks Your Link</p>
                <p className="text-sm text-gray-700">Cookie tracks for 30 days</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
              <div>
                <p className="font-semibold">Customer Makes Purchase</p>
                <p className="text-sm text-gray-700">Within 30 days of clicking</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
              <div>
                <p className="font-semibold">You Earn Commission</p>
                <p className="text-sm text-gray-700">Paid monthly after admin approval</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-900 font-semibold mb-1">Example:</p>
            <p className="text-sm text-blue-800">
              Customer buys ₹10,000 worth → You earn <span className="font-bold text-green-600">₹500</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Tier System - Earn More!',
      icon: <TrendingUp className="w-12 h-12 text-purple-600" />,
      content: (
        <div>
          <p className="text-gray-700 mb-4">
            As your sales grow, so does your commission rate! Climb the tiers to earn up to 8%.
          </p>
          <div className="space-y-3 mb-4">
            <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-700">🥉 Bronze</h4>
                <span className="text-2xl font-bold text-gray-700">5%</span>
              </div>
              <p className="text-sm text-gray-700">₹10,000+ sales per month</p>
            </div>
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-400 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-700">🥈 Silver</h4>
                <span className="text-2xl font-bold text-gray-700">6%</span>
              </div>
              <p className="text-sm text-gray-700">₹25,000+ sales per month</p>
            </div>
            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-yellow-800">🥇 Gold</h4>
                <span className="text-2xl font-bold text-yellow-700">7%</span>
              </div>
              <p className="text-sm text-yellow-800">₹50,000+ sales per month</p>
            </div>
            <div className="bg-gradient-to-r from-purple-100 to-purple-200 border-2 border-purple-400 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-purple-800">💎 Platinum</h4>
                <span className="text-2xl font-bold text-purple-600">8%</span>
              </div>
              <p className="text-sm text-purple-800">₹1,00,000+ sales per month + special perks!</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Getting Your Affiliate Links',
      icon: <Link2 className="w-12 h-12 text-blue-600" />,
      content: (
        <div>
          <p className="text-gray-700 mb-4">
            Use your unique affiliate code and product links to earn commissions.
          </p>
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Your Affiliate Code
              </h4>
              <p className="text-sm text-purple-800 mb-3">
                Use your unique code when sharing the V-Tech homepage or any page.
              </p>
              <div className="bg-white border border-purple-300 rounded p-3">
                <code className="text-purple-600 font-bold">?ref=YOUR_CODE</code>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Product-Specific Links
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                Generate custom links for any product in the catalog.
              </p>
              <Link
                to="/affiliate-dashboard/all-product-links"
                className="text-sm text-blue-600 hover:text-blue-700 underline font-medium"
                onClick={onClose}
              >
                Go to Product Links →
              </Link>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">📋 How to Use:</h4>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>Copy your affiliate link</li>
                <li>Share on social media, blog, or WhatsApp</li>
                <li>Customer clicks and makes purchase</li>
                <li>You earn commission!</li>
              </ol>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Promotion Best Practices',
      icon: <Share2 className="w-12 h-12 text-orange-600" />,
      content: (
        <div>
          <p className="text-gray-700 mb-4">
            Follow these tips to maximize your affiliate earnings!
          </p>
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Always Disclose</p>
                <p className="text-sm text-gray-700">Let people know it's an affiliate link - required by law!</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Share on Social Media</p>
                <p className="text-sm text-gray-700">Instagram, Facebook, Twitter, YouTube are great platforms</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Create Honest Reviews</p>
                <p className="text-sm text-gray-700">Share genuine experiences with products you've used</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Track Performance</p>
                <p className="text-sm text-gray-700">Monitor your dashboard to see what works best</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-900 font-semibold mb-1">⚠️ Don't:</p>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>Spam or send unsolicited messages</li>
              <li>Make false claims about products</li>
              <li>Use V-Tech's brand name in PPC ads</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Your Next Steps',
      icon: <CheckCircle className="w-12 h-12 text-blue-600" />,
      content: (
        <div>
          <p className="text-gray-700 mb-4">
            You're all set! Here's how to start earning:
          </p>
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
              <div>
                <p className="font-semibold">Copy Your Affiliate Code</p>
                <p className="text-sm text-gray-700">Find it in your dashboard (purple card)</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
              <div>
                <p className="font-semibold">Get Product Links</p>
                <p className="text-sm text-gray-700">Browse products and generate affiliate links</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
              <div>
                <p className="font-semibold">Share with Your Audience</p>
                <p className="text-sm text-gray-700">Post on social media, blog, or messaging apps</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">4</div>
              <div>
                <p className="font-semibold">Track & Earn!</p>
                <p className="text-sm text-gray-700">Monitor performance and collect monthly payouts</p>
              </div>
            </div>
          </div>
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-900 font-semibold mb-2">Need Help?</p>
            <p className="text-sm text-primary-800 mb-3">
              Visit Affiliate Terms for detailed program information, commission structure, and promotion guidelines.
            </p>
            <Link
              to="/page/affiliate-terms"
              className="inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
              onClick={onClose}
            >
              View Affiliate Terms →
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
                  index <= currentStep ? 'bg-green-600' : 'bg-gray-200'
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
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Start Earning!'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AffiliateWelcomeModal;
