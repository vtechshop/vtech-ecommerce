import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccess(true);
      // In development, show the reset URL
      if (response.data.data.resetUrl) {
        setResetUrl(response.data.data.resetUrl);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-blue-600">
            Shop
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-700">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {success ? (
            <div className="text-center">
              <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
              <p className="text-gray-700 mb-6">
                If your email exists in our system, you'll receive a password reset link shortly.
              </p>

              {resetUrl && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 text-left">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">
                    Development Mode: Reset Link
                  </p>
                  <p className="text-xs text-yellow-700 mb-2">
                    Click the link below to reset your password:
                  </p>
                  <a
                    href={resetUrl}
                    className="text-xs text-blue-600 hover:text-blue-700 break-all underline"
                  >
                    {resetUrl}
                  </a>
                </div>
              )}

              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                Send Reset Link
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
