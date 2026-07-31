// FILE: apps/web/src/components/layout/Footer.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';

const WHATSAPP_URL = 'https://wa.me/919944556683?text=Hi%2C%20I%20have%20a%20question%20about%20your%20products.';
const PHONE_HREF   = 'tel:+919944556683';
const PHONE_LABEL  = '9944556683';

const ChevronIcon = ({ open }) => (
  <svg
    className={`w-4 h-4 flex-shrink-0 text-gray-400 ${open ? 'rotate-90' : ''}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [shopOpen,  setShopOpen]  = useState(false);
  const [csOpen,    setCsOpen]    = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/catalog/categories?limit=8');
      return data.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  return (
    <footer className="bg-gray-900 text-gray-300">

      {/* ── MOBILE LAYOUT  (< 640 px) ─────────────────────────────
          Desktop layout below is completely unchanged.
          All links remain in the DOM for SEO.
      ──────────────────────────────────────────────────────────── */}
      <div className="sm:hidden">

        {/* Brand block */}
        <div className="px-5 pt-7 pb-5 border-b border-gray-800">
          <h3 className="text-white text-lg font-bold mb-2">VTech</h3>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            Your trusted multi-vendor marketplace for quality products at great prices.
          </p>
          <div className="flex gap-3">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Quick contact actions — WhatsApp + Call */}
        <div className="px-5 py-3 flex gap-3 border-b border-gray-800">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-green-900/30 border border-green-700/40 text-green-400 text-sm font-semibold"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </a>
          <a
            href={PHONE_HREF}
            aria-label={`Call us at ${PHONE_LABEL}`}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm font-semibold"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.0 2.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14v3z" />
            </svg>
            Call Us
          </a>
        </div>

        {/* Shop accordion — top 4 categories + View All.
            Always rendered (not gated on categories.length) to prevent
            layout shift when the React Query fetch resolves. */}
        <div className="border-b border-gray-800">
          <button
            type="button"
            id="footer-shop-trigger"
            aria-expanded={shopOpen}
            aria-controls="footer-shop-panel"
            onClick={() => setShopOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 min-h-[44px] text-left"
          >
            <span className="text-white text-sm font-bold uppercase tracking-wider">Shop</span>
            <ChevronIcon open={shopOpen} />
          </button>
          <ul
            id="footer-shop-panel"
            className={shopOpen ? 'px-5 pb-3' : 'hidden'}
          >
            {categories.slice(0, 4).map((cat) => (
              <li key={cat._id}>
                <Link
                  to={`/category/${cat.slug}`}
                  className="flex items-center min-h-[44px] text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
            {categories.length > 0 && (
              <li>
                <Link
                  to="/products"
                  className="flex items-center min-h-[44px] text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  View All Products →
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Customer Service accordion */}
        <div className="border-b border-gray-800">
          <button
            type="button"
            id="footer-cs-trigger"
            aria-expanded={csOpen}
            aria-controls="footer-cs-panel"
            onClick={() => setCsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 min-h-[44px] text-left"
          >
            <span className="text-white text-sm font-bold uppercase tracking-wider">Customer Service</span>
            <ChevronIcon open={csOpen} />
          </button>
          <ul
            id="footer-cs-panel"
            className={csOpen ? 'px-5 pb-3' : 'hidden'}
          >
            <li>
              <Link to="/track-order" className="flex items-center min-h-[44px] text-sm text-gray-300 hover:text-white transition-colors">
                Track Order
              </Link>
            </li>
            <li>
              <Link to="/page/shipping" className="flex items-center min-h-[44px] text-sm text-gray-300 hover:text-white transition-colors">
                Shipping Info
              </Link>
            </li>
            <li>
              <Link to="/page/returns" className="flex items-center min-h-[44px] text-sm text-gray-300 hover:text-white transition-colors">
                Returns &amp; Refunds
              </Link>
            </li>
            <li>
              <Link to="/page/faq" className="flex items-center min-h-[44px] text-sm text-gray-300 hover:text-white transition-colors">
                FAQ
              </Link>
            </li>
            <li>
              <Link to="/page/contact" className="flex items-center min-h-[44px] text-sm text-gray-300 hover:text-white transition-colors">
                Contact Us
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal accordion */}
        <div className="border-b border-gray-800">
          <button
            type="button"
            id="footer-legal-trigger"
            aria-expanded={legalOpen}
            aria-controls="footer-legal-panel"
            onClick={() => setLegalOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 min-h-[44px] text-left"
          >
            <span className="text-white text-sm font-bold uppercase tracking-wider">Legal</span>
            <ChevronIcon open={legalOpen} />
          </button>
          <ul
            id="footer-legal-panel"
            className={legalOpen ? 'px-5 pb-3' : 'hidden'}
          >
            <li>
              <Link to="/page/terms" className="flex items-center min-h-[44px] text-sm text-gray-300 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/page/privacy" className="flex items-center min-h-[44px] text-sm text-gray-300 hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/cookie-policy" className="flex items-center min-h-[44px] text-sm text-gray-300 hover:text-white transition-colors">
                Cookie Policy
              </Link>
            </li>
            <li>
              <Link to="/page/vendor-terms" className="flex items-center min-h-[44px] text-sm text-gray-300 hover:text-white transition-colors">
                Vendor Terms
              </Link>
            </li>
            <li>
              <Link to="/page/affiliate-terms" className="flex items-center min-h-[44px] text-sm text-gray-300 hover:text-white transition-colors">
                Affiliate Terms
              </Link>
            </li>
          </ul>
        </div>

        {/* B2B trust strip */}
        <div className="px-5 py-4 border-b border-gray-800">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              GST Invoice
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              1-Year Warranty
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Made in India
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Coimbatore, TN
            </div>
          </div>
        </div>

        {/* Mobile copyright bar */}
        <div className="px-5 py-4 text-center">
          <p className="text-xs text-gray-500">© {currentYear} VTech. All rights reserved.</p>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT  (≥ 640 px) — UNCHANGED ────────────────
          This is an exact copy of the original layout.
          Only wrapped in hidden sm:block to suppress on mobile.
      ──────────────────────────────────────────────────────────── */}
      <div className="hidden sm:block px-2 pr-6 md:pr-8 lg:pr-12 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8 xl:gap-12">

          {/* Company info */}
          <div>
            <h3 className="text-white text-lg font-bold mb-4">VTech</h3>
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
              {categories.map((cat) => (
                <li key={cat._id}>
                  <Link to={`/category/${cat.slug}`} className="hover:text-white transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
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
                  Returns &amp; Refunds
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
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-center gap-4">
          <p className="text-sm">
            © {currentYear} VTech. All rights reserved.
          </p>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
