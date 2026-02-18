// FILE: apps/web/src/pages/dashboard/affiliate/AffiliateDashboard.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import { formatCurrency } from '@/utils/format';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, MousePointer, ShoppingCart,
  DollarSign, Percent, Copy, Check, ExternalLink,
  Calendar, Users, Award, Link2, ArrowRight, RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/common/ToastContainer';

const AffiliateDashboard = () => {
  const [copiedLink, setCopiedLink] = useState(null);
  const toast = useToast();

  const { data: stats, isLoading: statsLoading, isFetching: statsFetching, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['affiliate-stats'],
    queryFn: async () => {
      const response = await api.get('/affiliates/dashboard/stats');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: false,
  });

  const { data: linksData, isLoading: linksLoading, error: linksError, refetch: refetchLinks } = useQuery({
    queryKey: ['affiliate-links'],
    queryFn: async () => {
      const response = await api.get('/affiliates/links');
      return response.data.data;
    },
    staleTime: 10 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    retry: false,
  });

  const handleRefresh = () => { refetchStats(); refetchLinks(); };

  const handleCopyLink = (url, linkId) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(linkId);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedLink('code');
    toast.success('Affiliate code copied!');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Only show blocking error for non-404 errors (404 should auto-create profile)
  if (statsError || linksError) {
    const is404 = statsError?.response?.status === 404 || linksError?.response?.status === 404;

    // For non-404 errors, show error page
    if (!is404) {
      return (
        <div className="min-h-[600px] flex items-center justify-center">
          <div className="max-w-md text-center bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              We encountered an error loading your dashboard. Please try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
  }

  // Check KYC status for showing banner (not blocking)
  const kycStatus = stats?.kycStatus || 'pending';
  const needsKYC = kycStatus !== 'approved';

  // Show loading only if no errors and still loading
  if (statsLoading || linksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-700 mt-4">Loading your affiliate dashboard...</p>
        </div>
      </div>
    );
  }

  // Sample weekly performance data
  const weeklyData = [
    { name: 'Mon', clicks: 45, conversions: 3, earnings: 245 },
    { name: 'Tue', clicks: 52, conversions: 4, earnings: 320 },
    { name: 'Wed', clicks: 38, conversions: 2, earnings: 180 },
    { name: 'Thu', clicks: 67, conversions: 5, earnings: 425 },
    { name: 'Fri', clicks: 73, conversions: 6, earnings: 510 },
    { name: 'Sat', clicks: 89, conversions: 8, earnings: 680 },
    { name: 'Sun', clicks: 64, conversions: 5, earnings: 430 },
  ];

  // Earnings breakdown
  const earningsData = [
    { name: 'Pending', value: stats?.pendingEarnings || 0, color: '#f59e0b' },
    { name: 'Paid', value: stats?.paidEarnings || 0, color: '#10b981' },
  ];

  // Calculate trends (mock data)
  const clicksTrend = 12.5;
  const conversionsTrend = -3.2;
  const earningsTrend = 18.7;

  return (
    <div className="space-y-6">
      {/* KYC Banner - Show if KYC not approved */}
      {needsKYC && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4 fade-in badge-pulse">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800">
                {kycStatus === 'pending' ? 'Complete KYC to Withdraw Earnings' : 'KYC Verification Required'}
              </p>
              <p className="text-sm text-amber-700">
                {kycStatus === 'rejected'
                  ? 'Your KYC was rejected. Please update your documents to withdraw earnings.'
                  : 'You can use all affiliate features. Complete KYC verification to withdraw your earnings.'}
              </p>
            </div>
          </div>
          <Link
            to="/affiliate-dashboard/kyc"
            className="bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-amber-700 transition-colors text-sm"
          >
            {kycStatus === 'rejected' ? 'Update KYC' : 'Complete KYC'}
          </Link>
        </div>
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 sm:p-8 text-white fade-in-down hover-lift">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome Back, Affiliate! 👋
            </h1>
            <p className="text-primary-100 text-sm sm:text-base">
              Here's your performance overview and earnings summary
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleRefresh} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <Link
              to="/affiliate-dashboard/all-product-links"
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-primary-50 transition-colors shadow-md flex items-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              Get Product Links
            </Link>
          </div>
        </div>
      </div>

      {/* Affiliate Code Card */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 fade-in hover-lift">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-3 rounded-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium mb-1">Your Affiliate Code</p>
              <code className="text-2xl font-bold text-purple-900 tracking-wider">
                {linksData?.code || 'LOADING...'}
              </code>
            </div>
          </div>
          <button
            onClick={() => handleCopyCode(linksData?.code)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            {copiedLink === 'code' ? (
              <>
                <Check className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Clicks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all fade-in stagger-1 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <MousePointer className="w-6 h-6 text-blue-600" />
            </div>
            {clicksTrend > 0 ? (
              <span className="flex items-center text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4 mr-1" />
                {clicksTrend}%
              </span>
            ) : (
              <span className="flex items-center text-red-600 text-sm font-medium">
                <TrendingDown className="w-4 h-4 mr-1" />
                {Math.abs(clicksTrend)}%
              </span>
            )}
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Total Clicks</h3>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalClicks || 0}</p>
          <p className="text-xs text-gray-500 mt-2">All time link clicks</p>
        </div>

        {/* Total Conversions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all fade-in stagger-2 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            {conversionsTrend > 0 ? (
              <span className="flex items-center text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4 mr-1" />
                {conversionsTrend}%
              </span>
            ) : (
              <span className="flex items-center text-red-600 text-sm font-medium">
                <TrendingDown className="w-4 h-4 mr-1" />
                {Math.abs(conversionsTrend)}%
              </span>
            )}
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Total Sales</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.totalConversions || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Successful conversions</p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all fade-in stagger-3 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Percent className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Conversion Rate</h3>
          <p className="text-3xl font-bold text-purple-600">{stats?.conversionRate || 0}%</p>
          <p className="text-xs text-gray-500 mt-2">Clicks to sales ratio</p>
        </div>

        {/* Total Earnings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all fade-in stagger-4 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
            {earningsTrend > 0 ? (
              <span className="flex items-center text-green-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4 mr-1" />
                {earningsTrend}%
              </span>
            ) : (
              <span className="flex items-center text-red-600 text-sm font-medium">
                <TrendingDown className="w-4 h-4 mr-1" />
                {Math.abs(earningsTrend)}%
              </span>
            )}
          </div>
          <h3 className="text-gray-700 text-sm font-medium mb-1">Total Earnings</h3>
          <p className="text-3xl font-bold text-amber-600">
            {formatCurrency(stats?.totalEarnings || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Commission earned</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 fade-in-up hover-lift">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Weekly Performance</h2>
              <p className="text-sm text-gray-500 mt-1">Last 7 days activity</p>
            </div>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="conversions"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Earnings Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Earnings</h2>
              <p className="text-sm text-gray-500 mt-1">Breakdown</p>
            </div>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>

          <div className="flex justify-center mb-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={earningsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {earningsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm font-medium text-gray-700">Pending</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(stats?.pendingEarnings || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-700">Paid Out</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(stats?.paidEarnings || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Your Affiliate Links</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {linksData?.links?.map((link, index) => (
            <div
              key={index}
              className="group bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border-2 border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
                    <Link2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 capitalize">{link.type}</h4>
                </div>
                <button
                  onClick={() => handleCopyLink(link.url, index)}
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {copiedLink === index ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-700 mb-3">{link.description}</p>

              <div className="bg-white rounded-md p-2 border border-gray-200">
                <code className="text-xs text-gray-700 break-all line-clamp-2">
                  {link.url}
                </code>
              </div>

              <button
                onClick={() => handleCopyLink(link.url, index)}
                className="mt-3 w-full bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
                {copiedLink === index ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <Link
          to="/affiliate-dashboard/all-product-links"
          className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all shadow-md hover:shadow-lg"
        >
          View All Product Links
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Getting Started Guide */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="bg-primary-600 p-3 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 text-lg mb-2">🚀 How to Maximize Your Earnings</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>Copy your affiliate links and share them on your website, blog, or social media</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>Generate product-specific links from the "All Product Links" page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>Track your performance and optimize based on conversion rates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>Cookie tracking ensures you get credit for up to 30 days after a click</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateDashboard;
