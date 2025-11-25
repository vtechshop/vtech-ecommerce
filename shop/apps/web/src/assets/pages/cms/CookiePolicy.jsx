// FILE: apps/web/src/pages/cms/CookiePolicy.jsx
import { Link } from 'react-router-dom';
import ConsentPreferences from '@/components/consent/ConsentPreferences';

const CookiePolicy = () => {
  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Cookie Policy</h1>
        
        <div className="prose prose-lg max-w-none mb-12">
          <p className="text-gray-700 text-lg mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">What Are Cookies</h2>
            <p className="text-gray-700 mb-4">
              Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
              They are widely used to make websites work more efficiently and provide information to website owners.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">How We Use Cookies</h2>
            <p className="text-gray-700 mb-4">
              We use cookies for several reasons detailed below. Unfortunately, in most cases, there are no industry-standard 
              options for disabling cookies without completely disabling the functionality and features they add to this site.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Types of Cookies We Use</h2>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Essential Cookies</h3>
              <p className="text-gray-700 mb-2">
                These cookies are essential for you to browse the website and use its features, such as accessing secure 
                areas of the site. Without these cookies, services you have asked for cannot be provided.
              </p>
              <ul className="list-disc list-inside text-gray-700 ml-4">
                <li>Session management cookies</li>
                <li>Authentication cookies</li>
                <li>Security cookies</li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Analytics Cookies</h3>
              <p className="text-gray-700 mb-2">
                These cookies collect information about how visitors use our website, such as which pages visitors go to 
                most often. These cookies don't collect information that identifies a visitor directly.
              </p>
              <ul className="list-disc list-inside text-gray-700 ml-4">
                <li>Google Analytics (_ga, _gid, _gat)</li>
                <li>Page view tracking</li>
                <li>User behavior analysis</li>
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Marketing Cookies</h3>
              <p className="text-gray-700 mb-2">
                These cookies are used to track visitors across websites. The intention is to display ads that are 
                relevant and engaging for the individual user.
              </p>
              <ul className="list-disc list-inside text-gray-700 ml-4">
                <li>Meta Pixel (Facebook)</li>
                <li>Affiliate tracking cookies</li>
                <li>Ad campaign cookies</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Third-Party Cookies</h2>
            <p className="text-gray-700 mb-4">
              In some special cases, we also use cookies provided by trusted third parties. The following section details 
              which third-party cookies you might encounter through this site:
            </p>
            <ul className="list-disc list-inside text-gray-700 ml-4">
              <li>
                <strong>Google Analytics:</strong> We use Google Analytics to understand how you use the site and ways 
                we can improve your experience.
              </li>
              <li>
                <strong>Payment Processors:</strong> When you make a purchase, payment processors may set cookies to 
                facilitate the transaction.
              </li>
              <li>
                <strong>Social Media:</strong> Social media cookies allow you to connect with social networks and share 
                content from our website.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Managing Cookies</h2>
            <p className="text-gray-700 mb-4">
              You can control and manage cookies in various ways. Please keep in mind that removing or blocking cookies 
              can negatively impact your user experience and parts of our website may no longer be fully accessible.
            </p>
            <p className="text-gray-700 mb-4">
              Most browsers automatically accept cookies, but you can choose whether or not to accept cookies through 
              your browser controls, often found in your browser's "Tools" or "Preferences" menu.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Cookie Consent</h2>
            <p className="text-gray-700 mb-4">
              When you first visit our website, you will be asked to consent to our use of cookies. You can change your 
              cookie preferences at any time by clicking the button below or visiting the consent preferences page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">More Information</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about our use of cookies or other technologies, please contact us:
            </p>
            <ul className="list-none text-gray-700">
              <li>Email: privacy@shop.example</li>
              <li>Phone: +1 (555) 123-4567</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Updates to This Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other 
              operational, legal, or regulatory reasons.
            </p>
          </section>
        </div>

        {/* Cookie Preferences Section */}
        <div className="border-t pt-8">
          <ConsentPreferences />
        </div>

        <div className="mt-12 text-center">
          <Link to="/" className="text-blue-600 hover:underline font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;