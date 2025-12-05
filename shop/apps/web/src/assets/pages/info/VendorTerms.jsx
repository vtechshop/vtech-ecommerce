import { Link } from 'react-router-dom';

const VendorTerms = () => {
  return (
    <div className="min-h-screen bg-blue-50 px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Vendor Terms & Conditions</h1>
          <p className="text-gray-700 mb-8">Last updated: December 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Vendor Registration</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By registering as a vendor on Vtech, you agree to these terms and conditions.
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>You must provide accurate business information</li>
                <li>You must have the legal right to sell the products you list</li>
                <li>Your business must comply with all applicable laws</li>
                <li>You must maintain valid licenses and permits</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Product Listings</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Product Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide accurate product descriptions</li>
                <li>Use high-quality product images</li>
                <li>Set competitive and accurate pricing</li>
                <li>Maintain updated inventory levels</li>
                <li>Comply with product listing guidelines</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.2 Prohibited Items</h3>
              <p className="text-gray-700 mb-2">You may not list:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Counterfeit or unauthorized goods</li>
                <li>Illegal or restricted items</li>
                <li>Products that violate intellectual property rights</li>
                <li>Hazardous materials (without proper authorization)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Commission & Fees</h2>
              <div className="mb-4 p-4 bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-blue-500 rounded-lg">
                <p className="font-bold text-blue-700 text-xl mb-2">Default Commission Rate: 15%</p>
                <p className="text-gray-900">You keep <strong>85% of each sale</strong>, V-Tech platform takes 15% commission.</p>
                <p className="text-sm text-gray-700 mt-2"><strong>Example:</strong> Sell for ₹1,000 → You earn ₹850, Commission ₹150</p>
              </div>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Category-Specific Commission Rates</h3>
                <ul className="space-y-2 text-primary-800">
                  <li>• <strong>Electronics & Tech:</strong> 12-15% (Lower margins, higher volume)</li>
                  <li>• <strong>Fashion & Accessories:</strong> 15-20% (Higher margin products)</li>
                  <li>• <strong>Home & Garden:</strong> 12-18% (Varies by product type)</li>
                  <li>• <strong>Books & Media:</strong> 10-12% (Standardized pricing)</li>
                  <li>• <strong>Other Categories:</strong> 12-18% (Product-dependent)</li>
                </ul>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Commission rates are deducted from the product sale price (before tax and shipping). Commission is created when order is placed, approved after delivery, and paid to your bank account. Track all earnings in your Settlements dashboard.
              </p>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-1">Want to learn more?</p>
                <p className="text-sm text-blue-800">Visit our <Link to="/page/vendor-guide" className="underline font-semibold">Vendor Guide</Link> for detailed commission calculations and payment timelines.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Order Fulfillment</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Processing Time</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Orders must be processed within 24-48 hours</li>
                <li>Products must be shipped within the promised timeframe</li>
                <li>Update tracking information promptly</li>
                <li>Notify customers of any delays</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.2 Packaging</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Use appropriate packaging materials</li>
                <li>Ensure products are well-protected</li>
                <li>Include all necessary documentation</li>
                <li>Follow branding guidelines (if applicable)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Payments & Settlements</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Payments are processed on a weekly/bi-weekly basis</li>
                <li>Minimum payout threshold: ₹500</li>
                <li>Payments are made via bank transfer</li>
                <li>Provide valid bank account details</li>
                <li>Payments are subject to successful delivery and no returns</li>
              </ul>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-4">
                <p className="text-yellow-900">
                  <strong>Note:</strong> Funds may be held for 7-14 days after delivery to account for potential returns and refunds.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Returns & Refunds</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Honor the platform's 30-day return policy</li>
                <li>Accept and process valid return requests</li>
                <li>Inspect returned products within 3 business days</li>
                <li>Refunds for vendor errors are your responsibility</li>
                <li>Platform will mediate disputes between vendors and customers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Customer Service</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Respond to customer inquiries within 24 hours</li>
                <li>Maintain professional communication</li>
                <li>Resolve customer issues promptly</li>
                <li>Cooperate with platform support team</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Performance Metrics</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Vendors are evaluated based on:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Order fulfillment rate (target: 95%+)</li>
                <li>Cancellation rate (target: &lt;5%)</li>
                <li>Return rate (target: &lt;10%)</li>
                <li>Customer satisfaction rating (target: 4.0+/5)</li>
                <li>Response time to customer queries</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Account Suspension</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your vendor account may be suspended or terminated for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Violation of these terms</li>
                <li>Selling counterfeit or prohibited products</li>
                <li>Poor performance metrics</li>
                <li>Customer complaints or fraud</li>
                <li>Non-compliance with legal requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Intellectual Property</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>You retain ownership of your product content</li>
                <li>You grant Vtech license to display your content</li>
                <li>You must respect others' intellectual property rights</li>
                <li>Report any IP infringement to us immediately</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                Vendors are responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Product quality and authenticity</li>
                <li>Accurate product information</li>
                <li>Product-related liabilities and warranties</li>
                <li>Tax compliance</li>
                <li>Legal compliance for products sold</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact & Support</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For vendor support and inquiries:
              </p>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700"><strong>Email:</strong> vtechshop.customercare@gmail.com</p>
                <p className="text-gray-700"><strong>Phone:</strong> +91 99445 56683</p>
                <p className="text-gray-700"><strong>Vendor Portal:</strong> Log in to your vendor dashboard</p>
              </div>
            </section>

            <div className="bg-gradient-to-r from-primary-50 to-primary-50 rounded-lg p-8 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Start Selling?</h3>
              <p className="text-gray-700 mb-4">Join our growing community of successful vendors</p>
              <a
                href="/register?role=vendor"
                className="inline-block bg-primary-600 text-white px-8 py-3 rounded-md hover:bg-primary-700 transition-colors font-medium"
              >
                Become a Vendor
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorTerms;
