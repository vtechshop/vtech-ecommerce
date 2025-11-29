// FILE: apps/web/src/components/consent/CookieBanner.jsx
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { acceptAll, rejectNonEssential, showBanner } from '@/store/slices/consentSlice';
import { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import useAuth from '@/hooks/useAuth';

const CookieBanner = () => {
  const dispatch = useDispatch();
  const { bannerVisible } = useSelector((state) => state.consent);
  const { isAdmin } = useAuth();
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
  });

  // Don't show banner for admin users
  if (isAdmin) {
    return null;
  }

  // Don't show banner in Playwright tests
  if (typeof window !== 'undefined' && window.playwright) {
    return null;
  }

  if (!bannerVisible) return null;

  const handleAcceptAll = () => {
    dispatch(acceptAll());
  };

  const handleRejectAll = () => {
    dispatch(rejectNonEssential());
  };

  const handleSavePreferences = () => {
    dispatch(acceptAll()); // In real app, would use setConsent with preferences
    setShowPreferences(false);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 p-6">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">We value your privacy</h3>
              <p className="text-gray-700 text-sm">
                We use cookies to enhance your browsing experience, serve personalized ads or content, 
                and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.{' '}
                <Link to="/cookie-policy" className="text-blue-600 hover:underline">
                  Read our Cookie Policy
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="md" onClick={() => setShowPreferences(true)} data-testid="cookie-customize">
                Customize
              </Button>
              <Button variant="secondary" size="md" onClick={handleRejectAll} data-testid="cookie-reject">
                Reject All
              </Button>
              <Button variant="primary" size="md" onClick={handleAcceptAll} data-testid="cookie-accept">
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      <Modal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        title="Cookie Preferences"
        size="lg"
      >
        <div className="space-y-6">
          <div className="border-b pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Essential Cookies</h4>
                <p className="text-sm text-gray-700">
                  These cookies are necessary for the website to function and cannot be disabled.
                </p>
              </div>
              <div className="ml-4">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Analytics Cookies</h4>
                <p className="text-sm text-gray-700">
                  These cookies help us understand how visitors interact with our website.
                </p>
              </div>
              <div className="ml-4">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) =>
                    setPreferences({ ...preferences, analytics: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Marketing Cookies</h4>
                <p className="text-sm text-gray-700">
                  These cookies are used to track visitors across websites to display relevant ads.
                </p>
              </div>
              <div className="ml-4">
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) =>
                    setPreferences({ ...preferences, marketing: e.target.checked })
                  }
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPreferences(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CookieBanner;