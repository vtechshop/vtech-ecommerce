// FILE: apps/web/src/components/layout/Footer.jsx
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="px-2 pr-6 md:pr-8 lg:pr-12 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8 xl:gap-12">
          {/* Company info */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">V-Tech Shop</h3>
            <p className="text-sm mb-4">
              Your trusted multi-vendor marketplace for quality products at great prices.
            </p>
            <div className="flex gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Facebook">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/category/electronics" className="hover:text-white transition-colors">
                  Electronics
                </Link>
              </li>
              
             
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/track-order" className="hover:text-white transition-colors">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/page/shipping" className="hover:text-white transition-colors">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link to="/page/returns" className="hover:text-white transition-colors">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link to="/page/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/page/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/page/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/page/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/page/vendor-terms" className="hover:text-white transition-colors">
                  Vendor Terms
                </Link>
              </li>
              <li>
                <Link to="/page/affiliate-terms" className="hover:text-white transition-colors">
                  Affiliate Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm">
            © {currentYear} V-Tech Shop. All rights reserved.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 mr-2">We Accept:</span>

            {/* RuPay */}
            <div className="bg-white rounded px-3 py-2 h-10 flex items-center justify-center min-w-[60px]">
              <svg className="h-6" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="60" height="20" rx="3" fill="#097939"/>
                <text x="30" y="13" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fill="white" textAnchor="middle">RuPay</text>
              </svg>
            </div>

            {/* Visa */}
            <div className="bg-white rounded px-3 py-2 h-10 flex items-center justify-center min-w-[60px]">
              <svg className="h-6" viewBox="0 0 48 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.925 1.382L14.328 14.618H10.897L14.494 1.382H17.925ZM31.102 9.454L32.832 4.575L33.876 9.454H31.102ZM34.982 14.618H38.142L35.367 1.382H32.582C31.862 1.382 31.254 1.828 30.988 2.478L25.814 14.618H29.604L30.414 12.482H35.039L35.518 14.618H34.982ZM26.982 10.036C26.998 6.482 22.154 6.282 22.194 4.691C22.206 4.201 22.682 3.683 23.726 3.551C24.244 3.487 25.692 3.439 27.368 4.219L28.05 1.659C27.126 1.315 25.918 1 24.41 1C20.866 1 18.358 2.891 18.334 5.583C18.31 7.539 20.074 8.635 21.406 9.271C22.77 9.923 23.238 10.343 23.238 10.915C23.222 11.811 22.114 12.211 21.094 12.227C19.302 12.251 18.254 11.747 17.414 11.371L16.714 13.995C17.558 14.367 19.126 14.691 20.754 14.707C24.51 14.707 26.974 12.835 26.982 10.036ZM12.054 1.382L6.542 14.618H2.734L0.054 3.723C-0.114 3.083 -0.266 2.891 -0.818 2.591C-1.678 2.123 -3.13 1.683 -4.378 1.415L-4.314 1.382H1.126C1.966 1.382 2.726 1.955 2.93 3.011L4.574 11.419L8.262 1.382H12.054Z" fill="#1434CB" transform="translate(6, 0)"/>
              </svg>
            </div>

            {/* Mastercard */}
            <div className="bg-white rounded px-3 py-2 h-10 flex items-center justify-center min-w-[60px]">
              <svg className="h-6" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="16" r="14" fill="#EB001B"/>
                <circle cx="30" cy="16" r="14" fill="#F79E1B"/>
                <path d="M24 6.5C21.5 8.5 20 11.5 20 16C20 20.5 21.5 23.5 24 25.5C26.5 23.5 28 20.5 28 16C28 11.5 26.5 8.5 24 6.5Z" fill="#FF5F00"/>
              </svg>
            </div>

            {/* Google Pay */}
            <div className="bg-white rounded px-3 py-2 h-10 flex items-center justify-center min-w-[60px]">
              <svg className="h-6" viewBox="0 0 50 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.8 10.4V16H21.6V2H26.7C27.9 2 29 2.4 29.8 3.1C30.6 3.8 31 4.8 31 5.9C31 7 30.6 8 29.8 8.7C29 9.4 27.9 9.8 26.7 9.8H23.8V10.4ZM23.8 4.1V7.7H26.8C27.5 7.7 28.1 7.5 28.5 7.1C28.9 6.7 29.1 6.2 29.1 5.6C29.1 5 28.9 4.5 28.5 4.1C28.1 3.7 27.5 3.5 26.8 3.5H23.8V4.1Z" fill="#5F6368"/>
                <path d="M35.8 9C37 9 37.9 9.4 38.6 10.1C39.3 10.8 39.7 11.8 39.7 13V16H37.7V15.2H37.6C37 15.8 36.3 16.1 35.4 16.1C34.6 16.1 34 15.9 33.4 15.4C32.8 14.9 32.5 14.3 32.5 13.6C32.5 12.9 32.8 12.3 33.3 11.9C33.8 11.5 34.5 11.3 35.5 11.3C36.3 11.3 37 11.4 37.5 11.7V11.4C37.5 10.9 37.3 10.5 37 10.2C36.7 9.9 36.2 9.7 35.7 9.7C35 9.7 34.4 10 34 10.5L32.3 9.4C33 8.5 34.2 8 35.8 8V9ZM34.5 13.6C34.5 13.9 34.6 14.2 34.9 14.4C35.2 14.6 35.5 14.7 35.9 14.7C36.4 14.7 36.9 14.5 37.3 14.2C37.7 13.9 37.9 13.5 37.9 13C37.5 12.7 37 12.5 36.3 12.5C35.8 12.5 35.4 12.6 35.1 12.8C34.7 13 34.5 13.3 34.5 13.6Z" fill="#5F6368"/>
                <path d="M47.2 9.2L42.1 18.5H39.8L41.7 14.8L38.2 9.2H40.6L42.9 13.1H42.9L45.1 9.2H47.2Z" fill="#5F6368"/>
                <path d="M18 8.6C17.4 8.1 16.6 7.9 15.7 7.9C14.8 7.9 14 8.1 13.4 8.6V2H11.2V16H13.4V15.2H13.5C14.1 15.8 14.9 16.1 15.7 16.1C17 16.1 18.1 15.6 18.9 14.7C19.7 13.8 20.1 12.6 20.1 11.2C20.1 9.8 19.7 8.6 18.9 7.7C18.1 6.8 17 6.3 15.7 6.3C14.9 6.3 14.1 6.5 13.5 7V8.6C14.1 8.1 14.8 7.9 15.7 7.9C16.6 7.9 17.4 8.1 18 8.6Z" fill="#4285F4"/>
                <circle cx="9" cy="11" r="5" fill="#EA4335"/>
                <circle cx="16" cy="11" r="5" fill="#FBBC04"/>
                <circle cx="9" cy="11" r="5" fill="#34A853" opacity="0.8"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;