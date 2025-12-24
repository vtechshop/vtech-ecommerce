// FILE: apps/web/src/components/layout/DashboardLayout.jsx
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import useAuth from '@/hooks/useAuth';
import useNotifications from '@/hooks/useNotifications';
import NotificationBadge from '@/components/common/NotificationBadge';
import Header from './Header';
import { useToast } from '@/components/common/ToastContainer';
import { refreshUser } from '@/store/slices/authSlice';

const DashboardLayout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, isVendor, isAffiliate, isSupport, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { counts } = useNotifications();
  const toast = useToast();
  const hasRefreshedRef = useRef(false);

  // Refresh user data on mount ONCE to get latest profile (e.g., KYC status updates)
  useEffect(() => {
    if ((isVendor || isAffiliate) && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      dispatch(refreshUser());
    }
  }, [dispatch, isVendor, isAffiliate]);

  const getNavItems = () => {
    if (isAdmin) {
      return [
        { path: '/admin-dashboard', label: 'Overview', icon: 'chart' },
        { path: '/admin-dashboard/users', label: 'Users', icon: 'users' },
        { path: '/admin-dashboard/products', label: 'Products', icon: 'package' },
        { path: '/admin-dashboard/categories', label: 'Categories', icon: 'folder' },
        { path: '/admin-dashboard/orders', label: 'Orders', icon: 'shopping-bag' },
        { path: '/admin-dashboard/payments', label: 'Payments', icon: 'credit-card' },
        { path: '/admin-dashboard/vendors', label: 'Vendors', icon: 'store' },
        { path: '/admin-dashboard/vendor-commissions', label: 'Vendor Commissions', icon: 'dollar-sign' },
        { path: '/admin-dashboard/affiliates', label: 'Affiliates', icon: 'link' },
        { path: '/admin-dashboard/affiliate-commissions', label: 'Affiliate Commissions', icon: 'dollar' },
        { path: '/admin-dashboard/kyc-review', label: 'KYC Review', icon: 'shield' },
        { path: '/admin-dashboard/crm/customers', label: 'CRM - Customers', icon: 'users' },
        { path: '/admin-dashboard/tickets', label: 'Support Tickets', icon: 'message-square' },
        { path: '/admin-dashboard/ads', label: 'Sponsored Ads', icon: 'megaphone' },
        { path: '/admin-dashboard/cms', label: 'CMS', icon: 'file' },
        { path: '/admin-dashboard/blog', label: 'Blog Management', icon: 'file-text' },
        { path: '/admin-dashboard/communications', label: 'Communications', icon: 'message' },
        { path: '/admin-dashboard/contact-submissions', label: 'Contact Form', icon: 'mail' },
        { path: '/admin-dashboard/reviews', label: 'Reviews', icon: 'star' },
        { path: '/admin-dashboard/warranties', label: 'Warranties', icon: 'warranty' },
        { path: '/admin-dashboard/settings', label: 'Settings', icon: 'settings' },
      ];
    }

    if (isSupport) {
      return [
        { path: '/support-dashboard', label: 'Overview', icon: 'chart' },
        { path: '/support-dashboard/tickets', label: 'Tickets', icon: 'message' },
      ];
    }

    if (isAffiliate) {
      return [
        { path: '/affiliate-dashboard', label: 'Overview', icon: 'chart' },
        { path: '/affiliate-dashboard/links', label: 'Links', icon: 'link' },
        { path: '/affiliate-dashboard/all-product-links', label: 'All Product Links', icon: 'list' },
        { path: '/affiliate-dashboard/commissions', label: 'Commissions', icon: 'dollar' },
        { path: '/affiliate-dashboard/settings', label: 'Settings', icon: 'settings' },
        { path: '/affiliate-dashboard/kyc', label: 'KYC Verification', icon: 'shield' },
        { path: '/affiliate-dashboard/support', label: 'Support', icon: 'message-square' },
      ];
    }

    if (isVendor) {
      return [
        { path: '/vendor-dashboard', label: 'Overview', icon: 'chart' },
        { path: '/vendor-dashboard/products', label: 'Products', icon: 'package' },
        { path: '/vendor-dashboard/inventory', label: 'Inventory', icon: 'box' },
        { path: '/vendor-dashboard/orders', label: 'Orders', icon: 'shopping-bag' },
        { path: '/vendor-dashboard/settlements', label: 'Settlements', icon: 'dollar' },
        { path: '/vendor-dashboard/ads', label: 'Sponsored Ads', icon: 'megaphone' },
        { path: '/vendor-dashboard/settings', label: 'Settings', icon: 'settings' },
        { path: '/vendor-dashboard/kyc', label: 'KYC Verification', icon: 'shield' },
        { path: '/vendor-dashboard/support', label: 'Support', icon: 'message-square' },
      ];
    }

    // Customer - Simple and clean
    return [
      { path: '/dashboard', label: 'Dashboard', icon: 'chart' },
      { path: '/dashboard/orders', label: 'My Orders', icon: 'shopping-bag' },
      { path: '/dashboard/addresses', label: 'Addresses', icon: 'map' },
      { path: '/dashboard/wishlist', label: 'Wishlist', icon: 'heart' },
      { path: '/dashboard/settings', label: 'Settings', icon: 'settings' },
      { path: '/dashboard/become-vendor', label: 'Become a Vendor', icon: 'store' },
      { path: '/dashboard/become-affiliate', label: 'Become an Affiliate', icon: 'link' },
    ];
  };

  const navItems = getNavItems();

  // Check if vendor's KYC is approved
  const isVendorKYCApproved = () => {
    if (!isVendor || !user?.vendorProfile) {
      return false;
    }
    const kycStatus = user.vendorProfile.kyc?.status;
    return kycStatus === 'approved';
  };

  // Check if a menu item should be locked for vendors with pending KYC
  const isMenuItemLocked = (path) => {
    if (!isVendor || isVendorKYCApproved()) return false;

    // KYC and Support are always accessible
    if (path.includes('/kyc') || path.includes('/support')) return false;

    // All other vendor pages are locked until KYC is approved
    return true;
  };

  // Handle click on locked menu item
  const handleNavItemClick = (e, item) => {
    if (isMenuItemLocked(item.path)) {
      e.preventDefault();
      toast.error('Waiting for approval. Contact us via Support for assistance.', 4000);
    }
  };

  // Get notification count for a specific nav item
  const getNotificationCount = (path) => {
    if (!counts) return 0;

    // Admin notifications
    if (isAdmin) {
      if (path.includes('/orders')) return counts.newOrders || 0;
      // Removed: /users badge - no actionable notification needed
      if (path.includes('/vendors')) return counts.pendingVendors || 0;
      if (path.includes('/affiliates') && !path.includes('commissions')) return counts.pendingAffiliates || 0;
      if (path.includes('/affiliate-commissions')) return counts.pendingCommissions || 0;
      if (path.includes('/tickets')) return counts.openTickets || 0;
      if (path.includes('/contact-submissions')) return counts.unreadMessages || 0;
      if (path.includes('/communications')) return counts.unreadCommunications || 0;
    }

    // Vendor notifications
    if (isVendor) {
      if (path.includes('/orders')) return counts.newOrders || 0;
      if (path.includes('/support')) return counts.unreadMessages || 0;
    }

    // Affiliate notifications
    if (isAffiliate) {
      if (path.includes('/commissions')) return counts.pendingCommissions || 0;
      if (path.includes('/support')) return counts.unreadMessages || 0;
    }

    return 0;
  };

  const getIcon = (iconName) => {
    const icons = {
      chart: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
      users: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      ),
      package: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      ),
      folder: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      ),
      'shopping-bag': (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      ),
      'credit-card': (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3v-8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      ),
      store: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      ),
      link: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      ),
      megaphone: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      ),
      file: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      ),
      settings: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      ),
      message: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      ),
      'message-square': (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      ),
      dollar: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
      'dollar-sign': (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      ),
      box: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      ),
      map: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      ),
      heart: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      ),
      shield: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      ),
      mail: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      ),
      star: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      ),
      warranty: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      ),
      list: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      ),
      'file-text': (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      ),
    };
    return icons[iconName] || icons.chart;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

      <div className="flex flex-1">
        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-dark-400 transition-transform duration-300 z-50 md:hidden ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-bold text-lg">Menu</span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 hover:bg-dark-400 rounded-md text-gray-300 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const notificationCount = getNotificationCount(item.path);
                const isLocked = isMenuItemLocked(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={(e) => {
                      handleNavItemClick(e, item);
                      if (!isLocked) setMobileSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative ${
                      location.pathname === item.path
                        ? 'bg-primary-600 text-white shadow-lg'
                        : isLocked
                          ? 'text-gray-500 hover:bg-dark-400 hover:text-gray-400 cursor-not-allowed opacity-60'
                          : 'text-gray-300 hover:bg-dark-400 hover:text-white'
                    }`}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {getIcon(item.icon)}
                    </svg>
                    <span className="font-medium flex items-center gap-2">
                      {item.label}
                      {isLocked && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </span>
                    {!isLocked && notificationCount > 0 && (
                      <NotificationBadge
                        count={notificationCount}
                        variant="red"
                        className="ml-auto"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Desktop Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-20'
          } bg-gray-900 border-r border-dark-400 transition-all duration-300 hidden md:block`}
        >
          <div className="p-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mb-4 p-2 hover:bg-dark-400 rounded-md text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const notificationCount = getNotificationCount(item.path);
                const isLocked = isMenuItemLocked(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={(e) => handleNavItemClick(e, item)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative ${
                      location.pathname === item.path
                        ? 'bg-primary-600 text-white shadow-lg'
                        : isLocked
                          ? 'text-gray-500 hover:bg-dark-400 hover:text-gray-400 cursor-not-allowed opacity-60'
                          : 'text-gray-300 hover:bg-dark-400 hover:text-white'
                    }`}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {getIcon(item.icon)}
                    </svg>
                    {sidebarOpen && (
                      <span className="font-medium flex items-center gap-2">
                        {item.label}
                        {isLocked && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                      </span>
                    )}
                    {!isLocked && notificationCount > 0 && (
                      <NotificationBadge
                        count={notificationCount}
                        variant="red"
                        className={sidebarOpen ? 'ml-auto' : 'absolute -top-1 -right-1'}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;