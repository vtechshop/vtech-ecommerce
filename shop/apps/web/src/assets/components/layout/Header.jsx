// FILE: apps/web/src/components/layout/Header.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import useAuth from '@/hooks/useAuth';
import SearchAutocomplete from '@/components/common/SearchAutocomplete';
import AnimatedDiv from '@/components/common/AnimatedDiv';

const Header = ({ onMobileMenuToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useAuth();
  const { items } = useSelector((state) => state.cart);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Check if we're on a dashboard page
  const isDashboardPage = location.pathname.includes('/dashboard') ||
                         location.pathname.includes('/vendor-dashboard') ||
                         location.pathname.includes('/affiliate-dashboard') ||
                         location.pathname.includes('/support-dashboard') ||
                         location.pathname.includes('/admin-dashboard');

  // Handle mobile menu toggle
  const handleMobileMenuToggle = () => {
    if (isDashboardPage && onMobileMenuToggle) {
      // On dashboard pages, use the callback to open sidebar
      onMobileMenuToggle();
    } else {
      // On regular pages, toggle the header mobile menu
      setMobileMenuOpen(!mobileMenuOpen);
    }
  };

  const cartItemCount = items.reduce((sum, item) => sum + item.qty, 0);

  // Handle scroll effect with passive listener and RAF throttle
  const rafRef = useRef(null);
  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 50);
        // Close dropdown on scroll
        if (userMenuOpen) setUserMenuOpen(false);
        rafRef.current = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [userMenuOpen]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'vendor':
        return '/vendor-dashboard';
      case 'affiliate':
        return '/affiliate-dashboard';
      case 'support':
        return '/support-dashboard';
      case 'admin':
        return '/admin-dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <header className={`bg-white dark:bg-gray-900 sticky top-0 z-40 transition-all duration-500 backdrop-blur-sm ${isScrolled ? 'py-2 shadow-2xl bg-white/95 dark:bg-gray-900/95' : 'py-3 shadow-md'} ${isScrolled && !isDashboardPage ? 'transform -translate-y-full' : 'transform translate-y-0'}`}>
      {/* Main header */}
      <div className="container mx-auto px-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 ml-4">
            <img src="/cropped-vtech-logo.webp" alt="VTech Kitchen" className="h-14 w-auto object-contain dark:ring-2 dark:ring-white/50 dark:rounded-xl dark:p-1" />
          </Link>

          {/* Search with Autocomplete */}
          <SearchAutocomplete className="flex-1 max-w-2xl hidden md:block" />

          {/* Actions */}
          <div className="flex items-center gap-4">

            {/* Mobile Search Toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden dark:text-gray-200 hover:text-primary-600"
              aria-label="Search"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* User menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 hover:text-primary-600 dark:text-gray-200 dark:hover:text-primary-400"
                  data-testid="user-menu"
                  data-cy="user-menu"
                  aria-label="User account menu"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="hidden md:block">{user.name}</span>
                </button>

                {userMenuOpen && (
                  <AnimatedDiv animation="fadeInDown" duration={0.2}>
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                    <Link
                      to={getDashboardPath()}
                      className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    {user?.role !== 'admin' && (
                      <Link
                        to="/dashboard/orders"
                        className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        My Orders
                      </Link>
                    )}
                    <Link
                      to="/dashboard/wishlist"
                      className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Wishlist
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                    >
                      Sign Out
                    </button>
                  </div>
                  </AnimatedDiv>
                )}
              </div>
            ) : (
              <Link to="/login" className="hover:text-gray-600 dark:text-gray-200 dark:hover:text-primary-400" aria-label="Login to your account">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </Link>
            )}

            {/* Cart */}
            <Link
              to="/cart"
              className="relative hover:text-gray-600 dark:text-gray-200 dark:hover:text-primary-400"
              data-testid="cart-button"
              data-cy="cart-button"
              aria-label={`Shopping cart${cartItemCount > 0 ? ` with ${cartItemCount} items` : ''}`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartItemCount > 0 && (
                <span
                  className="cart-count absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                  data-testid="cart-count"
                  data-cy="cart-count"
                  data-cart-count={cartItemCount}
                >
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu toggle - always visible */}
            <button
              onClick={handleMobileMenuToggle}
              className="md:hidden dark:text-gray-200"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <SearchAutocomplete
              className="w-full"
              onSelect={() => setMobileSearchOpen(false)}
              autoFocus
            />
          </div>
        )}

        {/* Navigation */}
        {!isDashboardPage && (() => {
          const path = location.pathname;
          const isActive = (to) => {
            if (to === '/') return path === '/';
            if (to === '/products') return path === '/products' && !location.search.includes('view=categories');
            if (to === '/products?view=categories') return path === '/products' && location.search.includes('view=categories');
            if (to === '/blog') return path.startsWith('/blog');
            return path.startsWith(to);
          };
          const navClass = (to) => `text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-300 transition-colors no-underline ${isActive(to) ? '!text-primary-600 dark:!text-primary-400 font-semibold' : ''}`;
          return (
          <nav className="hidden md:flex items-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link to="/" className={navClass('/')}>Home</Link>
            <Link to="/products" className={navClass('/products')}>Products</Link>
            <Link to="/products?view=categories" className={navClass('/products?view=categories')}>Categories</Link>
            <Link to="/page/contact" className={navClass('/page/contact')}>Contact Us</Link>
            <Link to="/blog" className={navClass('/blog')}>Blog</Link>
            <Link to="/page/about" className={navClass('/page/about')}>About</Link>
            <Link to="/track-order" className={navClass('/track-order')}>Track Order</Link>
            <Link to="/warranty-check" className={navClass('/warranty-check')}>Warranty Check</Link>
            {/* Only show Become Vendor/Affiliate for non-logged in users */}
            {!isAuthenticated && (
              <div className="ml-auto flex items-center gap-4">
                <Link
                  to="/register?role=vendor"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  Become a Vendor
                </Link>
                <Link
                  to="/register?role=affiliate"
                  className="px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  Become an Affiliate
                </Link>
              </div>
            )}
          </nav>
          );
        })()}
      </div>

      {/* Mobile menu - only show on non-dashboard pages */}
      {mobileMenuOpen && !isDashboardPage && (() => {
          const path = location.pathname;
          const isActive = (to) => {
            if (to === '/') return path === '/';
            if (to === '/products') return path === '/products' && !location.search.includes('view=categories');
            if (to === '/products?view=categories') return path === '/products' && location.search.includes('view=categories');
            if (to === '/blog') return path.startsWith('/blog');
            return path.startsWith(to);
          };
          const mobileClass = (to) => `py-2 text-gray-700 dark:text-gray-200 transition-colors no-underline ${isActive(to) ? '!text-primary-600 dark:!text-primary-400 font-semibold border-l-4 border-primary-400 pl-3' : 'hover:text-primary-600 dark:hover:text-primary-300'}`;
          return (
        <AnimatedDiv animation="slideLeft" duration={0.3}>
          <div className="md:hidden border-t dark:border-gray-700 bg-white dark:bg-gray-900">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            <Link to="/" className={mobileClass('/')} onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link to="/products" className={mobileClass('/products')} onClick={() => setMobileMenuOpen(false)}>Products</Link>
            <Link to="/products?view=categories" className={mobileClass('/products?view=categories')} onClick={() => setMobileMenuOpen(false)}>Categories</Link>
            <Link to="/page/contact" className={mobileClass('/page/contact')} onClick={() => setMobileMenuOpen(false)}>Contact Us</Link>
            <Link to="/blog" className={mobileClass('/blog')} onClick={() => setMobileMenuOpen(false)}>Blog</Link>
            <Link to="/page/about" className={mobileClass('/page/about')} onClick={() => setMobileMenuOpen(false)}>About</Link>
            <Link to="/track-order" className={mobileClass('/track-order')} onClick={() => setMobileMenuOpen(false)}>Track Order</Link>
            {/* Only show Become Vendor/Affiliate for non-logged in users */}
            {!isAuthenticated && (
              <>
                <hr className="my-2" />
                <Link
                  to="/register?role=vendor"
                  className="py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Become a Vendor
                </Link>
                <Link
                  to="/register?role=affiliate"
                  className="py-2 px-4 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors font-medium text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Become an Affiliate
                </Link>
              </>
            )}
          </nav>
        </div>
        </AnimatedDiv>
          );
      })()}
    </header>
  );
};

export default Header;