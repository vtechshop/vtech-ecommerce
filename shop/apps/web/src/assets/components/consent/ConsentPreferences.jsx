// FILE: apps/web/src/components/consent/ConsentPreferences.jsx
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setConsent } from '@/store/slices/consentSlice';
import Button from '../common/Button';

const ConsentPreferences = () => {
  const dispatch = useDispatch();
  const { preferences } = useSelector((state) => state.consent);
  const [localPreferences, setLocalPreferences] = useState(preferences);

  const handleSave = () => {
    dispatch(setConsent(localPreferences));
    alert('Preferences saved successfully!');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Cookie Preferences</h1>
      
      <div className="space-y-6">
        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Essential Cookies</h3>
              <p className="text-gray-700">
                These cookies are necessary for the website to function properly. They enable 
                basic functions like page navigation and access to secure areas. The website 
                cannot function properly without these cookies.
              </p>
            </div>
            <div className="ml-4 pt-1">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="w-5 h-5 text-blue-600 rounded"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Analytics Cookies</h3>
              <p className="text-gray-700">
                Analytics cookies help us understand how visitors interact with our website by 
                collecting and reporting information anonymously. This helps us improve our website 
                and provide better user experiences.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Services: Google Analytics
              </p>
            </div>
            <div className="ml-4 pt-1">
              <input
                type="checkbox"
                checked={localPreferences.analytics}
                onChange={(e) =>
                  setLocalPreferences({ ...localPreferences, analytics: e.target.checked })
                }
                className="w-5 h-5 text-blue-600 rounded"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Marketing Cookies</h3>
              <p className="text-gray-700">
                Marketing cookies are used to track visitors across websites. The intention is 
                to display ads that are relevant and engaging for the individual user and thereby 
                more valuable for publishers and third-party advertisers.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Services: Meta Pixel, Google Ads, Affiliate Tracking
              </p>
            </div>
            <div className="ml-4 pt-1">
              <input
                type="checkbox"
                checked={localPreferences.marketing}
                onChange={(e) =>
                  setLocalPreferences({ ...localPreferences, marketing: e.target.checked })
                }
                className="w-5 h-5 text-blue-600 rounded"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="primary" onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsentPreferences;