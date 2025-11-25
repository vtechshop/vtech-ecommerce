const Privacy = () => {
  return (
    <div className="min-h-screen bg-blue-50 px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-700 mb-8">Last updated: December 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">1.1 Personal Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Name, email address, phone number</li>
                <li>Shipping and billing addresses</li>
                <li>Payment information (processed securely by payment providers)</li>
                <li>Account credentials</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">1.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>IP address, browser type, device information</li>
                <li>Pages visited, time spent on pages</li>
                <li>Referring website addresses</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Process and fulfill your orders</li>
                <li>Communicate about orders, products, and services</li>
                <li>Provide customer support</li>
                <li>Improve our platform and services</li>
                <li>Send promotional emails (with your consent)</li>
                <li>Detect and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">We may share your information with:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Service Providers:</strong> Payment processors, shipping partners, analytics providers</li>
                <li><strong>Vendors:</strong> For order fulfillment (only necessary information)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-700 leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal information.
                However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
              <div className="mt-4 bg-primary-50 border border-primary-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Our Security Measures Include:</h3>
                <ul className="list-disc pl-6 text-primary-800 space-y-1">
                  <li>SSL encryption for data transmission</li>
                  <li>Secure payment gateways (PCI-DSS compliant)</li>
                  <li>Regular security audits</li>
                  <li>Access controls and authentication</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-3">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Opt-out of marketing communications</li>
                <li>Withdraw consent (where applicable)</li>
                <li>Data portability</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                To exercise these rights, contact us at <a href="mailto:ledvtech@gmail.com" className="text-blue-600 hover:underline">ledvtech@gmail.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies and Tracking</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar technologies to enhance your experience. You can control cookies through your browser settings.
                See our <a href="/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</a> for more details.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our services are not directed to children under 18. We do not knowingly collect personal information from children.
                If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your personal information for as long as necessary to provide our services and comply with legal obligations.
                When no longer needed, we securely delete or anonymize your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a notice on our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For questions or concerns about this Privacy Policy or our data practices:
              </p>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700"><strong>Email:</strong> ledvtech@gmail.com</p>
                <p className="text-gray-700"><strong>Phone:</strong> +91 99445 56683</p>
                <p className="text-gray-700"><strong>Address:</strong> Vtech, Ganapathy, Coimbatore</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
