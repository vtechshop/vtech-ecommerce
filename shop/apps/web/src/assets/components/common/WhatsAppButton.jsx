import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// CSS-only WhatsApp button (no framer-motion for faster initial load)

const WhatsAppButton = () => {
  const [showNumbers, setShowNumbers] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { pathname } = useLocation();

  // Entrance animation delay
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Hide on all dashboard pages
  const isDashboard = pathname.startsWith('/vendor-dashboard') || pathname.startsWith('/admin-dashboard') || pathname.startsWith('/dashboard') || pathname.startsWith('/affiliate-dashboard');
  if (isDashboard) {
    return null;
  }

  const message = encodeURIComponent('Hi, I have a question about your products.');

  const numbers = [
    { label: '9944556683', phone: '919944556683' },
    { label: '9944556620', phone: '919944556620' },
  ];

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-2" style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px) + 0.5rem)' }}>
      {/* Numbers popup */}
      {showNumbers && (
        <div
          className="bg-white rounded-xl shadow-2xl border border-gray-200 p-3 space-y-1 mb-1 origin-bottom-right"
          style={{
            animation: 'waPopupIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        >
          <p className="text-xs font-semibold text-gray-500 px-3 pt-1 pb-1">Chat with us</p>
          {numbers.map((n, i) => (
            <a
              key={n.phone}
              href={`https://wa.me/${n.phone}?text=${message}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-gray-800"
              style={{
                opacity: 0,
                animation: `waSlideIn 0.2s ease ${i * 0.08}s forwards`,
              }}
            >
              <svg viewBox="0 0 32 32" className="w-5 h-5 fill-blue-500">
                <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.9 15.9 0 0016.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.31 22.606c-.39 1.1-1.932 2.014-3.168 2.28-.846.18-1.95.324-5.67-1.218-4.762-1.972-7.826-6.81-8.064-7.124-.23-.314-1.928-2.566-1.928-4.894s1.22-3.472 1.654-3.946c.434-.474.948-.592 1.264-.592.314 0 .632.002.908.016.292.016.684-.11 1.07.816.39.948 1.328 3.236 1.446 3.472.118.236.196.51.04.824-.158.314-.236.51-.472.786-.236.274-.496.612-.708.822-.236.236-.482.492-.208.966.276.474 1.226 2.022 2.632 3.276 1.81 1.614 3.336 2.114 3.81 2.35.474.236.75.196 1.028-.118.274-.314 1.186-1.382 1.504-1.856.314-.474.632-.394 1.068-.236.434.158 2.762 1.302 3.236 1.54.474.236.79.354.908.55.118.196.118 1.14-.272 2.24z" />
              </svg>
              {n.label}
            </a>
          ))}
        </div>
      )}

      {/* Floating button */}
      {mounted && (
        <div className="relative" style={{ animation: 'waBtnIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
          {/* Pulse ring */}
          {!showNumbers && (
            <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30" />
          )}
          <button
            onClick={() => setShowNumbers(!showNumbers)}
            className="relative bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 sm:p-3.5 shadow-lg hover:shadow-2xl transition-all hover:scale-110 active:scale-90 overflow-visible"
            aria-label="Chat on WhatsApp"
          >
            {showNumbers ? (
              <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 fill-none stroke-current" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 32 32" className="w-6 h-6 sm:w-7 sm:h-7 fill-current">
                <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.9 15.9 0 0016.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.31 22.606c-.39 1.1-1.932 2.014-3.168 2.28-.846.18-1.95.324-5.67-1.218-4.762-1.972-7.826-6.81-8.064-7.124-.23-.314-1.928-2.566-1.928-4.894s1.22-3.472 1.654-3.946c.434-.474.948-.592 1.264-.592.314 0 .632.002.908.016.292.016.684-.11 1.07.816.39.948 1.328 3.236 1.446 3.472.118.236.196.51.04.824-.158.314-.236.51-.472.786-.236.274-.496.612-.708.822-.236.236-.482.492-.208.966.276.474 1.226 2.022 2.632 3.276 1.81 1.614 3.336 2.114 3.81 2.35.474.236.75.196 1.028-.118.274-.314 1.186-1.382 1.504-1.856.314-.474.632-.394 1.068-.236.434.158 2.762 1.302 3.236 1.54.474.236.79.354.908.55.118.196.118 1.14-.272 2.24z" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* CSS animations - injected once */}
      <style>{`
        @keyframes waPopupIn { from { opacity:0; transform:scale(.5) translateY(20px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes waSlideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
        @keyframes waBtnIn { from { transform:scale(0) rotate(-180deg) } to { transform:scale(1) rotate(0) } }
      `}</style>
    </div>
  );
};

export default WhatsAppButton;
