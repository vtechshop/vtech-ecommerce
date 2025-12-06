import { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const faqs = [
    {
      category: 'Orders & Payment',
      questions: [
        {
          q: 'What payment methods do you accept?',
          a: 'We accept Credit/Debit Cards (Visa, Mastercard, RuPay), UPI, Net Banking, Wallets, and Cash on Delivery (COD) for eligible orders.'
        },
        {
          q: 'How can I track my order?',
          a: 'You can track your order by logging into your account and visiting "My Orders" section, or use our Track Order page with your order number and email.'
        },
        {
          q: 'Can I cancel or modify my order?',
          a: 'Yes, you can cancel your order before it ships. Go to "My Orders" and click "Cancel Order". Once shipped, you\'ll need to follow the return process.'
        },
        {
          q: 'Is Cash on Delivery (COD) available?',
          a: 'Yes, COD is available for orders below ₹10,000. Additional ₹50 COD handling charges may apply.'
        }
      ]
    },
    {
      category: 'Shipping & Delivery',
      questions: [
        {
          q: 'How long does delivery take?',
          a: 'Items are shipped within 2 days and delivered within 10 days maximum based on location.'
        },
        {
          q: 'Do you offer free shipping?',
          a: 'Yes! We offer free standard shipping on all orders above ₹500. Orders below ₹500 have a shipping charge of ₹49.'
        },
        {
          q: 'Do you ship internationally?',
          a: 'Currently, we ship within India only. For international shipping inquiries, please contact us at vtechshop.customercare@gmail.com'
        },
        {
          q: 'What if nobody is home during delivery?',
          a: 'Our delivery partner will attempt delivery 2-3 times. You\'ll receive a call before delivery. You can also schedule a convenient delivery time.'
        }
      ]
    },
    {
      category: 'Returns & Refunds',
      questions: [
        {
          q: 'What is your return policy?',
          a: 'We offer a 7-day return policy. Products must be unused, in original packaging with tags intact. We provide free pickup for returns.'
        },
        {
          q: 'How long does it take to get a refund?',
          a: 'Refunds are processed within 7 days and credited to your original payment method within 5-7 business days after we receive the returned product.'
        },
        {
          q: 'Can I exchange a product?',
          a: 'Yes, you can exchange products for different size, color, or variant. Exchange items are shipped within 5 days and delivered within 7 days.'
        },
        {
          q: 'What items cannot be returned?',
          a: 'Personal care items, intimate products, customized items, perishable goods, and gift cards cannot be returned.'
        }
      ]
    },
    {
      category: 'Account & Security',
      questions: [
        {
          q: 'How do I create an account?',
          a: 'Click on "Sign Up" at the top right corner, enter your details, and verify your email. You can also sign up using Google or Facebook.'
        },
        {
          q: 'I forgot my password. What should I do?',
          a: 'Click on "Forgot Password" on the login page, enter your registered email, and follow the instructions to reset your password.'
        },
        {
          q: 'Is my payment information secure?',
          a: 'Yes, we use industry-standard SSL encryption and PCI-DSS compliant payment gateways. We never store your complete card details.'
        },
        {
          q: 'How do I update my profile information?',
          a: 'Log in to your account, go to "My Profile" and update your personal information, addresses, and contact details.'
        }
      ]
    },
    {
      category: 'Vendor & Affiliate',
      questions: [
        {
          q: 'How can I become a vendor?',
          a: 'Click on "Become a Vendor" in the header or footer, fill out the application form with your business details, and our team will review your application within 2-3 business days. Once approved, you can list products and start selling.'
        },
        {
          q: 'What are the vendor commission rates?',
          a: 'V-Tech charges a default commission of 15%, meaning you keep 85% of each sale. For example, if you sell a product for ₹1,000, you earn ₹850 and V-Tech takes ₹150. Commission rates may vary slightly by category (12-20% range).'
        },
        {
          q: 'How and when do I get paid as a vendor?',
          a: 'Commission is created when an order is placed, approved by admin after successful delivery, and paid to your bank account. You can track all your earnings in the Settlements section of your vendor dashboard.'
        },
        {
          q: 'What are Sponsored Ads and how do they work?',
          a: 'Sponsored Ads let you promote your products in premium positions (homepage, category pages, search results). You can choose from CPC (pay per click), CPM (pay per 1000 views), or CPA (pay per sale) models. Daily budgets start from ₹500.'
        },
        {
          q: 'Can I set custom prices for my products?',
          a: 'Yes! As a vendor, you have full control over your product pricing. We recommend researching competitor prices and factoring in the 15% platform commission to ensure profitability.'
        },
        {
          q: 'How does the affiliate program work?',
          a: 'Sign up as an affiliate, get your unique referral code, share products, and earn 5% commission on every sale made through your link. Commission is paid monthly after admin approval.'
        },
        {
          q: 'When do I receive my affiliate commissions?',
          a: 'Commissions are calculated monthly and paid within 15 days after the month ends, provided you meet the minimum threshold of ₹500.'
        },
        {
          q: 'How long does the affiliate cookie tracking last?',
          a: '30 days. When someone clicks your affiliate link, we track their activity for 30 days. If they make a purchase within that time, you earn commission on that sale.'
        },
        {
          q: 'Can I promote V-Tech products on social media?',
          a: 'Yes! You can share your affiliate links on Instagram, Facebook, Twitter, YouTube, WhatsApp, and blogs. Always disclose your affiliate relationship as required by law.'
        },
        {
          q: 'What promotion methods are prohibited for affiliates?',
          a: 'You cannot spam, make false claims, impersonate V-Tech, bid on branded keywords in PPC campaigns, stuff cookies, or make self-referrals. See Affiliate Terms for the complete list of prohibited activities.'
        },
        {
          q: 'How do I track my affiliate performance?',
          a: 'Your affiliate dashboard shows real-time clicks, conversions, conversion rate, and earnings. View detailed commission history in the Commissions section. You can also see which products perform best.'
        },
        {
          q: 'What is the affiliate tier system?',
          a: 'Earn higher commissions as you grow! Bronze (₹10K+/mo): 5%, Silver (₹25K+/mo): 6%, Gold (₹50K+/mo): 7%, Platinum (₹100K+/mo): 8% plus special perks.'
        },
        {
          q: 'Where can I learn more about being a vendor?',
          a: 'Visit our comprehensive Vendor Guide (available in your dashboard or at /page/vendor-guide) for detailed information about commissions, sponsored ads, order management, and best practices.'
        },
        {
          q: 'Can I be both a Vendor and an Affiliate?',
          a: 'Currently, you can only have one role at a time (either Vendor OR Affiliate). If you switch roles, you will lose access to your previous role\'s dashboard and data. We recommend choosing the role that best fits your business model. Contact support at vtechshop.customercare@gmail.com if you need both roles simultaneously.'
        },
        {
          q: 'What happens if I switch from Affiliate to Vendor (or vice versa)?',
          a: 'Switching roles will replace your current role completely. For example, if you\'re an Affiliate and apply to become a Vendor, you will lose access to your Affiliate Dashboard, pending commissions, and affiliate links. The platform currently supports one role per user. Please contact support before switching roles to discuss your options.'
        }
      ]
    },
    {
      category: 'Products',
      questions: [
        {
          q: 'Are products genuine and authentic?',
          a: 'Yes, all products sold on our platform are 100% genuine and sourced directly from authorized vendors and manufacturers.'
        },
        {
          q: 'What if I receive a damaged product?',
          a: 'Please contact us immediately with photos of the damaged product. We\'ll arrange for a free replacement or full refund.'
        },
        {
          q: 'Do you offer warranty on products?',
          a: 'Yes, most electronics and appliances come with manufacturer warranty. Warranty details are mentioned on the product page.'
        },
        {
          q: 'Can I request products not listed on the site?',
          a: 'Yes, contact us at vtechshop.customercare@gmail.com with your requirement, and we\'ll try to source it for you.'
        }
      ]
    }
  ];

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(item =>
      item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen px-[10%] py-[50px]">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-screen-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-700 text-lg">
            Find answers to common questions about our services
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {filteredFaqs.map((category, catIndex) => (
            <div key={catIndex} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{category.category}</h2>

              <div className="space-y-4">
                {category.questions.map((item, index) => {
                  const globalIndex = `${catIndex}-${index}`;
                  const isOpen = openIndex === globalIndex;

                  return (
                    <div key={index} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-semibold text-gray-900 pr-4">{item.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 text-gray-700">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {filteredFaqs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-700 mb-4">No results found for "{searchTerm}"</p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Still have questions */}
        <div className="mt-12 bg-gradient-to-r from-primary-50 to-primary-50 rounded-lg p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Still have questions?</h3>
          <p className="text-gray-700 mb-6">
            Can't find the answer you're looking for? Our support team is here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/page/contact"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 transition-colors font-medium"
            >
              Contact Support
            </a>
            <a
              href="mailto:vtechshop.customercare@gmail.com"
              className="inline-block bg-white text-blue-600 border-2 border-primary-600 px-6 py-3 rounded-md hover:bg-primary-50 transition-colors font-medium"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
