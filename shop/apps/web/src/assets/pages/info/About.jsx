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
            Leading Manufacturer of Commercial Kitchen Equipment - Empowering Professional Kitchens Across India
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
                Welcome to <strong className="text-blue-600">Vtech</strong>, a leading manufacturer and supplier of
                commercial kitchen equipment based in Ganapathy, Coimbatore. For years, we've been empowering
                professional kitchens across India with high-quality, durable, and innovative commercial equipment.
              </p>
              <p>
                Our extensive range includes commercial blenders, wet grinders, food processors, and mixers - all
                designed to meet the demanding needs of restaurants, hotels, catering businesses, and commercial
                food service operations. We combine traditional craftsmanship with modern technology to deliver
                equipment that performs reliably day after day.
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
                To manufacture world-class commercial kitchen equipment that empowers professional food service operations
                to achieve excellence. We strive to provide reliable, efficient, and innovative equipment that helps
                restaurants, hotels, and catering businesses deliver exceptional culinary experiences to their customers.
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
                To become India's leading manufacturer of commercial kitchen equipment, setting new standards in quality,
                innovation, and customer service, while empowering professional kitchens across the nation to achieve excellence.
              </p>
            </div>
          </div>
        </div>

        {/* What We Offer */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What We Offer</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Comprehensive solutions for customers, vendors, and affiliates
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">For Customers</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Premium commercial kitchen equipment
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Competitive pricing
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
          </div>
        </div>

        {/* Why Choose Vtech */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Vtech?</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Discover what makes us the preferred choice for professional kitchens across India
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">Superior Build Quality</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Every piece of equipment is manufactured using heavy-duty materials and commercial-grade components.
                    Our products undergo rigorous quality testing to ensure they meet the demanding standards of professional kitchens.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">Innovation & Design</h3>
                  <p className="text-gray-700 leading-relaxed">
                    We continuously innovate to make commercial kitchen operations more efficient.
                    Features like tilting mechanisms and energy-efficient motors demonstrate our commitment to practical innovation.
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
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">Reliability & Durability</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Built for continuous commercial operation, our equipment delivers consistent performance day after day.
                    Robust construction ensures long-lasting reliability and excellent return on investment.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-xl">4</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-xl">Customer Support</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Our dedicated support team provides comprehensive assistance from installation to maintenance.
                    We ensure your commercial kitchen operations run smoothly with minimal downtime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Our Product Lineup */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Commercial Kitchen Equipment</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Explore our range of professional-grade equipment designed for commercial kitchens
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Commercial Blenders */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Commercial Blenders</h3>
                  <p className="text-sm text-gray-600">Professional Power & Performance</p>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Our commercial blenders are engineered for high-volume operations in restaurants, juice bars, and cafes.
                  Featuring heavy-duty motors and durable construction, these blenders deliver consistent results even under
                  continuous use.
                </p>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Key Features:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Professional-grade motors for continuous operation</li>
                    <li>• Heavy-duty stainless steel blades</li>
                    <li>• Easy-clean design for busy kitchens</li>
                    <li>• Perfect for smoothies, soups, and sauces</li>
                  </ul>
                </div>
                <p className="text-lg font-bold text-blue-600">Starting from ₹18,500</p>
              </div>
            </div>

            {/* Wet Grinders */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                  <Target className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Commercial Wet Grinders</h3>
                  <p className="text-sm text-gray-600">15L Tilting Technology</p>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Our flagship 15-liter commercial tilting wet grinder revolutionizes batter preparation for South Indian
                  restaurants and catering businesses. The innovative tilting mechanism eliminates manual scooping, saving
                  time and reducing mess.
                </p>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Key Features:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• 15-liter capacity for high-volume operations</li>
                    <li>• Innovative tilting mechanism for easy pouring</li>
                    <li>• Energy-efficient motor design</li>
                    <li>• Ideal for idli/dosa batter and chutneys</li>
                  </ul>
                </div>
                <p className="text-lg font-bold text-green-600">₹42,000</p>
              </div>
            </div>

            {/* Food Processors */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                  <Heart className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Food Processors</h3>
                  <p className="text-sm text-gray-600">Multi-Function Versatility</p>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Professional food processors designed for versatile food preparation tasks. From chopping vegetables to
                  grinding spices, our processors handle diverse kitchen operations with ease and efficiency.
                </p>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Key Features:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Multi-function capabilities</li>
                    <li>• Professional-grade stainless steel blades</li>
                    <li>• Variable speed controls</li>
                    <li>• Large processing capacity</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Commercial Mixers */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Commercial Mixers</h3>
                  <p className="text-sm text-gray-600">Industrial Strength</p>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Heavy-duty commercial mixers perfect for bakeries, hotels, and large-scale food production. Built to
                  handle high-volume mixing tasks with industrial-strength motors and robust construction.
                </p>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Key Features:</p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Industrial-strength motors</li>
                    <li>• Multiple attachment options</li>
                    <li>• High-volume capacity</li>
                    <li>• Perfect for bakeries and commercial kitchens</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-primary-50 rounded-2xl p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">About Our Company</h2>
              <p className="text-gray-700 max-w-2xl mx-auto">
                Based in Ganapathy, Coimbatore - Serving Professional Kitchens Across India
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  Our Location
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  <strong className="text-blue-600">Vtech</strong> is headquartered in <strong>Ganapathy, Coimbatore</strong>,
                  Tamil Nadu - a major manufacturing hub in South India. Our strategic location allows us to efficiently
                  serve commercial kitchens across India with prompt delivery and service.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  Our Expertise
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  With years of experience in commercial kitchen equipment manufacturing, we combine traditional
                  craftsmanship with modern technology. Our team of skilled engineers and technicians ensures
                  every product meets the highest quality standards.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  Who We Serve
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  Our equipment is trusted by restaurants, hotels, catering businesses, cloud kitchens, institutional
                  kitchens, tiffin centers, and food production facilities across India. We cater to businesses of
                  all sizes - from small startups to large commercial operations.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <Heart className="w-6 h-6 text-orange-600" />
                  </div>
                  Our Commitment
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  We are committed to providing not just equipment, but complete solutions. From product selection
                  to installation and after-sales support, our team is dedicated to ensuring your commercial kitchen
                  operates at peak efficiency.
                </p>
              </div>
            </div>

            <div className="mt-8 bg-white rounded-xl p-6 shadow-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Why Professional Kitchens Choose Vtech</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div className="p-4">
                  <p className="text-3xl font-bold text-blue-600 mb-2">15L+</p>
                  <p className="text-sm text-gray-700">Large Capacity Equipment</p>
                </div>
                <div className="p-4">
                  <p className="text-3xl font-bold text-green-600 mb-2">100%</p>
                  <p className="text-sm text-gray-700">Quality Tested</p>
                </div>
                <div className="p-4">
                  <p className="text-3xl font-bold text-purple-600 mb-2">24/7</p>
                  <p className="text-sm text-gray-700">Customer Support</p>
                </div>
                <div className="p-4">
                  <p className="text-3xl font-bold text-orange-600 mb-2">Pan India</p>
                  <p className="text-sm text-gray-700">Delivery & Service</p>
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
              <h3 className="font-bold text-gray-900 mb-4 text-xl">Excellence</h3>
              <p className="text-gray-700 leading-relaxed">
                Committed to manufacturing equipment that exceeds industry standards and delivers exceptional performance in professional kitchens.
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
                    V-Tech Shop<br />
                    464, Sathy Rd, Ganapathy<br />
                    Coimbatore, Tamil Nadu 641006<br />
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
                  <p className="text-gray-700">vtechshop.customercare@gmail.com</p>
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
                className="inline-flex items-center justify-center bg-white text-blue-600 px-8 py-4 rounded-xl hover:bg-blue-100 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
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
