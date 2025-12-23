// FILE: apps/web/src/pages/Register.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '@/store/slices/authSlice';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import CustomSelect from '@/components/common/CustomSelect';

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer', // Default role
  });

  // Get role-based dashboard path
  const getDashboardPath = (userRole) => {
    const roleDashboardMap = {
      admin: '/admin-dashboard',
      vendor: '/vendor-dashboard',
      affiliate: '/affiliate-dashboard',
      support: '/support-dashboard',
      customer: '/dashboard',
    };
    return roleDashboardMap[userRole] || '/dashboard';
  };

  useEffect(() => {
    if (user) {
      // Redirect to role-specific dashboard after registration
      const destination = getDashboardPath(user.role);
      navigate(destination, { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    // Validate password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-[\]{}|;:'"<>,.\/\\])[A-Za-z\d@$!%*?&#^()_+=\-[\]{}|;:'"<>,.\/\\]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      alert('Password must be at least 8 characters and contain: uppercase, lowercase, number, and special character (@$!%*?& etc.)');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    // Validate name
    if (formData.name.trim().length < 2) {
      alert('Name must be at least 2 characters long');
      return;
    }

    try {
      await dispatch(register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      })).unwrap();
      // Navigation is handled by useEffect above when user state changes
    } catch (err) {
      // Error is handled by the slice
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-blue-600">
            Shop
          </Link>
          <h2 className="mt-6 text-3xl md:text-4xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-700">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-gray-600">
              Sign in
            </Link>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="register-form">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p className="font-medium">{typeof error === 'string' ? error : 'Registration failed'}</p>
                {error?.details && (
                  <ul className="mt-2 text-sm list-disc list-inside">
                    {error.details.map((detail, index) => (
                      <li key={index}>{detail.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              name="name"
              required
              autoComplete="name"
              minLength={2}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              helperText="Enter your full name"
              data-testid="register-name"
            />

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Account Type <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={formData.role}
                onChange={(value) => setFormData({ ...formData, role: value })}
                options={[
                  { value: 'customer', label: 'Customer' },
                  { value: 'vendor', label: 'Vendor' },
                  { value: 'affiliate', label: 'Affiliate' }
                ]}
                placeholder="Select account type"
                className="w-full"
              />
              <p className="mt-1 text-sm text-gray-500">
                Choose how you want to use the platform
              </p>
            </div>

            <Input
              label="Email Address"
              type="email"
              name="email"
              required
              autoComplete="email"
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              helperText="Enter a valid email address (e.g., user@example.com)"
              data-testid="register-email"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              required
              autoComplete="new-password"
              minLength={8}
              helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              data-testid="register-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              required
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              data-testid="register-confirm-password"
            />

            {formData.role === 'vendor' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">Vendor Account</p>
                <p>You'll be able to list and sell products on our marketplace. Your account will be reviewed by our team.</p>
              </div>
            )}

            {formData.role === 'affiliate' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                <p className="font-medium mb-1">Affiliate Account</p>
                <p>You'll earn commissions by promoting products. Start sharing product links and earn rewards!</p>
              </div>
            )}

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the{' '}
                <Link to="/page/terms" className="text-blue-600 hover:text-gray-600">
                  Terms and Conditions
                </Link>
              </label>
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} data-testid="register-submit">
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;