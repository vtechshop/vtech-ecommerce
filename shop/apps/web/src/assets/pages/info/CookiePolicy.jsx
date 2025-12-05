const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-blue-50 px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
          <p className="text-gray-700 mb-8">Last updated: December 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What Are Cookies?</h2>
              <p className="text-gray-700 leading-relaxed">
                Cookies are small text files that are placed on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Types of Cookies We Use</h2>

              <div className="space-y-6">
                <div className="bg-primary-50 border-l-4 border-primary-500 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Essential Cookies</h3>
                  <p className="text-gray-700 mb-2">These cookies are necessary for the website to function properly.</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Authentication and security</li>
                    <li>Shopping cart functionality</li>
                    <li>Session management</li>
                  </ul>
                </div>

                <div className="bg-green-50 border-l-4 border-green-500 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Performance Cookies</h3>
                  <p className="text-gray-700 mb-2">Help us understand how visitors interact with our website.</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Page visit analytics</li>
                    <li>Error tracking</li>
                    <li>Performance monitoring</li>
                  </ul>
                </div>

                <div className="bg-secondary-50 border-l-4 border-secondary-500 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Functional Cookies</h3>
                  <p className="text-gray-700 mb-2">Remember your preferences and provide enhanced features.</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Language preferences</li>
                    <li>Recently viewed products</li>
                    <li>Wishlist items</li>
                  </ul>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-500 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">4. Marketing Cookies</h3>
                  <p className="text-gray-700 mb-2">Used to deliver relevant advertisements and track campaign effectiveness.</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Retargeting ads</li>
                    <li>Social media integration</li>
                    <li>Affiliate tracking</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may use third-party services that place cookies on your device:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Google Analytics:</strong> Website traffic analysis</li>
                <li><strong>Facebook Pixel:</strong> Social media advertising</li>
                <li><strong>Payment Providers:</strong> Secure payment processing</li>
                <li><strong>CDN Services:</strong> Content delivery and performance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Managing Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can control and manage cookies in several ways:
              </p>

              <div className="bg-gray-50 rounded-lg p-6 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3">Browser Settings</h3>
                <p className="text-gray-700 mb-2">Most browsers allow you to:</p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>View and delete cookies</li>
                  <li>Block third-party cookies</li>
                  <li>Block all cookies</li>
                  <li>Clear cookies when closing the browser</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <p className="text-yellow-900">
                  <strong>Note:</strong> Blocking or deleting cookies may affect your experience on our website and limit certain features.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookie Consent</h2>
              <p className="text-gray-700 leading-relaxed">
                When you first visit our website, you'll see a cookie banner asking for your consent. You can choose to accept all cookies or customize your preferences.
                You can change your cookie preferences at any time through our cookie settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions about our use of cookies:
              </p>
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700"><strong>Email:</strong> vtechshop.customercare@gmail.com</p>
                <p className="text-gray-700"><strong>Phone:</strong> +91 99445 56683</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
