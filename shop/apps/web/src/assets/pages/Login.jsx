// FILE: apps/web/src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '@/store/slices/authSlice';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { user, loading, error } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const redirect = searchParams.get('redirect');

  // Get role-based dashboard path
  const getDashboardPath = (userRole) => {
    const roleDashboardMap = {
      admin: '/admin-dashboard',
      vendor: '/vendor-dashboard',
      affiliate: '/affiliate-dashboard',
      support: '/support-dashboard',
      customer: '/', // Regular customers go to homepage
    };
    return roleDashboardMap[userRole] || '/'; // Default to homepage
  };

  useEffect(() => {
    if (user) {
      // Navigate to redirect URL or role-specific dashboard
      const destination = redirect || getDashboardPath(user.role);
      navigate(destination, { replace: true });
    }
  }, [user, navigate, redirect]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs before sending
    if (!formData.email || !formData.password) {
      return;
    }

    // Trim and normalize email before sending
    const normalizedData = {
      email: formData.email.trim().toLowerCase(),
      password: formData.password, // Don't trim password - it might be intentional
    };

    try {
      await dispatch(login(normalizedData)).unwrap();
      // Navigation is handled by useEffect above when user state changes
    } catch (err) {
      // Error is handled by the slice and shown to user
      // Loading state will be reset by Redux automatically
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-blue-600">
            Shop
          </Link>
          <h2 className="mt-6 text-3xl md:text-4xl font-bold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-700">
            Or{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-gray-600">
              create a new account
            </Link>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p className="font-medium">{error}</p>
                {error.includes('locked') && (
                  <p className="text-sm mt-1">Please wait before trying again or contact support if you need help.</p>
                )}
                {error.includes('Invalid') && (
                  <p className="text-sm mt-1">Please check your email and password and try again.</p>
                )}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              name="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              data-testid="login-email"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              required
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              data-testid="login-password"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-gray-600">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} data-testid="login-submit">
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;