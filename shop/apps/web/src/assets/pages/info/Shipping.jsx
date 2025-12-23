import { Truck, Package, Clock, MapPin, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const Shipping = () => {
  return (
    <div className="min-h-screen bg-blue-50 px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Shipping Information</h1>
          <p className="text-gray-700 text-lg">
            Everything you need to know about our shipping policies and delivery options
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Methods & Rates</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Standard Shipping</h3>
                  <p className="text-gray-700 text-sm">Shipped in 2 days, Delivered in up to 10 days</p>
                </div>
              </div>
              <p className="text-gray-700 mb-2">Free on orders above ₹500</p>
              <p className="text-2xl font-bold text-gray-900">₹49<span className="text-sm font-normal text-gray-700"> for orders below ₹500</span></p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Express Shipping</h3>
                  <p className="text-gray-700 text-sm">2-3 Business Days</p>
                </div>
              </div>
              <p className="text-gray-700 mb-2">Fast delivery to your doorstep</p>
              <p className="text-2xl font-bold text-gray-900">₹99</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-secondary-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-secondary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Same Day Delivery</h3>
                  <p className="text-gray-700 text-sm">Within 24 Hours</p>
                </div>
              </div>
              <p className="text-gray-700 mb-2">Available in select cities</p>
              <p className="text-2xl font-bold text-gray-900">₹149</p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <MapPin className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Store Pickup</h3>
                  <p className="text-gray-700 text-sm">Available Next Day</p>
                </div>
              </div>
              <p className="text-gray-700 mb-2">Pick up from nearest store</p>
              <p className="text-2xl font-bold text-green-600">FREE</p>
            </div>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Free Shipping</h3>
            <p className="text-primary-800">
              Enjoy FREE standard shipping on all orders above ₹500! Shop now and save on delivery costs.
            </p>
          </div>
        </div>

        {/* Processing Time */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Processing Time</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Order Confirmation</h3>
                <p className="text-gray-700">Orders are processed and shipped within 2 days after payment confirmation</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Packaging</h3>
                <p className="text-gray-700">Your items are carefully packaged and prepared for shipment</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Shipping</h3>
                <p className="text-gray-700">Package is handed over to our courier partners for delivery</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold">4</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Delivery</h3>
                <p className="text-gray-700">Your order arrives at your doorstep within the estimated time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coverage Areas */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Coverage</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Metro Cities</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Mumbai, Delhi, Bangalore, Hyderabad
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Chennai, Kolkata, Pune, Ahmedabad
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  All shipping methods available
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Other Locations</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Tier 2 & Tier 3 cities
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Standard & Express shipping available
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Delivery within 10 days maximum based on location
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tracking */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Track Your Order</h2>
          <p className="text-gray-700 mb-4">
            Once your order ships, you'll receive a tracking number via email and SMS.
            You can track your shipment in real-time using our <Link to="/track-order" className="text-blue-600 hover:text-blue-700 font-medium">order tracking page</Link>.
          </p>

          <div className="bg-blue-100 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Important Notes:</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>• Orders placed after 5 PM will be processed the next business day</li>
              <li>• Delivery times are estimates and may vary based on location</li>
              <li>• Remote areas may require additional 2-3 days for delivery</li>
              <li>• Someone must be available to receive the package at the delivery address</li>
              <li>• For international shipping, please contact us at vtechshop.customercare@gmail.com</li>
            </ul>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-8 text-center bg-gradient-to-r from-primary-50 to-primary-50 rounded-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-gray-700 mb-4">
            Have questions about shipping? Our customer support team is here to help!
          </p>
          <a
            href="/page/contact"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 transition-colors font-medium"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default Shipping;
