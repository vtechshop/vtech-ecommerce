import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div className="min-h-screen bg-blue-50 px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-700 mb-8">Last updated: December 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using Vtech's e-commerce platform, you accept and agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use our services.
              </p>
              <p>This website is operated by RADHA AND CO</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Use of Service</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Eligibility</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You must be at least 18 years old to use our services. By using our platform, you represent that you are of legal age to form a binding contract.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Account Registration</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for maintaining account security</li>
                <li>You must notify us immediately of any unauthorized access</li>
                <li>One person may not create multiple accounts</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Products and Services</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Product Information</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We strive to display accurate product information. However, we do not warrant that product descriptions, pricing, or other content is accurate, complete, reliable, current, or error-free.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Pricing</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>All prices are in Indian Rupees (INR) unless otherwise stated</li>
                <li>Prices are subject to change without notice</li>
                <li>We reserve the right to correct pricing errors</li>
                <li>Applicable taxes will be added at checkout</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Orders and Payment</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Order Acceptance</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your order is an offer to purchase products. We reserve the right to accept or decline any order for any reason.
                We may require additional verification or information before accepting orders.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Payment</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Payment must be made at the time of order placement</li>
                <li>We accept various payment methods as displayed during checkout</li>
                <li>All transactions are processed through secure payment gateways</li>
                <li>Cash on Delivery is available for eligible orders</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Shipping and Delivery</h2>
              <p className="text-gray-700 leading-relaxed">
                Delivery times are estimates and not guaranteed. We are not liable for delays caused by courier services,
                weather conditions, or other circumstances beyond our control. See our <Link to="/page/shipping" className="text-blue-600 hover:underline">Shipping Policy</Link> for details.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Returns and Refunds</h2>
              <p className="text-gray-700 leading-relaxed">
                We offer a 30-day return policy for eligible products. Please review our <Link to="/page/returns" className="text-blue-600 hover:underline">Returns & Refunds Policy</Link> for complete details.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. User Conduct</h2>
              <p className="text-gray-700 leading-relaxed mb-3">You agree not to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Submit false or misleading information</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use our platform for fraudulent purposes</li>
                <li>Interfere with other users' use of the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                All content on this platform, including text, graphics, logos, images, and software, is the property of Vtech or its content suppliers and is protected by intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                Vtech shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability shall not exceed the amount you paid for the products purchased.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Indemnification</h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to indemnify and hold Vtech harmless from any claims, damages, or expenses arising from your use of our platform or violation of these terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Termination</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to terminate or suspend your account at any time for violations of these terms or for any other reason at our discretion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms of Service shall be governed by and construed in accordance with the laws of India.
                Any disputes shall be subject to the exclusive jurisdiction of the courts in Coimbatore, Tamil Nadu, India.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting.
                Your continued use of the platform constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="mt-4 bg-blue-100 rounded-lg p-6">
                <p className="text-gray-700"><strong>Email:</strong> vtechshop.customercare@gmail.com</p>
                <p className="text-gray-700"><strong>Phone:</strong> +91 99445 56683</p>
                <p className="text-gray-700"><strong>Address:</strong> V-Tech Shop, 464, Sathy Rd, Ganapathy, Coimbatore, Tamil Nadu 641006</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
