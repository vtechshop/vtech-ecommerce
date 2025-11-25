// FILE: apps/web/src/hooks/useAuth.js
import { useSelector } from 'react-redux';

const useAuth = () => {
  const { user, loading } = useSelector((state) => state.auth);

  const isAuthenticated = !!user;
  const isCustomer = user?.role === 'customer';
  const isVendor = user?.role === 'vendor';
  const isAffiliate = user?.role === 'affiliate';
  const isSupport = user?.role === 'support';
  const isAdmin = user?.role === 'admin';

  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return {
    user,
    loading,
    isAuthenticated,
    isCustomer,
    isVendor,
    isAffiliate,
    isSupport,
    isAdmin,
    hasRole,
  };
};

export default useAuth;