// FILE: apps/web/src/assets/pages/dashboard/admin/MobileDevModules.jsx
import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Smartphone, Image, Tag, Gift, Settings } from 'lucide-react';

const BannersManagement = lazy(() => import('./BannersManagement'));
const CouponsManagement = lazy(() => import('./CouponsManagement'));
const GamificationManagement = lazy(() => import('./GamificationManagement'));
const AppConfigManagement = lazy(() => import('./AppConfigManagement'));

const tabs = [
  { id: 'banners', label: 'Banners', icon: Image, description: 'Upload, edit & delete banner images' },
  { id: 'coupons', label: 'Coupons', icon: Tag, description: 'Create & manage coupon codes' },
  { id: 'gamification', label: 'Gamification', icon: Gift, description: 'Spin wheel + Quiz questions' },
  { id: 'app-config', label: 'App Config', icon: Settings, description: 'Contact, referral, sale settings' },
];

const tabComponents = {
  banners: BannersManagement,
  coupons: CouponsManagement,
  gamification: GamificationManagement,
  'app-config': AppConfigManagement,
};

const MobileDevModules = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'banners';

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const ActiveComponent = tabComponents[activeTab] || BannersManagement;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Smartphone className="w-7 h-7 text-primary-600" />
          Mobile Dev Modules
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage all mobile app content — banners, coupons, gamification, config</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active tab content — actual CRUD management UI */}
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      }>
        <ActiveComponent {...(activeTab === 'banners' ? { platformFilter: 'mobile' } : {})} />
      </Suspense>
    </div>
  );
};

export default MobileDevModules;
