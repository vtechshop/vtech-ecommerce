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
        <div className="space-y-4">
          <p className="text-gray-700 text-lg">
            Congratulations on becoming a V-Tech affiliate! You're now part of our growing community of content creators and marketers earning money by promoting quality products.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">What You'll Earn:</h4>
            <ul className="space-y-2 text-green-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>5% commission</strong> on every sale you refer</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Up to 8% commission</strong> as you reach higher tiers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Monthly payouts</strong> directly to your bank account</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>30-day cookie tracking</strong> on all referred customers</span>
              </li>
            </ul>
          </div>
          <p className="text-gray-600 text-sm">
            This quick tour will help you understand how the program works and how to maximize your earnings.
          </p>
        </div>
      )
    },
    {
      title: 'Understanding Commissions',
      icon: <DollarSign className="w-12 h-12 text-green-600" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Here's how your affiliate commissions work from start to finish:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div>
                <h5 className="font-semibold text-blue-900 mb-1">Commission Created</h5>
                <p className="text-sm text-blue-800">When a customer makes a purchase through your affiliate link, a commission record is created at 5% of the sale amount (excluding shipping & taxes).</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div>
                <h5 className="font-semibold text-yellow-900 mb-1">Order Delivered</h5>
                <p className="text-sm text-yellow-800">After the order is successfully delivered and the return period passes, your commission status changes to "Approved".</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div>
                <h5 className="font-semibold text-green-900 mb-1">Monthly Payout</h5>
                <p className="text-sm text-green-800">Approved commissions are paid to your bank account within 15 days after month-end, provided you meet the ₹500 minimum threshold.</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">Example Calculation:</p>
            <div className="text-sm text-gray-700 space-y-1">
              <p>• Customer purchases products worth ₹10,000</p>
              <p>• Your commission (5%): <span className="font-bold text-green-600">₹500</span></p>
              <p>• If you're in Silver tier (6%): <span className="font-bold text-green-600">₹600</span></p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Tier System - Earn More!',
      icon: <TrendingUp className="w-12 h-12 text-purple-600" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            As you generate more sales, you unlock higher commission rates through our tier system:
          </p>
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-amber-100 to-amber-200 border-2 border-amber-400 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-amber-800">🥉 Bronze</h4>
                <span className="text-2xl font-bold text-amber-600">5%</span>
              </div>
              <p className="text-sm text-amber-800">Starting tier - ₹10,000+ sales per month</p>
            </div>
            <div className="bg-gradient-to-r from-gray-200 to-gray-300 border-2 border-gray-500 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-800">🥈 Silver</h4>
                <span className="text-2xl font-bold text-gray-600">6%</span>
              </div>
              <p className="text-sm text-gray-800">₹25,000+ sales per month</p>
            </div>
            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-500 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-yellow-800">🥇 Gold</h4>
                <span className="text-2xl font-bold text-yellow-600">7%</span>
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
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-900">
              <strong>Pro Tip:</strong> Your tier is calculated based on the total sales you generate each month. Keep promoting to unlock higher earnings!
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Getting Your Affiliate Links',
      icon: <Link2 className="w-12 h-12 text-blue-600" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            You have two ways to share products and earn commissions:
          </p>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Method 1: Your Unique Affiliate Code
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                Your personal affiliate code is displayed on your dashboard. Customers can enter this code at checkout to link their purchase to you.
              </p>
              <div className="bg-white border border-blue-300 rounded p-3">
                <p className="text-xs text-gray-600 mb-1">Your Affiliate Code:</p>
                <code className="text-sm font-mono text-blue-600 font-bold">AFF-XXXXX</code>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Method 2: Product-Specific Links
              </h4>
              <p className="text-sm text-green-800 mb-3">
                Browse any product on V-Tech and click the "Share" button. You'll get a unique affiliate link for that specific product to share on your platforms.
              </p>
              <div className="bg-white border border-green-300 rounded p-3">
                <p className="text-xs text-gray-600 mb-1">Example Link:</p>
                <code className="text-xs font-mono text-green-600 break-all">
                  https://vtech.com/product/xyz?ref=AFF-XXXXX
                </code>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-sm text-yellow-900">
              <strong>Remember:</strong> All clicks are tracked for 30 days. If someone clicks your link today and purchases within 30 days, you still earn commission!
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Promotion Best Practices',
      icon: <Share2 className="w-12 h-12 text-orange-600" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Follow these guidelines to maximize your earnings and stay compliant:
          </p>
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">✅ Do This:</h4>
              <ul className="space-y-1 text-sm text-green-800">
                <li>• Share on social media (Instagram, Facebook, YouTube, Twitter)</li>
                <li>• Create honest product reviews and comparisons</li>
                <li>• Disclose your affiliate relationship clearly</li>
                <li>• Target your specific audience and niche</li>
                <li>• Use high-quality images and content</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">✅ Great Platforms:</h4>
              <ul className="space-y-1 text-sm text-green-800">
                <li>• Instagram Stories & Posts</li>
                <li>• YouTube Product Reviews</li>
                <li>• Blog Articles & Comparisons</li>
                <li>• Facebook Groups (with admin permission)</li>
                <li>• WhatsApp Status (personal contacts)</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">✅ Content Ideas:</h4>
              <ul className="space-y-1 text-sm text-green-800">
                <li>• "Top 5 Products for..." lists</li>
                <li>• Unboxing videos</li>
                <li>• Before/After comparisons</li>
                <li>• Problem-solving guides</li>
                <li>• Seasonal gift guides</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">✅ Disclosure Example:</h4>
              <div className="bg-white border border-green-300 rounded p-3 mt-2">
                <p className="text-xs text-gray-700 italic">
                  "This post contains affiliate links. I may earn a commission if you make a purchase through these links at no extra cost to you."
                </p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">❌ Don't Do This:</h4>
              <ul className="space-y-1 text-sm text-red-800">
                <li>• Spam or send unsolicited messages</li>
                <li>• Make false or exaggerated claims</li>
                <li>• Impersonate V-Tech or its employees</li>
                <li>• Use cookie stuffing or click fraud</li>
                <li>• Make self-referrals or fake purchases</li>
                <li>• Bid on V-Tech branded keywords in PPC campaigns</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Your Next Steps',
      icon: <CheckCircle className="w-12 h-12 text-primary-600" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            You're all set! Here's what to do next to start earning:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div>
                <h5 className="font-semibold text-primary-900">Find Your Affiliate Code</h5>
                <p className="text-sm text-primary-800">Check your dashboard for your unique affiliate code. Copy it and keep it handy!</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div>
                <h5 className="font-semibold text-primary-900">Browse Products</h5>
                <p className="text-sm text-primary-800">Explore our catalog and find products that match your audience's interests.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div>
                <h5 className="font-semibold text-primary-900">Start Sharing</h5>
                <p className="text-sm text-primary-800">Share your affiliate links on your platforms and start promoting!</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</div>
              <div>
                <h5 className="font-semibold text-primary-900">Track Your Progress</h5>
                <p className="text-sm text-primary-800">Monitor your clicks, conversions, and earnings in real-time from your dashboard.</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6 text-center">
            <h4 className="font-bold text-green-900 mb-2">Ready to Start Earning?</h4>
            <p className="text-sm text-green-800 mb-4">
              Review our complete terms and guidelines to ensure you're maximizing your success!
            </p>
            <Link
              to="/page/affiliate-terms"
              onClick={onClose}
              className="inline-block bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
            >
              Read Affiliate Terms
            </Link>
          </div>
        </div>
      )
    }
  ];

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
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
      <div className="relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            {steps[currentStep].icon}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {steps[currentStep].title}
          </h2>
        </div>

        <div className="max-h-[400px] overflow-y-auto mb-6 px-2">
          {steps[currentStep].content}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
          >
            Skip Tour
          </button>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              {currentStep === steps.length - 1 ? 'Start Earning!' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AffiliateWelcomeModal;
