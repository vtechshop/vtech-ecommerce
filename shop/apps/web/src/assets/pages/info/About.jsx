import { Users, Target, Eye, Shield, Heart, Lightbulb, MapPin, Mail, Phone, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="min-h-screen bg-blue-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full mb-6">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            About <span className="text-blue-600">Vtech</span>
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Your Trusted Multi-Vendor Marketplace - Connecting Quality Vendors with Customers Across India
          </p>
        </div>

        {/* Main Content Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Who We Are */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mr-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Who We Are</h2>
            </div>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                Welcome to <strong className="text-blue-600">Vtech</strong>, a leading multi-vendor e-commerce platform
                based in Ganapathy, Coimbatore. We connect quality vendors with customers across India, creating a
                seamless online shopping experience.
              </p>
              <p>
                Our platform empowers vendors to showcase their products to a wide audience while providing customers
                with access to a diverse range of quality products at competitive prices.
              </p>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                To create a thriving digital marketplace that connects vendors and customers, fostering trust, quality,
                and convenience in online shopping. We strive to empower small and medium businesses by providing them
                with a platform to reach customers nationwide.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center mr-4">
                  <Eye className="w-6 h-6 text-secondary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Our Vision</h2>
              </div>
              <p className="text-gray-700 leading-relaxed">
                To become India's most trusted multi-vendor marketplace, known for quality products, excellent customer service,
                and empowering entrepreneurs to succeed in the digital economy.
              </p>
            </div>
          </div>
        </div>

        {/* What We Offer */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What We Offer</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Comprehensive solutions for customers, vendors, and affiliates in our ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">For Customers</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Wide selection of quality products
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Competitive prices
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Secure payment options
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Fast shipping & delivery
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Easy returns & refunds
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  24/7 customer support
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">For Vendors</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Easy vendor registration
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Reach nationwide customers
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Competitive commission rates (5-15%)
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Complete vendor dashboard
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Marketing & advertising tools
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Timely settlements & payments
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-secondary-500 rounded-xl flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">For Affiliates</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start">
                  <span className="text-secondary-500 mr-2">•</span>
                  Earn commission on referrals (5-10%)
                </li>
                <li className="flex items-start">
                  <span className="text-secondary-500 mr-2">•</span>
                  Unique tracking codes
                </li>
                <li className="flex items-start">
                  <span className="text-secondary-500 mr-2">•</span>
                  Performance-based bonuses
                </li>
                <li className="flex items-start">
                  <span className="text-secondary-500 mr-2">•</span>
                  Monthly payouts
                </li>
                <li className="flex items-start">
                  <span className="text-secondary-500 mr-2">•</span>
                  Marketing materials provided
                </li>
                <li className="flex items-start">
                  <span className="text-secondary-500 mr-2">•</span>
                  Dedicated affiliate support
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">Our Platform</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  Secure & reliable
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  User-friendly interface
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  Mobile responsive
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  Advanced search & filters
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  Multiple payment options
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  Order tracking system
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Why Choose Vtech */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Vtech?</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Discover what makes us the preferred choice for millions of customers and vendors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">Quality Assurance</h3>
                  <p className="text-gray-700 leading-relaxed">
                    We carefully vet all vendors to ensure only quality products reach our customers.
                    Every product undergoes rigorous quality checks before being listed on our platform.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">Secure Transactions</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Your payment information is protected with industry-standard encryption and security measures.
                    We use PCI-DSS compliant payment gateways for all transactions.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-secondary-500 to-secondary-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">Customer-First Approach</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Our dedicated support team is always ready to assist you with any questions or concerns.
                    We prioritize customer satisfaction above everything else.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-xl">4</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">Vendor Support</h3>
                  <p className="text-gray-700 leading-relaxed">
                    We provide comprehensive tools and support to help vendors succeed and grow their business.
                    Our vendor success team ensures every vendor thrives on our platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Our Values */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-4 text-xl">Trust</h3>
              <p className="text-gray-700 leading-relaxed">
                Building lasting relationships through transparency, reliability, and integrity in everything we do.
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-4 text-xl">Quality</h3>
              <p className="text-gray-700 leading-relaxed">
                Committed to offering only the best products and services, maintaining the highest quality standards.
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-20 h-20 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-4 text-xl">Innovation</h3>
              <p className="text-gray-700 leading-relaxed">
                Continuously improving our platform for better user experience and staying ahead of industry trends.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mb-16">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-700">Get in touch with us</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Address</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Vtech<br />
                    Ganapathy<br />
                    Coimbatore, Tamil Nadu<br />
                    India
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Email</h3>
                  <p className="text-gray-700">ledvtech@gmail.com</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-secondary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Phone</h3>
                  <p className="text-gray-700">+91 99445 56683</p>
                </div>
              </div>

              <div className="flex gap-4 md:col-span-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Business Hours</h3>
                  <p className="text-gray-700">Mon-Sat, 9:00 AM - 7:00 PM IST</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 rounded-2xl p-8 text-center text-white shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-4">Join the Vtech Community</h3>
            <p className="text-lg mb-8 opacity-90">
              Whether you're a vendor looking to grow your business or a customer seeking quality products,
              we're here to help you succeed in the digital marketplace.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                to="/register?role=vendor"
                className="inline-flex items-center justify-center bg-white text-blue-600 px-8 py-4 rounded-xl hover:bg-gray-100 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <Users className="w-5 h-5 mr-2" />
                Become a Vendor
              </Link>
              <Link
                to="/register?role=affiliate"
                className="inline-flex items-center justify-center bg-green-500 text-white px-8 py-4 rounded-xl hover:bg-green-600 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <Heart className="w-5 h-5 mr-2" />
                Join as Affiliate
              </Link>
              <Link
                to="/search"
                className="inline-flex items-center justify-center bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl hover:bg-white hover:text-gray-600 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Start Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
