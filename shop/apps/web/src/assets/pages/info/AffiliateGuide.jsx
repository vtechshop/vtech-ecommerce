import { useEffect } from 'react';
import { DollarSign, TrendingUp, Link2, Share2, BarChart3, CheckCircle, AlertCircle, Award, Users, Clock, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { updateMetaTags } from '@/utils/seo';
import ScrollReveal from '@/components/common/ScrollReveal';

const AffiliateGuide = () => {
  useEffect(() => {
    updateMetaTags({
      title: 'Affiliate Guide - VTech Kitchen',
      description: 'Complete guide to VTech Kitchen affiliate program. Learn how to earn 5-8% commissions by promoting products and maximize your earnings.',
      canonical: 'https://www.vtechkitchen.com/page/affiliate-guide',
    });
  }, []);

  return (
    <div className="min-h-screen bg-blue-50 px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Affiliate Guide</h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Everything you need to know about earning commissions as a VTech affiliate partner
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6 text-center">
            <DollarSign className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-green-900 mb-1">5-8%</div>
            <div className="text-sm text-green-700">Commission Rate</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 text-center">
            <Clock className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-blue-900 mb-1">30 Days</div>
            <div className="text-sm text-blue-700">Cookie Tracking</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6 text-center">
            <Award className="w-10 h-10 text-purple-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-purple-900 mb-1">4 Tiers</div>
            <div className="text-sm text-purple-700">Performance Levels</div>
          </div>
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-6 text-center">
            <Target className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <div className="text-3xl font-bold text-primary-900 mb-1">₹500</div>
            <div className="text-sm text-blue-700">Min. Payout</div>
          </div>
        </div>

        <ScrollReveal animation="fadeUp">
        <div className="space-y-12">
          {/* Section 1: Getting Started */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">Getting Started</h2>
            </div>
            <div className="prose prose-lg max-w-none">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">How to Become an Affiliate</h3>
              <ol className="space-y-3 text-gray-700">
                <li>Click "Register" and select "Affiliate" as your account type</li>
                <li>Fill in your personal and payment information</li>
                <li>Verify your email address</li>
                <li>Log in to access your affiliate dashboard</li>
                <li>Get your unique affiliate code and start promoting!</li>
              </ol>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Requirements
                </h4>
                <ul className="space-y-2 text-blue-800 text-sm">
                  <li>• Must be at least 18 years old</li>
                  <li>• Valid email address and phone number</li>
                  <li>• Bank account or UPI for receiving payments</li>
                  <li>• Active social media presence or content platform (recommended)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Commission Structure */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-8 h-8 text-green-600" />
              <h2 className="text-3xl font-bold text-gray-900">Commission Structure</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">How Commissions Work</h3>
                <p className="text-gray-700 mb-4">
                  You earn a percentage of every sale made through your affiliate links. Commission is calculated on the product price (excluding shipping and taxes).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                  <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mb-3">1</div>
                  <h4 className="font-semibold text-green-900 mb-2">Commission Created</h4>
                  <p className="text-sm text-green-800">When customer completes purchase through your link</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
                  <div className="bg-yellow-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mb-3">2</div>
                  <h4 className="font-semibold text-yellow-900 mb-2">Commission Approved</h4>
                  <p className="text-sm text-yellow-800">After successful delivery and return period</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                  <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mb-3">3</div>
                  <h4 className="font-semibold text-purple-900 mb-2">Commission Paid</h4>
                  <p className="text-sm text-purple-800">Monthly payout to your bank account</p>
                </div>
              </div>

              <div className="bg-blue-100 border border-gray-300 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Example Calculation</h4>
                <div className="space-y-2 text-gray-700">
                  <p className="flex justify-between"><span>Customer Purchase:</span><span className="font-semibold">₹10,000</span></p>
                  <p className="flex justify-between"><span>Your Commission (5%):</span><span className="font-bold text-green-600">₹500</span></p>
                  <p className="flex justify-between text-sm text-gray-700"><span>Silver Tier (6%):</span><span>₹600</span></p>
                  <p className="flex justify-between text-sm text-gray-700"><span>Gold Tier (7%):</span><span>₹700</span></p>
                  <p className="flex justify-between text-sm text-gray-700"><span>Platinum Tier (8%):</span><span>₹800</span></p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Tier System */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <h2 className="text-3xl font-bold text-gray-900">Performance Tier System</h2>
            </div>

            <p className="text-gray-700 mb-6">
              Earn higher commission rates as you generate more sales each month. Your tier is calculated based on total monthly sales volume.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-400 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">🥉</span>
                    <h3 className="text-2xl font-bold text-amber-800">Bronze</h3>
                  </div>
                  <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-amber-600">5%</span>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-amber-900">₹10,000+ sales/month</p>
                  <p className="text-sm text-amber-800">Starting tier for all affiliates</p>
                  <ul className="space-y-1 text-sm text-amber-800 mt-3">
                    <li>• 5% commission on all sales</li>
                    <li>• Access to affiliate dashboard</li>
                    <li>• Monthly payouts</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-500 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">🥈</span>
                    <h3 className="text-2xl font-bold text-gray-900">Silver</h3>
                  </div>
                  <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-700">6%</span>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900">₹25,000+ sales/month</p>
                  <p className="text-sm text-gray-900">Growing affiliate status</p>
                  <ul className="space-y-1 text-sm text-gray-900 mt-3">
                    <li>• 6% commission (20% increase!)</li>
                    <li>• Priority support</li>
                    <li>• Advanced analytics</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-500 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">🥇</span>
                    <h3 className="text-2xl font-bold text-yellow-800">Gold</h3>
                  </div>
                  <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-yellow-600">7%</span>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-yellow-900">₹50,000+ sales/month</p>
                  <p className="text-sm text-yellow-800">High-performing affiliate</p>
                  <ul className="space-y-1 text-sm text-yellow-800 mt-3">
                    <li>• 7% commission (40% increase!)</li>
                    <li>• Dedicated account manager</li>
                    <li>• Custom promotional materials</li>
                    <li>• Early product access</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-400 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">💎</span>
                    <h3 className="text-2xl font-bold text-purple-800">Platinum</h3>
                  </div>
                  <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-purple-600">8%</span>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-purple-900">₹1,00,000+ sales/month</p>
                  <p className="text-sm text-purple-800">Elite affiliate partner</p>
                  <ul className="space-y-1 text-sm text-purple-800 mt-3">
                    <li>• 8% commission (60% increase!)</li>
                    <li>• VIP support 24/7</li>
                    <li>• Exclusive product launches</li>
                    <li>• Co-marketing opportunities</li>
                    <li>• Annual bonus incentives</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mt-6">
              <h4 className="font-semibold text-primary-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Tier Progression Tips
              </h4>
              <ul className="space-y-2 text-sm text-primary-800">
                <li>• Tiers are calculated monthly based on total sales volume you generate</li>
                <li>• You can move up or down tiers each month based on performance</li>
                <li>• Focus on promoting high-value products to reach higher tiers faster</li>
                <li>• Build a loyal audience for consistent monthly sales</li>
              </ul>
            </div>
          </section>

          {/* Section 4: Getting Affiliate Links */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <Link2 className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">Getting Your Affiliate Links</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Method 1: Your Unique Affiliate Code
                </h3>
                <p className="text-blue-800 mb-4">
                  Found on your dashboard. Customers can enter this code at checkout to link their purchase to you.
                </p>
                <div className="bg-white border border-blue-300 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">Example Affiliate Code:</p>
                  <code className="text-lg font-mono font-bold text-blue-600">AFF-XXXXX</code>
                  <p className="text-sm text-gray-700 mt-3">Share this code in your bio, posts, or videos</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Method 2: Product-Specific Links
                </h3>
                <p className="text-green-800 mb-4">
                  Browse products and click the "Share" button to get a unique affiliate link for that specific product.
                </p>
                <div className="bg-white border border-green-300 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">Example Product Link:</p>
                  <code className="text-sm font-mono text-green-600 break-all">
                    https://vtech.com/product/wireless-headphones?ref=AFF-XXXXX
                  </code>
                  <p className="text-sm text-gray-700 mt-3">Use these links in blog posts, reviews, and social media</p>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-2">30-Day Cookie Tracking</h4>
                    <p className="text-sm text-yellow-800">
                      When someone clicks your affiliate link, we track their activity for 30 days. Even if they don't purchase immediately, you'll still earn commission if they buy within that window!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Promotion Strategies */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <Share2 className="w-8 h-8 text-orange-600" />
              <h2 className="text-3xl font-bold text-gray-900">Effective Promotion Strategies</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-bold text-green-900 mb-3 text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Best Platforms to Use
                </h3>
                <ul className="space-y-2 text-green-800">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <div>
                      <strong>Instagram:</strong> Stories, posts, reels with product tags
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <div>
                      <strong>YouTube:</strong> Product reviews, unboxing, tutorials
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <div>
                      <strong>Blogs:</strong> Detailed reviews, comparisons, buying guides
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <div>
                      <strong>Facebook:</strong> Community groups, page posts (with permission)
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <div>
                      <strong>WhatsApp:</strong> Status updates, personal contacts
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="font-bold text-purple-900 mb-3 text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  High-Converting Content Ideas
                </h3>
                <ul className="space-y-2 text-purple-800">
                  <li className="flex items-start gap-2">
                    <span>📋</span>
                    <div>"Top 5 Best..." product lists</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>📦</span>
                    <div>Unboxing and first impressions</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>⚡</span>
                    <div>Before/after comparisons</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🎯</span>
                    <div>Problem-solving guides</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🎁</span>
                    <div>Seasonal gift guides</div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>💡</span>
                    <div>How-to tutorials using products</div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="font-bold text-red-900 mb-3 text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Prohibited Activities - DO NOT Do These!
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-red-800">
                <ul className="space-y-2">
                  <li>❌ Spamming or unsolicited messaging</li>
                  <li>❌ False or misleading product claims</li>
                  <li>❌ Impersonating VTech or employees</li>
                  <li>❌ Cookie stuffing or click fraud</li>
                </ul>
                <ul className="space-y-2">
                  <li>❌ Self-referrals or fake purchases</li>
                  <li>❌ Bidding on VTech branded keywords (PPC)</li>
                  <li>❌ Using copyrighted content without permission</li>
                  <li>❌ Violating platform terms of service</li>
                </ul>
              </div>
              <p className="text-sm text-red-900 mt-4 font-semibold">
                Violation of these rules may result in immediate account termination and forfeiture of unpaid commissions.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
              <h3 className="font-bold text-blue-900 mb-3 text-lg">Disclosure Requirements</h3>
              <p className="text-blue-800 mb-4">
                You MUST clearly disclose your affiliate relationship when promoting products. This is required by law in most countries.
              </p>
              <div className="bg-white border border-blue-300 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">Example Disclosure:</p>
                <p className="text-sm text-gray-700 italic">
                  "This post contains affiliate links. I may earn a commission if you make a purchase through these links at no extra cost to you."
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Tracking & Analytics */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-8 h-8 text-indigo-600" />
              <h2 className="text-3xl font-bold text-gray-900">Tracking Your Performance</h2>
            </div>

            <p className="text-gray-700 mb-6">
              Your affiliate dashboard provides real-time insights into your performance. Here's what you can track:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
                <h4 className="font-semibold text-indigo-900 mb-3">Key Metrics</h4>
                <ul className="space-y-2 text-sm text-indigo-800">
                  <li>• <strong>Total Clicks:</strong> How many people clicked your links</li>
                  <li>• <strong>Conversions:</strong> Number of completed purchases</li>
                  <li>• <strong>Conversion Rate:</strong> Percentage of clicks that convert</li>
                  <li>• <strong>Total Earnings:</strong> All-time commission earned</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                <h4 className="font-semibold text-green-900 mb-3">Commission Tracking</h4>
                <ul className="space-y-2 text-sm text-green-800">
                  <li>• <strong>Pending:</strong> Orders not yet delivered</li>
                  <li>• <strong>Approved:</strong> Ready for next payout</li>
                  <li>• <strong>Paid:</strong> Already transferred to you</li>
                  <li>• <strong>Rejected:</strong> Returned/refunded orders</li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                <h4 className="font-semibold text-purple-900 mb-3">Performance Charts</h4>
                <ul className="space-y-2 text-sm text-purple-800">
                  <li>• Weekly earnings trend graph</li>
                  <li>• Commission breakdown by status</li>
                  <li>• Top-performing products</li>
                  <li>• Click vs conversion analysis</li>
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                <h4 className="font-semibold text-orange-900 mb-3">Optimization Tips</h4>
                <ul className="space-y-2 text-sm text-orange-800">
                  <li>• Focus on products with higher conversion rates</li>
                  <li>• Test different content formats</li>
                  <li>• Track which platforms perform best</li>
                  <li>• Optimize your call-to-action messages</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 7: Payment Information */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-8 h-8 text-green-600" />
              <h2 className="text-3xl font-bold text-gray-900">Payment Information</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">How You Get Paid (Razorpay Route)</h3>
                <p className="text-gray-700 mb-4">
                  VTech uses Razorpay Route to automatically split payments. Your commission share is held on Razorpay and released after the order is delivered and the return window expires.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <ol className="list-decimal pl-6 text-blue-800 space-y-2 text-sm">
                    <li><strong>Customer Pays:</strong> Your commission is automatically split and held on Razorpay</li>
                    <li><strong>Order Delivered:</strong> Commission auto-approved</li>
                    <li><strong>7-Day Return Window:</strong> Funds remain on hold</li>
                    <li><strong>Auto-Released:</strong> After 7 days, payment is automatically released (admin can also release manually)</li>
                    <li><strong>TDS Deducted:</strong> 2% TDS deducted, net amount sent to your bank</li>
                  </ol>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Payment Details</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Minimum Payout:</strong> ₹500</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Below Threshold:</strong> Balance carries over</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Method:</strong> Bank Transfer (NEFT/IMPS) via Razorpay</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Settlement:</strong> T+2 business days after release</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Requirements</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span><strong>PAN Card</strong> (mandatory for TDS)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Bank Account</strong> verified via KYC</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span><strong>KYC Approved</strong> by admin</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-900 mb-2">TDS (Tax Deducted at Source) – 2%</h4>
                  <p className="text-sm text-amber-800 mb-2">
                    As per Section 194H of the Indian Income Tax Act, <strong>2% TDS is deducted</strong> on all affiliate commission payouts. You receive the net amount after TDS deduction.
                  </p>
                  <p className="text-sm text-amber-800">
                    <strong>Example:</strong> Commission ₹500 → TDS (2%): ₹10 → You receive: ₹490. You can claim TDS credit when filing your Income Tax Return (ITR). See <Link to="/page/affiliate-terms#tds" className="underline font-semibold">Affiliate Terms Section 4.3</Link> for full details.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg shadow-md p-10 text-center">
            <Award className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Ready to Start Earning?</h2>
            <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
              Join thousands of affiliates already earning commissions by promoting VTech products!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register?role=affiliate"
                className="inline-block bg-primary-600 text-white px-8 py-4 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-lg shadow-md"
              >
                Become an Affiliate
              </a>
              <a
                href="/page/affiliate-terms"
                className="inline-block bg-white text-blue-600 border-2 border-primary-600 px-8 py-4 rounded-lg hover:bg-primary-50 transition-colors font-semibold text-lg"
              >
                Read Full Terms
              </a>
            </div>
          </section>

          {/* Support Section */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Need Help?</h2>
            <p className="text-gray-700 text-center mb-6">
              Our affiliate support team is here to help you succeed
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-100 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Email Support</h4>
                <p className="text-sm text-gray-700">vtechshop.customercare@gmail.com</p>
              </div>
              <div className="text-center p-4 bg-blue-100 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Phone Support</h4>
                <p className="text-sm text-gray-700">+91 99445 56683</p>
              </div>
              <div className="text-center p-4 bg-blue-100 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">FAQ</h4>
                <Link to="/page/faq" className="text-sm text-blue-600 hover:text-blue-700">
                  Visit FAQ Page →
                </Link>
              </div>
            </div>
          </section>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default AffiliateGuide;
