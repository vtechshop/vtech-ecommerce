import { RotateCcw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const Returns = () => {
  return (
    <div className="min-h-screen bg-blue-50 px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Returns & Refunds Policy</h1>
          <p className="text-gray-700 text-lg">
            We want you to be completely satisfied with your purchase
          </p>
        </div>

        {/* Return Policy Overview */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">7-Day Return Policy</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            We offer a hassle-free 7-day return policy for most items. If you're not satisfied with your purchase,
            you can return it within 7 days of delivery for a full refund or exchange.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Easy Returns</h3>
              <p className="text-sm text-gray-700">Simple return process with free pickup</p>
            </div>

            <div className="text-center p-6 bg-primary-50 rounded-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                <RotateCcw className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">7 Days</h3>
              <p className="text-sm text-gray-700">Full refund within 7 days</p>
            </div>

            <div className="text-center p-6 bg-secondary-50 rounded-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-100 rounded-full mb-4">
                <Clock className="w-8 h-8 text-secondary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Quick Process</h3>
              <p className="text-sm text-gray-700">Refund processed in 7 days, credited in 5-7 days</p>
            </div>
          </div>
        </div>

        {/* Return Eligibility */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Return Eligibility</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Eligible for Return
              </h3>
              <ul className="space-y-2 text-gray-700 ml-7">
                <li>• Product must be unused and in original packaging</li>
                <li>• All tags and labels must be intact</li>
                <li>• Product must be in the same condition as received</li>
                <li>• Return request must be initiated within 7 days of delivery</li>
                <li>• Original invoice must be included</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Not Eligible for Return
              </h3>
              <ul className="space-y-2 text-gray-700 ml-7">
                <li>• Products marked as non-returnable</li>
                <li>• Personal care and intimate items</li>
                <li>• Products with tampered serial numbers</li>
                <li>• Damaged due to misuse or mishandling</li>
                <li>• Customized or personalized products</li>
                <li>• Perishable goods and gift cards</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Return Process */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Return</h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Initiate Return Request</h3>
                <p className="text-gray-700">
                  Log in to your account, go to "My Orders" and click on "Return" for the product you want to return.
                  You can also contact us at <a href="mailto:vtechshop.customercare@gmail.com" className="text-blue-600">vtechshop.customercare@gmail.com</a>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Pack the Product</h3>
                <p className="text-gray-700">
                  Pack the product securely in its original packaging with all accessories, tags, and invoice.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Free Pickup</h3>
                <p className="text-gray-700">
                  Our delivery partner will pick up the package from your address at no additional cost.
                  You'll receive pickup details via SMS and email.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Quality Check & Refund</h3>
                <p className="text-gray-700">
                  Once we receive the product, our team will inspect it. If approved, your refund will be processed
                  within 7 days and credited to your original payment method in 5-7 business days.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Refund Information */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Refund Information</h2>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Refund Timeline</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Credit/Debit Card:</strong> 5-7 business days</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>UPI/Net Banking:</strong> 3-5 business days</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Wallet:</strong> 2-3 business days</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Cash on Delivery:</strong> 7-10 business days (bank transfer)</span>
                </li>
              </ul>
            </div>

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
              <div className="flex gap-3">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Exchange Option</h3>
                  <p className="text-primary-800 text-sm">
                    Prefer an exchange? You can exchange your product for a different size, color, or variant.
                    Exchange items are shipped within 5 days and delivered within 7 days!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation Policy */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Cancellation</h2>
          <p className="text-gray-700 mb-4">
            You can cancel your order before it is shipped. Once shipped, you'll need to follow the return process.
          </p>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">How to Cancel:</h3>
            <ul className="space-y-2 text-gray-700">
              <li>1. Go to "My Orders" in your account</li>
              <li>2. Select the order you want to cancel</li>
              <li>3. Click on "Cancel Order"</li>
              <li>4. Select cancellation reason and confirm</li>
            </ul>
            <p className="text-sm text-gray-700 mt-4">
              Refund for cancelled orders is processed immediately to your original payment method.
            </p>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-primary-50 to-primary-50 rounded-lg p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Need Assistance?</h3>
          <p className="text-gray-700 mb-4">
            Our customer support team is here to help with your return or refund
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:vtechshop.customercare@gmail.com"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 transition-colors font-medium"
            >
              Email: vtechshop.customercare@gmail.com
            </a>
            <a
              href="tel:+919944556683"
              className="inline-block bg-white text-blue-600 border-2 border-primary-600 px-6 py-3 rounded-md hover:bg-primary-50 transition-colors font-medium"
            >
              Call: +91 99445 56683
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Returns;
