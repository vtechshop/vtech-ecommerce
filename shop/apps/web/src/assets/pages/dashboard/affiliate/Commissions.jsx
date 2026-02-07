// FILE: apps/web/src/pages/dashboard/affiliate/Commissions.jsx
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Info, HelpCircle, DollarSign, CheckCircle, TrendingUp, Clock, Wallet,
  Calendar, ArrowUpRight, ArrowDownRight, Filter, ChevronDown, ChevronUp,
  Award, Target, Zap, Gift, CreditCard, FileText, Download, Search,
  Package, ExternalLink, AlertCircle, BarChart3, PieChart, Receipt
} from 'lucide-react';
import api from '@/utils/api';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import Button from '@/components/common/Button';
import { formatCurrency, formatDate } from '@/utils/format';
import { useToast } from '@/components/common/ToastContainer';

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, subValue, trend, color, onClick, active }) => {
  const colorClasses = {
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-500' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-500' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' },
  };
  const classes = colorClasses[color] || colorClasses.blue;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border-2 p-4 sm:p-5 transition-all hover:shadow-md ${
        active ? `${classes.border} ring-2 ring-${color}-200` : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${classes.bg}`}>
          <Icon className={`w-5 h-5 ${classes.text}`} />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
            trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
    </button>
  );
};

// Tier Progress Component
const TierProgress = ({ currentEarnings, commissionRate }) => {
  const tiers = [
    { name: 'Bronze', min: 10000, rate: 5, color: 'bg-amber-600' },
    { name: 'Silver', min: 25000, rate: 6, color: 'bg-gray-400' },
    { name: 'Gold', min: 50000, rate: 7, color: 'bg-yellow-500' },
    { name: 'Platinum', min: 100000, rate: 8, color: 'bg-purple-600' },
  ];

  const currentTier = tiers.reduce((acc, tier) => {
    if (currentEarnings >= tier.min) return tier;
    return acc;
  }, tiers[0]);

  const nextTier = tiers.find(t => t.min > currentEarnings);
  const progress = nextTier
    ? Math.min(100, (currentEarnings / nextTier.min) * 100)
    : 100;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentTier.color}`}>
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Your Tier: {currentTier.name}</h3>
            <p className="text-xs text-gray-600">{currentTier.rate}% commission rate</p>
          </div>
        </div>
        {nextTier && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Next: {nextTier.name}</p>
            <p className="text-sm font-semibold text-purple-600">₹{(nextTier.min - currentEarnings).toLocaleString()} to go</p>
          </div>
        )}
      </div>

      {nextTier && (
        <div className="mb-3">
          <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`text-center p-2 rounded-lg ${
              currentTier.name === tier.name
                ? 'bg-white border-2 border-purple-400 shadow-sm'
                : 'bg-white/50'
            }`}
          >
            <p className="text-xs font-medium text-gray-700">{tier.name}</p>
            <p className="text-sm font-bold text-purple-600">{tier.rate}%</p>
            <p className="text-[10px] text-gray-500">₹{(tier.min / 1000)}K+</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Commission Card Component (Mobile)
const CommissionCard = ({ commission }) => {
  const tdsAmt = commission.tds?.amount || 0;
  const netAmt = commission.tds?.netAmount || commission.amount;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-blue-100 text-blue-800 border-blue-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-sm font-medium text-gray-900">
            {commission.orderId?.orderId || 'N/A'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(commission.createdAt)}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${statusColors[commission.status]}`}>
          {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-gray-500 mb-1">Commission</p>
          <p className="font-semibold text-green-600">{formatCurrency(commission.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">TDS</p>
          <p className="font-medium text-red-500">
            {commission.status === 'paid' && tdsAmt > 0 ? `-${formatCurrency(tdsAmt)}` : '-'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Net Payout</p>
          <p className="font-bold text-gray-900">
            {commission.status === 'paid' && tdsAmt > 0 ? formatCurrency(netAmt) : formatCurrency(commission.amount)}
          </p>
        </div>
      </div>

      {commission.paidAt && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          Paid on: {formatDate(commission.paidAt)}
        </div>
      )}
    </div>
  );
};

const Commissions = () => {
  const [page, setPage] = useState(() => {
    const savedPage = sessionStorage.getItem('affiliate-commissions-page');
    return savedPage ? parseInt(savedPage) : 1;
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    return sessionStorage.getItem('affiliate-commissions-filter') || '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const toast = useToast();

  // Fetch dashboard stats
  const { data: statsData } = useQuery({
    queryKey: ['affiliate-stats'],
    queryFn: async () => {
      const response = await api.get('/affiliates/dashboard/stats');
      return response.data.data;
    },
    staleTime: 3 * 60 * 1000,
    retry: false,
  });

  // Fetch commission stats
  const { data: commissionStatsData } = useQuery({
    queryKey: ['affiliate-commission-stats'],
    queryFn: async () => {
      const response = await api.get('/affiliates/commissions/stats');
      return response.data.data;
    },
    staleTime: 3 * 60 * 1000,
    retry: false,
  });

  // Fetch commissions
  const { data, isLoading, error } = useQuery({
    queryKey: ['affiliate-commissions', page, statusFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);
      if (dateRange && dateRange !== 'all') params.append('dateRange', dateRange);

      const response = await api.get(`/affiliates/commissions?${params}`);
      return response.data;
    },
    staleTime: 3 * 60 * 1000,
    keepPreviousData: true,
    retry: false,
  });

  // Save filters to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('affiliate-commissions-page', page.toString());
  }, [page]);

  useEffect(() => {
    sessionStorage.setItem('affiliate-commissions-filter', statusFilter);
  }, [statusFilter]);

  // Filter commissions by search
  const filteredCommissions = useMemo(() => {
    const commissions = data?.data || [];
    if (!searchQuery) return commissions;

    const query = searchQuery.toLowerCase();
    return commissions.filter(c =>
      c.orderId?.orderId?.toLowerCase().includes(query)
    );
  }, [data?.data, searchQuery]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error states
  if (error && error?.response?.status !== 404) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to load commissions</h2>
          <p className="text-gray-600 mb-4">Something went wrong. Please try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (error && error?.response?.status === 404) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <DollarSign className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Setting up your affiliate profile...</h2>
          <p className="text-gray-600 mb-4">Your profile is being created. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);
  const stats = statsData || {};
  const commissionStats = commissionStatsData || {};

  // Calculate amounts
  const pending = stats.pendingEarnings || 0;
  const totalEarnings = stats.totalEarnings || 0;
  const paid = stats.paidEarnings || 0;
  const approved = Math.max(0, totalEarnings - pending - paid);
  const thisMonthEarnings = stats.thisMonthEarnings || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Commissions</h1>
          <p className="text-gray-600 text-sm mt-1">Track your earnings and payouts</p>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
        >
          <HelpCircle className="w-4 h-4" />
          How It Works
          {showInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Info Panel (Collapsible) */}
      {showInfo && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-3">Understanding Your Commissions</h3>

              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <div className="flex items-start gap-2 text-sm text-green-800">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Standard Rate:</strong> 5% on all sales</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-green-800">
                  <Clock className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Created:</strong> When order is placed</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-green-800">
                  <Package className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Approved:</strong> After delivery confirmed</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-green-800">
                  <Wallet className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Paid:</strong> Monthly (within 15 days)</span>
                </div>
              </div>

              <div className="bg-white border border-green-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-semibold text-green-900 mb-1">Example Calculation:</p>
                <p className="text-sm text-green-800">
                  Order: ₹10,000 →{' '}
                  <span className="text-green-600 font-semibold">Commission: ₹500 (5%)</span> →{' '}
                  <span className="text-red-600 font-semibold">TDS: -₹10 (2%)</span> →{' '}
                  <span className="font-bold text-green-700">You Get: ₹490</span>
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-900">
                  <strong>TDS Notice:</strong> 2% TDS is deducted on all payouts as per Indian tax laws.
                  TDS certificate will be available for ITR filing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          icon={Clock}
          label="Pending"
          value={formatCurrency(pending)}
          subValue="Awaiting approval"
          color="yellow"
          onClick={() => { setStatusFilter('pending'); setPage(1); }}
          active={statusFilter === 'pending'}
        />
        <StatsCard
          icon={CheckCircle}
          label="Approved"
          value={formatCurrency(approved)}
          subValue="Ready for payout"
          color="green"
          onClick={() => { setStatusFilter('approved'); setPage(1); }}
          active={statusFilter === 'approved'}
        />
        <StatsCard
          icon={Wallet}
          label="Paid"
          value={formatCurrency(paid)}
          subValue="Successfully paid out"
          color="blue"
          onClick={() => { setStatusFilter('paid'); setPage(1); }}
          active={statusFilter === 'paid'}
        />
        <StatsCard
          icon={TrendingUp}
          label="This Month"
          value={formatCurrency(thisMonthEarnings)}
          trend={stats.earningsChange}
          color="purple"
          onClick={() => { setStatusFilter(''); setDateRange('month'); setPage(1); }}
          active={dateRange === 'month'}
        />
      </div>

      {/* Tier Progress */}
      <TierProgress
        currentEarnings={thisMonthEarnings}
        commissionRate={stats.commissionPercentage || 5}
      />

      {/* Commission History Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Date Filter */}
            <select
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>

            {/* Clear Filters */}
            {(statusFilter || dateRange !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setDateRange('all');
                  setSearchQuery('');
                  setPage(1);
                }}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Commission History Title */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-500" />
            Commission History
          </h2>
          <span className="text-sm text-gray-500">
            {filteredCommissions.length} records
          </span>
        </div>

        {/* Mobile View - Cards */}
        <div className="lg:hidden p-4">
          {filteredCommissions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-700 mb-2">No Commissions Yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Commissions will appear here when customers purchase through your links.
              </p>
              <Link
                to="/affiliate-dashboard/links"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Get Your Affiliate Links
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredCommissions.map((commission) => (
                <CommissionCard key={commission._id} commission={commission} />
              ))}
            </div>
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block overflow-x-auto">
          {filteredCommissions.length === 0 ? (
            <div className="text-center py-16">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Commissions Yet</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-4">
                When customers make purchases using your affiliate links, your commissions will appear here.
              </p>
              <Link
                to="/affiliate-dashboard/links"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Get Your Affiliate Links
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-xs text-gray-500 uppercase">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs text-gray-500 uppercase">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-xs text-gray-500 uppercase">Commission</th>
                  <th className="text-right py-3 px-4 font-semibold text-xs text-gray-500 uppercase">TDS (2%)</th>
                  <th className="text-right py-3 px-4 font-semibold text-xs text-gray-500 uppercase">Net Payout</th>
                  <th className="text-center py-3 px-4 font-semibold text-xs text-gray-500 uppercase">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs text-gray-500 uppercase">Paid Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCommissions.map((commission) => {
                  const tdsAmt = commission.tds?.amount || 0;
                  const netAmt = commission.tds?.netAmount || commission.amount;
                  return (
                    <tr key={commission._id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {commission.orderId?.orderId || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(commission.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-green-600">{formatCurrency(commission.amount)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-red-500">
                          {commission.status === 'paid' && tdsAmt > 0 ? `-${formatCurrency(tdsAmt)}` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-gray-900">
                          {commission.status === 'paid' && tdsAmt > 0 ? formatCurrency(netAmt) : formatCurrency(commission.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                          commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                          commission.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {commission.paidAt ? formatDate(commission.paidAt) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Payout Information */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Payout Schedule</h3>
              <p className="text-xs text-gray-600">Monthly payouts</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              Payouts processed 1st-15th of each month
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              Minimum payout: ₹500
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              Direct bank transfer (NEFT/IMPS)
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Tax Documents</h3>
              <p className="text-xs text-gray-600">TDS & compliance</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-amber-600" />
              2% TDS deducted as per IT rules
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-amber-600" />
              Form 16A available quarterly
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-amber-600" />
              Annual TDS certificate for ITR
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Commissions;
