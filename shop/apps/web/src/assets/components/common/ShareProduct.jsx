// FILE: apps/web/src/components/common/ShareProduct.jsx
import { useState, useRef, useEffect } from 'react';
import { Share2, Link, Check, X } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

const ShareProduct = ({ title, price, url, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const shareText = `Check out ${title} for ${formatCurrency(price)}!`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text: shareText, url });
    } catch {
      // User cancelled or not supported
    }
    setIsOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select from hidden input
    }
  };

  const openLink = (shareUrl) => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    setIsOpen(false);
  };

  const shareOptions = [
    // Native share on mobile
    ...(typeof navigator !== 'undefined' && navigator.share ? [{
      label: 'Share',
      icon: <Share2 className="w-4 h-4" />,
      onClick: handleNativeShare,
      color: 'text-gray-700',
    }] : []),
    {
      label: 'WhatsApp',
      icon: <WhatsAppIcon />,
      onClick: () => openLink(`https://wa.me/?text=${encodedText}%20${encodedUrl}`),
      color: 'text-green-600',
    },
    {
      label: 'Facebook',
      icon: <FacebookIcon />,
      onClick: () => openLink(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`),
      color: 'text-blue-600',
    },
    {
      label: 'X',
      icon: <XIcon />,
      onClick: () => openLink(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodedUrl}`),
      color: 'text-gray-900',
    },
  ];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-blue-100 transition-all"
        title="Share product"
      >
        <Share2 className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Share via</span>
            <button onClick={() => setIsOpen(false)} className="p-0.5 hover:bg-gray-100 rounded">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {shareOptions.map((option) => (
            <button
              key={option.label}
              onClick={option.onClick}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <span className={option.color}>{option.icon}</span>
              <span className="text-sm text-gray-800">{option.label}</span>
            </button>
          ))}

          {/* Copy Link - always last */}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={handleCopyLink}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-500">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Link className="w-4 h-4" />}
              </span>
              <span className={`text-sm ${copied ? 'text-green-600 font-medium' : 'text-gray-800'}`}>
                {copied ? 'Link copied!' : 'Copy link'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Inline SVG icons for social brands (no external dependency)
const WhatsAppIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default ShareProduct;
