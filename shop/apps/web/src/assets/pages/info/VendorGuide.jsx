import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, DollarSign, TrendingUp, Package, ShoppingCart,
  CreditCard, Target, BarChart3, HelpCircle, CheckCircle,
  AlertCircle, Info, PlayCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { updateMetaTags } from '@/utils/seo';
import ScrollReveal from '@/components/common/ScrollReveal';

const VendorGuide = () => {
  useEffect(() => {
    updateMetaTags({
      title: 'Vendor Guide - V-Tech Kitchen',
      description: 'Step-by-step guide to selling on V-Tech Kitchen marketplace. Set up your store, list products, manage orders, and grow your business.',
      canonical: 'https://www.vtechkitchen.com/page/vendor-guide',
    });
  }, []);
  const [openSection, setOpenSection] = useState('commission');

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-blue-100 px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Vendor Guide</h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Everything you need to know about selling on V-Tech, earning commissions, and growing your business with sponsored ads.
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <a href="#commission" className="flex items-center gap-2 p-3 rounded-lg hover:bg-blue-100 transition-colors">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Commission System</span>
            </a>
            <a href="#sponsor-ads" className="flex items-center gap-2 p-3 rounded-lg hover:bg-blue-100 transition-colors">
              <Target className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Sponsored Ads</span>
            </a>
            <a href="#getting-started" className="flex items-center gap-2 p-3 rounded-lg hover:bg-blue-100 transition-colors">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Getting Started</span>
            </a>
            <a href="#orders" className="flex items-center gap-2 p-3 rounded-lg hover:bg-blue-100 transition-colors">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Order Management</span>
            </a>
            <a href="#payments" className="flex items-center gap-2 p-3 rounded-lg hover:bg-blue-100 transition-colors">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Payments & Settlements</span>
            </a>
            <a href="#best-practices" className="flex items-center gap-2 p-3 rounded-lg hover:bg-blue-100 transition-colors">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Best Practices</span>
            </a>
          </div>
        </div>

        {/* Main Content */}
        <ScrollReveal animation="fadeUp">
        <div className="space-y-6">
          {/* Commission System */}
          <section id="commission" className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Commission System</h2>
                  <p className="text-green-100">Understand how you earn money on V-Tech</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Commission Rates */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Commission Rates
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-900 font-semibold mb-2">Default Commission Rate: 15%</p>
                  <p className="text-blue-800 text-sm">
                    You keep 85% of the sale price. V-Tech takes 15% as platform commission.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Electronics & Tech</h4>
                    <p className="text-2xl font-bold text-blue-600">12-15%</p>
                    <p className="text-sm text-gray-700 mt-1">Lower margins, higher volume</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Fashion & Accessories</h4>
                    <p className="text-2xl font-bold text-blue-600">15-20%</p>
                    <p className="text-sm text-gray-700 mt-1">Higher margins products</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Home & Garden</h4>
                    <p className="text-2xl font-bold text-blue-600">12-18%</p>
                    <p className="text-sm text-gray-700 mt-1">Varies by product type</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Books & Media</h4>
                    <p className="text-2xl font-bold text-blue-600">10-12%</p>
                    <p className="text-sm text-gray-700 mt-1">Standardized pricing</p>
                  </div>
                </div>
              </div>

              {/* How Commission is Calculated */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  How Commission is Calculated
                </h3>
                <div className="space-y-4">
                  <div className="bg-blue-100 rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Example Calculation:</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Product Price:</span>
                        <span className="font-semibold">₹5,000</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Quantity Sold:</span>
                        <span className="font-semibold">2 units</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Total Sale:</span>
                        <span className="font-semibold">₹10,000</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 mt-2"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Platform Commission (15%):</span>
                        <span className="font-semibold text-red-600">- ₹1,500</span>
                      </div>
                      <div className="flex justify-between items-center text-lg">
                        <span className="text-gray-900 font-semibold">Your Earnings:</span>
                        <span className="font-bold text-green-600">₹8,500</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-900 mb-1">Important Notes:</p>
                        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                          <li>Commission is calculated on the product price (before tax and shipping)</li>
                          <li>Commission is created when customer places order</li>
                          <li>You receive payment after admin approval</li>
                          <li>Custom commission rates can be negotiated for high-volume sellers</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commission Workflow */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  Commission & Payment Workflow (Razorpay Route)
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">1</div>
                    <div>
                      <h4 className="font-semibold">Customer Pays</h4>
                      <p className="text-gray-700 text-sm">Payment is automatically split via Razorpay Route. Your share (85%) is held securely on Razorpay. Commission record created with status "Pending".</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">2</div>
                    <div>
                      <h4 className="font-semibold">Order Delivered</h4>
                      <p className="text-gray-700 text-sm">Commission auto-approved after successful delivery. Status changes to "Approved". Funds remain on hold.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center font-bold">3</div>
                    <div>
                      <h4 className="font-semibold">7-Day Return Window</h4>
                      <p className="text-gray-700 text-sm">Funds are held for 7 days after delivery. If the customer returns the product, the held amount is reversed.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">4</div>
                    <div>
                      <h4 className="font-semibold">Payment Released</h4>
                      <p className="text-gray-700 text-sm">After 7 days, your payment is automatically released to your Razorpay linked account. Admin can also release it manually anytime.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">5</div>
                    <div>
                      <h4 className="font-semibold">Bank Settlement</h4>
                      <p className="text-gray-700 text-sm">Razorpay settles funds to your bank account (T+2 business days). Status changes to "Paid".</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-900 mb-1">Razorpay Account Required</p>
                      <p className="text-sm text-yellow-800">
                        You must connect your Razorpay Linked Account from the <Link to="/vendor-dashboard/settlements" className="underline font-semibold">Settlements page</Link> in your dashboard. Razorpay will verify your business KYC before activating your account. Until activation, payouts will be processed manually by the admin.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* View Commission Details */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-primary-900 mb-2">View Your Commissions</h4>
                    <p className="text-sm text-primary-800 mb-3">
                      Track all your earnings in the Settlements section of your vendor dashboard.
                    </p>
                    <Link
                      to="/vendor-dashboard/settlements"
                      className="inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                      Go to Settlements →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sponsored Ads */}
          <section id="sponsor-ads" className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Sponsored Ads</h2>
                  <p className="text-purple-100">Promote your products and increase sales</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* What are Sponsored Ads */}
              <div>
                <h3 className="text-xl font-semibold mb-4">What are Sponsored Ads?</h3>
                <p className="text-gray-700 mb-4">
                  Sponsored Ads allow you to promote your products in premium positions across the V-Tech platform.
                  Your products appear at the top of search results, category pages, and homepage, increasing visibility and sales.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Increased Visibility</h4>
                    <p className="text-sm text-gray-700">Get your products seen by more customers</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                      <BarChart3 className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Higher Sales</h4>
                    <p className="text-sm text-gray-700">Boost conversions with premium placement</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                      <Target className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-semibold mb-2">Targeted Reach</h4>
                    <p className="text-sm text-gray-700">Reach customers searching for your products</p>
                  </div>
                </div>
              </div>

              {/* Ad Placements */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Where Your Ads Appear</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-blue-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Homepage Banner</h4>
                      <p className="text-sm text-gray-700">Prime real estate at the top of homepage - highest visibility</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Category Pages</h4>
                      <p className="text-sm text-gray-700">Top positions in relevant category listings</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Search Results</h4>
                      <p className="text-sm text-gray-700">Appear at top of search results for targeted keywords</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Product Pages</h4>
                      <p className="text-sm text-gray-700">Promoted products section on related product pages</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Models */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Pricing Models</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border-2 border-primary-200 rounded-lg p-4">
                    <div className="text-center mb-3">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-2">
                        <span className="text-blue-600 font-bold">CPC</span>
                      </div>
                      <h4 className="font-bold text-lg">Cost Per Click</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">Pay only when someone clicks on your ad</p>
                    <div className="bg-blue-100 rounded p-3">
                      <p className="text-xs text-gray-700 mb-1">Starting bid:</p>
                      <p className="text-2xl font-bold text-blue-600">₹5-₹20</p>
                      <p className="text-xs text-gray-700 mt-1">per click</p>
                    </div>
                    <div className="mt-3 text-xs text-gray-700">
                      <p className="font-semibold mb-1">Best for:</p>
                      <p>High-value products, electronics, premium items</p>
                    </div>
                  </div>

                  <div className="border-2 border-green-200 rounded-lg p-4">
                    <div className="text-center mb-3">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                        <span className="text-green-600 font-bold">CPM</span>
                      </div>
                      <h4 className="font-bold text-lg">Cost Per 1000 Impressions</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">Pay for every 1000 times your ad is shown</p>
                    <div className="bg-blue-100 rounded p-3">
                      <p className="text-xs text-gray-700 mb-1">Starting bid:</p>
                      <p className="text-2xl font-bold text-green-600">₹100-₹300</p>
                      <p className="text-xs text-gray-700 mt-1">per 1000 views</p>
                    </div>
                    <div className="mt-3 text-xs text-gray-700">
                      <p className="font-semibold mb-1">Best for:</p>
                      <p>Brand awareness, new product launches</p>
                    </div>
                  </div>

                  <div className="border-2 border-purple-200 rounded-lg p-4">
                    <div className="text-center mb-3">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2">
                        <span className="text-purple-600 font-bold">CPA</span>
                      </div>
                      <h4 className="font-bold text-lg">Cost Per Acquisition</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">Pay only when a sale is made</p>
                    <div className="bg-blue-100 rounded p-3">
                      <p className="text-xs text-gray-700 mb-1">Rate:</p>
                      <p className="text-2xl font-bold text-purple-600">5-10%</p>
                      <p className="text-xs text-gray-700 mt-1">of sale price</p>
                    </div>
                    <div className="mt-3 text-xs text-gray-700">
                      <p className="font-semibold mb-1">Best for:</p>
                      <p>Testing new products, minimal risk</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Recommendations */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Budget Recommendations</h3>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-700 mb-1">Starter Budget</p>
                      <p className="text-2xl font-bold text-blue-600 mb-1">₹500-₹2,000</p>
                      <p className="text-xs text-gray-700">per day</p>
                      <p className="text-xs text-gray-700 mt-2">Good for testing, 1-3 products</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 mb-1">Growth Budget</p>
                      <p className="text-2xl font-bold text-green-600 mb-1">₹2,000-₹5,000</p>
                      <p className="text-xs text-gray-700">per day</p>
                      <p className="text-xs text-gray-700 mt-2">Expand reach, 5-10 products</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 mb-1">Scale Budget</p>
                      <p className="text-2xl font-bold text-purple-600 mb-1">₹5,000+</p>
                      <p className="text-xs text-gray-700">per day</p>
                      <p className="text-xs text-gray-700 mt-2">Maximum visibility, 10+ products</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How to Create Campaign */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Creating Your First Campaign</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">1</div>
                    <div>
                      <h4 className="font-semibold">Recharge Ad Wallet</h4>
                      <p className="text-gray-700 text-sm">Add funds to your advertising wallet (minimum ₹500)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">2</div>
                    <div>
                      <h4 className="font-semibold">Select Products</h4>
                      <p className="text-gray-700 text-sm">Choose which products you want to promote</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">3</div>
                    <div>
                      <h4 className="font-semibold">Choose Pricing Model</h4>
                      <p className="text-gray-700 text-sm">Select CPC, CPM, or CPA based on your goals</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">4</div>
                    <div>
                      <h4 className="font-semibold">Set Budget & Bid</h4>
                      <p className="text-gray-700 text-sm">Define daily budget and bid amount</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">5</div>
                    <div>
                      <h4 className="font-semibold">Launch & Monitor</h4>
                      <p className="text-gray-700 text-sm">Activate campaign and track performance metrics</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Track Your Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-blue-100 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-700 mb-1">Impressions</p>
                    <p className="text-sm font-semibold">How many times ad was shown</p>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-700 mb-1">Clicks</p>
                    <p className="text-sm font-semibold">Number of ad clicks</p>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-700 mb-1">CTR</p>
                    <p className="text-sm font-semibold">Click-through rate %</p>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-700 mb-1">Conversions</p>
                    <p className="text-sm font-semibold">Sales from ads</p>
                  </div>
                </div>
              </div>

              {/* Create Campaign CTA */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 mb-2">Ready to Start Advertising?</h4>
                    <p className="text-sm text-purple-800 mb-3">
                      Create your first sponsored ad campaign and start getting more visibility for your products.
                    </p>
                    <Link
                      to="/vendor-dashboard/ads"
                      className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Create Campaign →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Getting Started */}
          <section id="getting-started" className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Getting Started</h2>
                  <p className="text-blue-100">Your journey as a V-Tech vendor</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">1. Complete Your Profile</h3>
                  <p className="text-gray-700 text-sm">Set up your store name, logo, and description</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">2. Submit KYC Documents</h3>
                  <p className="text-gray-700 text-sm">Provide business registration, tax ID, and bank details for verification</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">3. Wait for Approval</h3>
                  <p className="text-gray-700 text-sm">Our team will review your application within 2-3 business days</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">4. List Your Products</h3>
                  <p className="text-gray-700 text-sm">Upload high-quality images, detailed descriptions, and competitive pricing</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">5. Start Selling</h3>
                  <p className="text-gray-700 text-sm">Receive orders, fulfill them promptly, and earn commissions</p>
                </div>
              </div>
            </div>
          </section>

          {/* Payments & Settlements */}
          <section id="payments" className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Payments & Settlements</h2>
                  <p className="text-emerald-100">How you receive your money</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Razorpay Route – Automatic Splits</h3>
                <p className="text-gray-700 mb-4">
                  V-Tech uses Razorpay Route to automatically split every payment. When a customer purchases your product, the platform commission is deducted and your share is transferred to your Razorpay linked account — all automatically.
                </p>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-900 mb-2">Setup Steps:</h4>
                  <ol className="list-decimal pl-6 text-emerald-800 space-y-1 text-sm">
                    <li>Go to <strong>Settlements</strong> in your vendor dashboard</li>
                    <li>Click <strong>"Connect Razorpay Account"</strong> and enter your business details</li>
                    <li>Razorpay verifies your KYC (business name, PAN, bank account)</li>
                    <li>Once activated, payments are automatically split on every order</li>
                  </ol>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Payment Hold Period</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-900 text-sm">
                    <strong>Your funds are held for 7 days after delivery</strong> to cover the customer return window. After this period, payment is automatically released to your Razorpay account. The admin can also release it manually at any time. Razorpay then settles to your bank account within T+2 business days.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Requirements for Payouts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">KYC Documents</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• PAN Card (mandatory for TDS compliance)</li>
                      <li>• Bank account verification</li>
                      <li>• Business registration (if applicable)</li>
                    </ul>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Razorpay Account</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Linked account in "Activated" status</li>
                      <li>• Valid bank account linked</li>
                      <li>• IFSC code verified</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-primary-900 mb-2">View Your Settlements</h4>
                    <p className="text-sm text-primary-800 mb-3">
                      Track all your earnings, held transfers, and payout history in the Settlements section.
                    </p>
                    <Link
                      to="/vendor-dashboard/settlements"
                      className="inline-block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                      Go to Settlements →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Best Practices */}
          <section id="best-practices" className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Best Practices</h2>
                  <p className="text-primary-100">Tips to maximize your success</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                  <h4 className="font-semibold mb-2">High-Quality Images</h4>
                  <p className="text-sm text-gray-700">Use clear, professional photos from multiple angles</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                  <h4 className="font-semibold mb-2">Detailed Descriptions</h4>
                  <p className="text-sm text-gray-700">Provide complete specifications and features</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                  <h4 className="font-semibold mb-2">Competitive Pricing</h4>
                  <p className="text-sm text-gray-700">Research market prices and offer good value</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                  <h4 className="font-semibold mb-2">Fast Shipping</h4>
                  <p className="text-sm text-gray-700">Ship orders within 24-48 hours for better ratings</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                  <h4 className="font-semibold mb-2">Excellent Support</h4>
                  <p className="text-sm text-gray-700">Respond to customer queries within 24 hours</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                  <h4 className="font-semibold mb-2">Regular Updates</h4>
                  <p className="text-sm text-gray-700">Keep inventory and product info current</p>
                </div>
              </div>
            </div>
          </section>

          {/* Help & Support */}
          <section className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-md p-8 text-white text-center">
            <HelpCircle className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Need Help?</h2>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              Our support team is here to help you succeed. Contact us anytime with questions or concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/vendor-dashboard/support"
                className="inline-block bg-white text-blue-600 px-6 py-3 rounded-md hover:bg-primary-50 transition-colors font-medium"
              >
                Contact Support
              </Link>
              <a
                href="mailto:vtechshop.customercare@gmail.com"
                className="inline-block bg-primary-700 text-white px-6 py-3 rounded-md hover:bg-primary-800 transition-colors font-medium"
              >
                Email Us
              </a>
            </div>
          </section>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default VendorGuide;
