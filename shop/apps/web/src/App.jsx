﻿// FILE: apps/web/src/App.jsx
import { useEffect, Suspense, lazy, useRef } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Loading from './assets/components/common/Loading';
import { ToastProvider } from './assets/components/common/ToastContainer';
import { loadConsent } from './assets/store/slices/consentSlice';
import { initializeAuth } from './assets/store/slices/authSlice';
import { loadCart } from './assets/store/slices/cartSlice';
import useAnalytics from './assets/hooks/useAnalytics';
import { initCsrfProtection } from './assets/utils/api';
import { initWebVitals } from './assets/utils/webVitals';
import { captureAffiliateFromURL } from './assets/utils/affiliateTracking';

// Load Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

// Lazy load layouts
const PublicLayout = lazy(() => import('./assets/components/layout/PublicLayout'));
const DashboardLayout = lazy(() => import('./assets/components/layout/DashboardLayout'));
const CookieBanner = lazy(() => import('./assets/components/consent/CookieBanner'));
const ChatWidget = lazy(() => import('./assets/components/chatbot/ChatWidget'));

// Lazy load public pages
const Home = lazy(() => import('./assets/pages/Home'));
const Search = lazy(() => import('./assets/pages/Search'));
const Category = lazy(() => import('./assets/pages/Category'));
const Product = lazy(() => import('./assets/pages/Product'));
const Cart = lazy(() => import('./assets/pages/Cart'));
const Checkout = lazy(() => import('./assets/pages/Checkout'));
const OrderConfirmation = lazy(() => import('./assets/pages/OrderConfirmation'));
const Login = lazy(() => import('./assets/pages/Login'));
const Register = lazy(() => import('./assets/pages/Register'));
const ForgotPassword = lazy(() => import('./assets/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./assets/pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./assets/pages/VerifyEmail'));
const VendorStore = lazy(() => import('./assets/pages/VendorStore'));
const Blog = lazy(() => import('./assets/pages/Blog'));
const BlogPostDetail = lazy(() => import('./assets/pages/BlogPost'));
const Page = lazy(() => import('./assets/pages/cms/Page'));
const NotFound = lazy(() => import('./assets/pages/NotFound'));

// Lazy load info pages
const TrackOrder = lazy(() => import('./assets/pages/info/TrackOrder'));
const Shipping = lazy(() => import('./assets/pages/info/Shipping'));
const Returns = lazy(() => import('./assets/pages/info/Returns'));
const FAQ = lazy(() => import('./assets/pages/info/FAQ'));
const Contact = lazy(() => import('./assets/pages/info/Contact'));
const Terms = lazy(() => import('./assets/pages/info/Terms'));
const Privacy = lazy(() => import('./assets/pages/info/Privacy'));
const CookiePolicy = lazy(() => import('./assets/pages/info/CookiePolicy'));
const VendorTerms = lazy(() => import('./assets/pages/info/VendorTerms'));
const VendorGuide = lazy(() => import('./assets/pages/info/VendorGuide'));
const AffiliateTerms = lazy(() => import('./assets/pages/info/AffiliateTerms'));
const AffiliateGuide = lazy(() => import('./assets/pages/info/AffiliateGuide'));
const AdminQuickReference = lazy(() => import('./assets/pages/info/AdminQuickReference'));
const About = lazy(() => import('./assets/pages/info/About'));

// Lazy load dashboard pages
const CustomerDashboard = lazy(() => import('./assets/pages/dashboard/customer/CustomerDashboard'));
const CustomerOrders = lazy(() => import('./assets/pages/dashboard/customer/Orders'));
const OrderDetail = lazy(() => import('./assets/pages/dashboard/customer/OrderDetail'));
const Addresses = lazy(() => import('./assets/pages/dashboard/customer/Addresses'));
const Wishlist = lazy(() => import('./assets/pages/dashboard/customer/Wishlist'));
const Settings = lazy(() => import('./assets/pages/dashboard/customer/Settings'));
const BecomeVendor = lazy(() => import('./assets/pages/dashboard/customer/BecomeVendor'));
const BecomeAffiliate = lazy(() => import('./assets/pages/dashboard/customer/BecomeAffiliate'));

// Protected route wrapper - MUST be outside App component to prevent remounting on every render
const ProtectedRoute = ({ user, children, allowedRoles = [], requireVendorApproval = false }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user role is allowed
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    const roleDashboardMap = {
      admin: '/admin-dashboard',
      vendor: '/vendor-dashboard',
      affiliate: '/affiliate-dashboard',
      support: '/support-dashboard',
      customer: '/dashboard',
    };
    const userDashboard = roleDashboardMap[user.role] || '/dashboard';
    return <Navigate to={userDashboard} replace />;
  }

  // Special check for vendors - require KYC approval (admin can bypass)
  if (requireVendorApproval && user.role === 'vendor') {
    // Check if vendor's KYC is approved
    const isKYCApproved = user.vendorProfile?.kyc?.status === 'approved';

    // Redirect to KYC page if vendor not approved
    if (!isKYCApproved) {
      return <Navigate to="/vendor-dashboard/kyc" replace />;
    }
  }

  return children;
};

const VendorDashboard = lazy(() => import('./assets/pages/dashboard/vendor/VendorDashboard'));
const VendorProducts = lazy(() => import('./assets/pages/dashboard/vendor/Products'));
const Inventory = lazy(() => import('./assets/pages/dashboard/vendor/Inventory'));
const VendorOrders = lazy(() => import('./assets/pages/dashboard/vendor/VendorOrders'));
const VendorOrderDetail = lazy(() => import('./assets/pages/dashboard/vendor/VendorOrderDetail'));
const Settlements = lazy(() => import('./assets/pages/dashboard/vendor/Settlements'));
const VendorAds = lazy(() => import('./assets/pages/dashboard/vendor/Ads'));
const VendorSettings = lazy(() => import('./assets/pages/dashboard/vendor/VendorSettings'));
const VendorSupport = lazy(() => import('./assets/pages/dashboard/vendor/Support'));

const AffiliateDashboard = lazy(() => import('./assets/pages/dashboard/affiliate/AffiliateDashboard'));
const Links = lazy(() => import('./assets/pages/dashboard/affiliate/Links'));
const AllProductLinks = lazy(() => import('./assets/pages/dashboard/affiliate/AllProductLinks'));
const Commissions = lazy(() => import('./assets/pages/dashboard/affiliate/Commissions'));
const AffiliateSupport = lazy(() => import('./assets/pages/dashboard/affiliate/Support'));

const SupportDashboard = lazy(() => import('./assets/pages/dashboard/support/SupportDashboard'));
const Tickets = lazy(() => import('./assets/pages/dashboard/support/Tickets'));

const AdminDashboard = lazy(() => import('./assets/pages/dashboard/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./assets/pages/dashboard/admin/Users'));
const AdminProducts = lazy(() => import('./assets/pages/dashboard/admin/Products'));
const AdminCategories = lazy(() => import('./assets/pages/dashboard/admin/Categories'));
const AdminOrders = lazy(() => import('./assets/pages/dashboard/admin/Orders'));
const Payments = lazy(() => import('./assets/pages/dashboard/admin/Payments'));
const AdminVendors = lazy(() => import('./assets/pages/dashboard/admin/Vendors'));
const AdminAffiliates = lazy(() => import('./assets/pages/dashboard/admin/Affiliates'));
const AdminAds = lazy(() => import('./assets/pages/dashboard/admin/AdsManagement'));
const AdminCMS = lazy(() => import('./assets/pages/dashboard/admin/CMSManagement'));
const AdminSettings = lazy(() => import('./assets/pages/dashboard/admin/Settings'));
const AdminCommunications = lazy(() => import('./assets/pages/dashboard/admin/Communications'));
const AdminContactSubmissions = lazy(() => import('./assets/pages/dashboard/admin/ContactSubmissions'));
const AdminReviews = lazy(() => import('./assets/pages/dashboard/admin/Reviews'));
const AdminWarranties = lazy(() => import('./assets/pages/dashboard/admin/Warranties'));
const BlogManagement = lazy(() => import('./assets/pages/dashboard/admin/BlogManagement'));
const KYCReview = lazy(() => import('./assets/pages/dashboard/admin/KYCReview'));
const CRMCustomers = lazy(() => import('./assets/pages/dashboard/admin/CRMCustomers'));
const CRMTickets = lazy(() => import('./assets/pages/dashboard/admin/CRMTickets'));
const VendorPayouts = lazy(() => import('./assets/pages/dashboard/admin/VendorPayouts'));
const VendorCommissions = lazy(() => import('./assets/pages/dashboard/admin/VendorCommissions'));
const AffiliateCommissions = lazy(() => import('./assets/pages/dashboard/admin/AffiliateCommissions'));
const VendorKYC = lazy(() => import('./assets/pages/dashboard/vendor/VendorKYC'));
const AffiliateKYC = lazy(() => import('./assets/pages/dashboard/affiliate/AffiliateKYC'));

function App() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const previousUserRef = useRef(null);
  const [searchParams] = useSearchParams();
  useAnalytics();

  useEffect(() => {
    dispatch(loadConsent());
    dispatch(initializeAuth());
    dispatch(loadCart());
    // Initialize CSRF protection (only active in production)
    initCsrfProtection();
    // Initialize Web Vitals performance monitoring
    initWebVitals();
  }, [dispatch]);

  // Capture affiliate code from URL parameters (works on any page)
  useEffect(() => {
    captureAffiliateFromURL(searchParams);
  }, [searchParams]);

  // Clear user-specific React Query cache when user logs out or role changes
  // IMPORTANT: Only clear user-specific queries, NOT public data (products, categories, etc.)
  useEffect(() => {
    const previousUser = previousUserRef.current;

    // User logged out (was logged in, now null)
    if (previousUser && !user) {
      // Only clear user-specific queries, preserve public data cache
      queryClient.removeQueries({ queryKey: ['wishlist'] });
      queryClient.removeQueries({ queryKey: ['orders'] });
      queryClient.removeQueries({ queryKey: ['addresses'] });
      queryClient.removeQueries({ queryKey: ['user'] });
      queryClient.removeQueries({ queryKey: ['cart'] });
      queryClient.removeQueries({ queryKey: ['notifications'] });
      queryClient.removeQueries({ queryKey: ['tickets'] });
      queryClient.removeQueries({ queryKey: ['commissions'] });
      queryClient.removeQueries({ queryKey: ['settlements'] });
      // Don't clear sessionStorage - preserve UI state like pagination/filters
    }

    // User role changed (switched between customer/vendor/affiliate/admin)
    if (previousUser && user && previousUser.role !== user.role) {
      // Only clear role-specific queries
      queryClient.removeQueries({ queryKey: ['wishlist'] });
      queryClient.removeQueries({ queryKey: ['orders'] });
      queryClient.removeQueries({ queryKey: ['vendor'] });
      queryClient.removeQueries({ queryKey: ['affiliate'] });
      queryClient.removeQueries({ queryKey: ['admin'] });
      queryClient.removeQueries({ queryKey: ['tickets'] });
      queryClient.removeQueries({ queryKey: ['commissions'] });
      queryClient.removeQueries({ queryKey: ['settlements'] });
      // Don't clear sessionStorage - preserve UI state
    }

    // Update ref for next comparison
    previousUserRef.current = user;
  }, [user, queryClient]);

  return (
    <ToastProvider>
      <Suspense fallback={<Loading message="Loading page..." />}>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/category/:slug" element={<Category />} />
            <Route path="/product/:slug" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/vendor/:slug" element={<VendorStore />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostDetail />} />
            <Route path="/page/:slug" element={<Page />} />

            {/* Info & Legal Pages */}
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/page/shipping" element={<Shipping />} />
            <Route path="/page/returns" element={<Returns />} />
            <Route path="/page/faq" element={<FAQ />} />
            <Route path="/page/contact" element={<Contact />} />
            <Route path="/page/terms" element={<Terms />} />
            <Route path="/page/privacy" element={<Privacy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/page/vendor-terms" element={<VendorTerms />} />
            <Route path="/page/vendor-guide" element={<VendorGuide />} />
            <Route path="/page/affiliate-terms" element={<AffiliateTerms />} />
            <Route path="/page/affiliate-guide" element={<AffiliateGuide />} />
            <Route path="/page/admin-quick-reference" element={<AdminQuickReference />} />
            <Route path="/page/about" element={<About />} />
          </Route>

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Checkout (can be guest or logged in) */}
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />

          {/* Customer dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user} allowedRoles={['customer', 'vendor', 'affiliate', 'support', 'admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CustomerDashboard />} />
            <Route path="orders" element={<CustomerOrders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="settings" element={<Settings />} />
            <Route path="become-vendor" element={<BecomeVendor />} />
            <Route path="become-affiliate" element={<BecomeAffiliate />} />
          </Route>

          {/* Vendor dashboard */}
          <Route
            path="/vendor-dashboard"
            element={
              <ProtectedRoute user={user} allowedRoles={['vendor', 'admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Routes accessible to all vendors (pending or approved) */}
            <Route path="kyc" element={<VendorKYC />} />
            <Route path="support" element={<VendorSupport />} />

            {/* Protected vendor routes - require KYC approval */}
            <Route index element={<ProtectedRoute user={user} requireVendorApproval><VendorDashboard /></ProtectedRoute>} />
            <Route path="products" element={<ProtectedRoute user={user} requireVendorApproval><VendorProducts /></ProtectedRoute>} />
            <Route path="inventory" element={<ProtectedRoute user={user} requireVendorApproval><Inventory /></ProtectedRoute>} />
            <Route path="orders" element={<ProtectedRoute user={user} requireVendorApproval><VendorOrders /></ProtectedRoute>} />
            <Route path="orders/:id" element={<ProtectedRoute user={user} requireVendorApproval><VendorOrderDetail /></ProtectedRoute>} />
            <Route path="settlements" element={<ProtectedRoute user={user} requireVendorApproval><Settlements /></ProtectedRoute>} />
            <Route path="ads" element={<ProtectedRoute user={user} requireVendorApproval><VendorAds /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute user={user} requireVendorApproval><VendorSettings /></ProtectedRoute>} />
          </Route>

          {/* Affiliate dashboard */}
          <Route
            path="/affiliate-dashboard"
            element={
              <ProtectedRoute user={user} allowedRoles={['affiliate', 'admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AffiliateDashboard />} />
            <Route path="links" element={<Links />} />
            <Route path="all-product-links" element={<AllProductLinks />} />
            <Route path="commissions" element={<Commissions />} />
            <Route path="kyc" element={<AffiliateKYC />} />
            <Route path="support" element={<AffiliateSupport />} />
          </Route>

          {/* Support dashboard */}
          <Route
            path="/support-dashboard"
            element={
              <ProtectedRoute user={user} allowedRoles={['support', 'admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SupportDashboard />} />
            <Route path="tickets" element={<Tickets />} />
          </Route>

          {/* Admin dashboard */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute user={user} allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="payments" element={<Payments />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="affiliates" element={<AdminAffiliates />} />
            <Route path="affiliate-commissions" element={<AffiliateCommissions />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="ads" element={<AdminAds />} />
            <Route path="cms" element={<AdminCMS />} />
            <Route path="blog" element={<BlogManagement />} />
            <Route path="communications" element={<AdminCommunications />} />
            <Route path="contact-submissions" element={<AdminContactSubmissions />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="warranties" element={<AdminWarranties />} />
            <Route path="kyc-review" element={<KYCReview />} />
            <Route path="payouts" element={<VendorPayouts />} />
            <Route path="vendor-commissions" element={<VendorCommissions />} />
            <Route path="crm/customers" element={<CRMCustomers />} />
            <Route path="crm/tickets" element={<CRMTickets />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* 404 - Page Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        <CookieBanner />
        <ChatWidget />
      </Suspense>
    </ToastProvider>
  );
}

export default App;
