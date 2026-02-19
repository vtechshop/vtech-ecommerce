import { useEffect } from 'react';
import { updateMetaTags } from '@/utils/seo';
import ScrollReveal from '@/components/common/ScrollReveal';

const AffiliateTerms = () => {
  useEffect(() => {
    updateMetaTags({
      title: 'Affiliate Program Terms & Conditions - V-Tech Kitchen',
      description: 'Terms and conditions for V-Tech Kitchen affiliate program. Learn about commission rates, payment terms, promotional guidelines, and partner responsibilities.',
      canonical: 'https://www.vtechkitchen.com/page/affiliate-terms',
    });
  }, []);

  return (
    <div className="min-h-screen bg-white px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        <ScrollReveal animation="fadeUp">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Affiliate Program Terms & Conditions</h1>
          <p className="text-gray-700 mb-8">Last updated: January 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Program Overview</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Vtech Affiliate Program allows you to earn commissions by promoting our products and driving sales through your unique affiliate links.
              </p>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">How It Works</h3>
                <ul className="space-y-2 text-primary-800">
                  <li>1. Sign up as an affiliate</li>
                  <li>2. Get your unique affiliate code/link</li>
                  <li>3. Share products on your platforms</li>
                  <li>4. Earn commission on each sale</li>
                  <li>5. Receive monthly payouts</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Affiliate Registration</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>You must be at least 18 years old</li>
                <li>Provide accurate personal and payment information</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Applications are subject to approval</li>
                <li>We reserve the right to reject any application</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Commission Structure</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                <h3 className="font-semibold text-green-900 mb-3">Commission Rates</h3>
                <ul className="space-y-2 text-green-800">
                  <li>• Standard Commission: 5% on all sales</li>
                  <li>• Premium Products: Up to 10% commission</li>
                  <li>• Promotional Campaigns: Special rates may apply</li>
                  <li>• High Performance Bonus: Additional 2% for top affiliates</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Commission Calculation</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Commission is based on the product sale price (excludes shipping and taxes)</li>
                <li>30-day cookie attribution window</li>
                <li>Last-click attribution model</li>
                <li>Commission is earned after successful delivery</li>
                <li>Returns and refunds will deduct from your commission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Payment Terms</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Payment Flow (Razorpay Route)</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                V-Tech uses Razorpay Route to automatically split payments. When a customer purchases through your affiliate link, your commission share is held securely on Razorpay.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <ol className="list-decimal pl-6 text-blue-800 space-y-2">
                  <li><strong>Order Placed:</strong> Commission created (status: Pending), your share held on Razorpay</li>
                  <li><strong>Order Delivered:</strong> Commission auto-approved (status: Approved)</li>
                  <li><strong>7-Day Return Window:</strong> Funds remain on hold to cover potential returns</li>
                  <li><strong>Auto-Release:</strong> After 7 days, payment is automatically released (admin can also release manually)</li>
                  <li><strong>Bank Settlement:</strong> Net amount (after 2% TDS) settled to your bank account</li>
                </ol>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Payment Schedule & Methods</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Minimum payout threshold: ₹500</li>
                <li>If threshold not met, balance carries over</li>
                <li>Payment via <strong>Bank Transfer (NEFT/IMPS)</strong> through Razorpay</li>
                <li>You must complete KYC (PAN + Bank verification) to receive payouts</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4" id="tds">4.3 Tax Deducted at Source (TDS)</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-2">
                <p className="text-amber-900 font-semibold mb-3">TDS Deduction - 2% on All Payouts</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                  <li>As per <strong>Section 194H of the Indian Income Tax Act</strong>, 2% TDS (Tax Deducted at Source) is deducted on all affiliate commission payouts.</li>
                  <li>TDS is deducted at the time of payment, not at the time of earning.</li>
                  <li>The TDS amount will be clearly shown in your commission dashboard.</li>
                  <li>You will receive the <strong>net amount</strong> (commission minus TDS) in your bank account.</li>
                </ul>
                <div className="bg-white border border-amber-300 rounded p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Example:</p>
                  <p className="text-sm text-gray-700">
                    Commission Earned: <strong>₹500</strong> |
                    TDS (2%): <strong className="text-red-600">-₹10</strong> |
                    Net Payout: <strong className="text-green-700">₹490</strong>
                  </p>
                </div>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>You can claim TDS credit while filing your <strong>Income Tax Return (ITR)</strong>.</li>
                  <li>TDS details will be reflected under your PAN in Form 26AS / AIS on the Income Tax portal.</li>
                  <li>If your annual income is below the taxable limit, you may apply for a <strong>lower/nil TDS certificate</strong> under Section 197 and submit it to us.</li>
                  <li>Vtech will file quarterly TDS returns (Form 26Q) with the Income Tax Department.</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-4">
                <p className="text-yellow-900">
                  <strong>Note:</strong> You are responsible for filing your income tax returns and paying any additional taxes on your commission earnings beyond TDS. Please consult a tax professional for advice specific to your situation.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Promotional Guidelines</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">5.1 Permitted Promotion Methods</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Social media posts (Instagram, Facebook, Twitter, etc.)</li>
                <li>YouTube videos and reviews</li>
                <li>Blog posts and articles</li>
                <li>Email marketing (with proper consent)</li>
                <li>WhatsApp sharing (personal contacts only)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">5.2 Prohibited Activities</h3>
              <ul className="list-disc pl-6 text-red-700 space-y-2">
                <li>Spamming or unsolicited messaging</li>
                <li>False or misleading claims about products</li>
                <li>Using copyrighted material without permission</li>
                <li>Impersonating Vtech or its employees</li>
                <li>Bidding on branded keywords (PPC campaigns)</li>
                <li>Cookie stuffing or click fraud</li>
                <li>Self-referrals or fraudulent transactions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Affiliate Links & Tracking</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Each affiliate receives a unique tracking code</li>
                <li>30-day cookie duration for tracking referrals</li>
                <li>Do not modify or manipulate affiliate links</li>
                <li>Links can be used on any approved platform</li>
                <li>Track your performance through the affiliate dashboard</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Marketing Materials</h2>
              <p className="text-gray-700 leading-relaxed mb-4">We provide:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Product images and banners</li>
                <li>Product descriptions and copy</li>
                <li>Promotional graphics</li>
                <li>Email templates</li>
                <li>Social media post ideas</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                You may create your own content but must ensure it's accurate and doesn't misrepresent our brand.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Disclosure Requirements</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You must clearly disclose your affiliate relationship when promoting our products:
              </p>
              <div className="bg-blue-100 border-l-4 border-primary-600 p-6">
                <p className="text-gray-700 italic">
                  Example: "This post contains affiliate links. I may earn a commission if you make a purchase through these links at no extra cost to you."
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Performance Bonuses</h2>
              <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-6">
                <h3 className="font-semibold text-secondary-900 mb-3">Tier System</h3>
                <ul className="space-y-2 text-secondary-800">
                  <li>• Bronze (₹10,000+/month): 5% commission</li>
                  <li>• Silver (₹25,000+/month): 6% commission</li>
                  <li>• Gold (₹50,000+/month): 7% commission</li>
                  <li>• Platinum (₹1,00,000+/month): 8% commission + special perks</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">10.1 By You</h3>
              <p className="text-gray-700 mb-4">
                You may terminate your affiliate account at any time. Unpaid commissions above the minimum threshold will be paid out in the next payment cycle.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">10.2 By Vtech</h3>
              <p className="text-gray-700 mb-2">We may terminate your account for:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Violation of these terms</li>
                <li>Fraudulent activity</li>
                <li>Unethical promotion practices</li>
                <li>Inactivity for 6+ months</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Reporting & Analytics</h2>
              <p className="text-gray-700 leading-relaxed">
                Access your affiliate dashboard to view:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Real-time click tracking</li>
                <li>Conversion rates</li>
                <li>Commission earnings</li>
                <li>Top-performing products</li>
                <li>Payment history</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Support</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For affiliate program support:
              </p>
              <div className="bg-blue-100 rounded-lg p-6">
                <p className="text-gray-700"><strong>Email:</strong> vtechshop.customercare@gmail.com</p>
                <p className="text-gray-700"><strong>Phone:</strong> +91 99445 56683</p>
                <p className="text-gray-700"><strong>Affiliate Dashboard:</strong> Log in for resources and support</p>
              </div>
            </section>

            <div className="bg-gradient-to-r from-primary-50 to-primary-50 rounded-lg p-8 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Start Earning?</h3>
              <p className="text-gray-700 mb-4">Join our affiliate program and start earning commissions today!</p>
              <a
                href="/register?role=affiliate"
                className="inline-block bg-primary-600 text-white px-8 py-3 rounded-md hover:bg-primary-700 transition-colors font-medium"
              >
                Become an Affiliate
              </a>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default AffiliateTerms;
