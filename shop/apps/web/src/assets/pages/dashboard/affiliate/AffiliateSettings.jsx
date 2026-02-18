import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, DollarSign, Shield, CreditCard, Volume2, VolumeX,
  TrendingUp, TrendingDown, ChevronRight, Copy, Check, Link2,
  Bell, BellOff, Eye, EyeOff, HelpCircle, ExternalLink,
  Wallet, BadgeCheck, Clock, AlertTriangle, Sparkles, Target,
  Building2, FileText, Percent, MousePointerClick, ShoppingCart,
  Calendar, Award, Info, ChevronDown, ChevronUp, BarChart3, Megaphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { useToast } from '../../../components/common/ToastContainer';
import { getSoundEnabled, toggleSound, playClick } from '@/utils/sounds';

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, subValue, trend, trendValue, color, onClick }) => {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 hover:border-green-300',
    yellow: 'bg-amber-50 border-amber-200 hover:border-amber-300',
    blue: 'bg-blue-50 border-blue-200 hover:border-blue-300',
    purple: 'bg-purple-50 border-purple-200 hover:border-purple-300',
  };

  const iconBgClasses = {
    green: 'bg-green-100',
    yellow: 'bg-amber-100',
    blue: 'bg-blue-100',
    purple: 'bg-purple-100',
  };

  const iconColorClasses = {
    green: 'text-green-600',
    yellow: 'text-amber-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border-2 p-4 sm:p-5 transition-all ${colorClasses[color]} ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${iconBgClasses[color]} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColorClasses[color]}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="mt-3 sm:mt-4">
        <p className="text-xs sm:text-sm text-gray-600 font-medium">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
      </div>
    </div>
  );
};

// Quick Action Card Component
const QuickActionCard = ({ icon: Icon, title, description, action, color, badge, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-600 group-hover:bg-blue-700',
    green: 'bg-green-600 group-hover:bg-green-700',
    purple: 'bg-purple-600 group-hover:bg-purple-700',
    orange: 'bg-orange-600 group-hover:bg-orange-700',
    indigo: 'bg-indigo-600 group-hover:bg-indigo-700',
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:border-gray-300 hover:shadow-md cursor-pointer transition-all"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center flex-shrink-0 transition-colors`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h3>
            {badge && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                badge.type === 'success' ? 'bg-green-100 text-green-700' :
                badge.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                badge.type === 'info' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {badge.text}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" />
      </div>
      {action && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs sm:text-sm font-medium text-blue-600 group-hover:text-blue-700">{action}</span>
        </div>
      )}
    </div>
  );
};

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange, size = 'default' }) => {
  const sizeClasses = {
    small: { container: 'h-5 w-9', dot: 'h-3 w-3', translate: 'translate-x-5' },
    default: { container: 'h-6 w-11', dot: 'h-4 w-4', translate: 'translate-x-6' },
  };

  const { container, dot, translate } = sizeClasses[size];

  return (
    <button
      onClick={onChange}
      className={`relative inline-flex ${container} items-center rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block ${dot} transform rounded-full bg-white transition-transform shadow-sm ${
          enabled ? translate : 'translate-x-1'
        }`}
      />
    </button>
  );
};

// Preference Item Component
const PreferenceItem = ({ icon: Icon, title, description, enabled, onChange, disabled }) => (
  <div className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border ${
    disabled ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200 hover:border-gray-300'
  } transition-colors`}>
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        enabled ? 'bg-blue-100' : 'bg-gray-100'
      }`}>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${enabled ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-gray-900 text-sm sm:text-base">{title}</p>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{description}</p>
      </div>
    </div>
    <ToggleSwitch enabled={enabled} onChange={disabled ? undefined : onChange} size="default" />
  </div>
);

// Collapsible Section Component
const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h2>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

const AffiliateSettings = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch affiliate data
  const { data: affiliateData, isLoading } = useQuery({
    queryKey: ['affiliate-settings'],
    queryFn: async () => {
      const response = await api.get('/affiliates/me');
      return response.data.data;
    },
  });

  // Fetch dashboard stats for trends
  const { data: dashboardStats } = useQuery({
    queryKey: ['affiliate-dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/affiliates/dashboard/stats');
      return response.data.data;
    },
  });

  // Fetch preferences from backend
  const { data: preferences } = useQuery({
    queryKey: ['affiliate-preferences'],
    queryFn: async () => {
      const response = await api.get('/affiliates/preferences');
      return response.data.data;
    },
  });

  // Preference states with backend sync
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showEarnings, setShowEarnings] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState(true);
  const [promotionalEmails, setPromotionalEmails] = useState(false);

  // Sync local state with backend preferences
  useEffect(() => {
    if (preferences) {
      setSoundEnabled(preferences.soundEnabled ?? true);
      setEmailNotifications(preferences.emailNotifications ?? true);
      setShowEarnings(preferences.showEarnings ?? true);
      setWeeklyReports(preferences.weeklyReports ?? true);
      setMonthlyReports(preferences.monthlyReports ?? true);
      setPromotionalEmails(preferences.promotionalEmails ?? false);
      // Sync sound with global sound utility
      toggleSound(preferences.soundEnabled ?? true);
    } else {
      // Fallback to localStorage for initial load
      setSoundEnabled(getSoundEnabled());
    }
  }, [preferences]);

  // Mutation to update preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates) => {
      const response = await api.put('/affiliates/preferences', updates);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-preferences'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update preferences');
    },
  });

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    toggleSound(newValue);
    if (newValue) {
      setTimeout(() => playClick(), 50);
    }
    updatePreferencesMutation.mutate({ soundEnabled: newValue });
    toast.success(newValue ? 'Sound notifications enabled' : 'Sound notifications disabled');
  };

  const handleEmailToggle = () => {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);
    updatePreferencesMutation.mutate({ emailNotifications: newValue });
    toast.success(newValue ? 'Email notifications enabled' : 'Email notifications disabled');
  };

  const handleEarningsToggle = () => {
    const newValue = !showEarnings;
    setShowEarnings(newValue);
    updatePreferencesMutation.mutate({ showEarnings: newValue });
    toast.success(newValue ? 'Earnings visible' : 'Earnings hidden');
  };

  const handleWeeklyReportsToggle = () => {
    const newValue = !weeklyReports;
    setWeeklyReports(newValue);
    updatePreferencesMutation.mutate({ weeklyReports: newValue });
    toast.success(newValue ? 'Weekly reports enabled' : 'Weekly reports disabled');
  };

  const handleMonthlyReportsToggle = () => {
    const newValue = !monthlyReports;
    setMonthlyReports(newValue);
    updatePreferencesMutation.mutate({ monthlyReports: newValue });
    toast.success(newValue ? 'Monthly reports enabled' : 'Monthly reports disabled');
  };

  const handlePromotionalToggle = () => {
    const newValue = !promotionalEmails;
    setPromotionalEmails(newValue);
    updatePreferencesMutation.mutate({ promotionalEmails: newValue });
    toast.success(newValue ? 'Promotional emails enabled' : 'Promotional emails disabled');
  };

  // Copy affiliate code
  const copyCode = () => {
    if (affiliateData?.code) {
      navigator.clipboard.writeText(affiliateData.code);
      setCodeCopied(true);
      toast.success('Affiliate code copied!');
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // Copy affiliate link
  const copyLink = () => {
    if (affiliateData?.code) {
      const link = `${window.location.origin}?ref=${affiliateData.code}`;
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success('Affiliate link copied!');
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Get KYC status info
  const getKycStatus = useMemo(() => {
    const status = affiliateData?.kyc?.status || 'pending';
    const statusInfo = {
      approved: { badge: { type: 'success', text: 'Verified' }, color: 'green' },
      pending: { badge: { type: 'warning', text: 'Pending' }, color: 'yellow' },
      rejected: { badge: { type: 'error', text: 'Rejected' }, color: 'red' },
    };
    return statusInfo[status] || statusInfo.pending;
  }, [affiliateData?.kyc?.status]);

  // Get account status info
  const getAccountStatus = useMemo(() => {
    const status = affiliateData?.status || 'pending';
    const statusInfo = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: BadgeCheck },
      pending: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-800', icon: Clock },
      suspended: { label: 'Suspended', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    };
    return statusInfo[status] || statusInfo.pending;
  }, [affiliateData?.status]);

  // Calculate conversion rate
  const conversionRate = useMemo(() => {
    if (!affiliateData?.totalClicks || affiliateData.totalClicks === 0) return '0.00';
    return ((affiliateData.totalConversions / affiliateData.totalClicks) * 100).toFixed(2);
  }, [affiliateData?.totalClicks, affiliateData?.totalConversions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const StatusIcon = getAccountStatus.icon;

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              Account Settings
            </h1>
            <p className="text-gray-300 text-sm mt-1">Manage your affiliate account and preferences</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getAccountStatus.color}`}>
              <StatusIcon className="w-4 h-4" />
              {getAccountStatus.label}
            </span>
          </div>
        </div>

        {/* Affiliate Code Card */}
        <div className="mt-4 sm:mt-6 bg-white/10 backdrop-blur rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-gray-300 text-xs sm:text-sm">Your Affiliate Code</p>
              <p className="text-xl sm:text-2xl font-mono font-bold mt-1">{affiliateData?.code || 'N/A'}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
              >
                {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{codeCopied ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <button
                onClick={copyLink}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-sm"
              >
                {linkCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{linkCopied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          icon={DollarSign}
          label="Total Earnings"
          value={showEarnings ? `₹${affiliateData?.totalEarnings?.toFixed(0) || '0'}` : '₹•••••'}
          subValue={showEarnings ? `This month: ₹${dashboardStats?.monthlyStats?.earnings?.toFixed(0) || '0'}` : null}
          trend={dashboardStats?.earningsChange > 0 ? 'up' : dashboardStats?.earningsChange < 0 ? 'down' : null}
          trendValue={dashboardStats?.earningsChange ? `${Math.abs(dashboardStats.earningsChange)}%` : null}
          color="green"
        />
        <StatsCard
          icon={Clock}
          label="Pending"
          value={showEarnings ? `₹${affiliateData?.pendingEarnings?.toFixed(0) || '0'}` : '₹•••••'}
          subValue="Awaiting approval"
          color="yellow"
        />
        <StatsCard
          icon={Wallet}
          label="Paid Out"
          value={showEarnings ? `₹${affiliateData?.paidEarnings?.toFixed(0) || '0'}` : '₹•••••'}
          subValue="All time"
          color="blue"
        />
        <StatsCard
          icon={Percent}
          label="Commission Rate"
          value={`${affiliateData?.commissionPercentage || 5}%`}
          subValue="Base rate"
          color="purple"
        />
      </div>

      {/* Performance Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-gray-600" />
          Performance Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <MousePointerClick className="w-6 h-6 text-blue-600 mx-auto" />
            <p className="text-2xl font-bold text-gray-900 mt-2">{affiliateData?.totalClicks || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Total Clicks</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <ShoppingCart className="w-6 h-6 text-green-600 mx-auto" />
            <p className="text-2xl font-bold text-gray-900 mt-2">{affiliateData?.totalConversions || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Conversions</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <TrendingUp className="w-6 h-6 text-purple-600 mx-auto" />
            <p className="text-2xl font-bold text-gray-900 mt-2">{conversionRate}%</p>
            <p className="text-xs text-gray-500 mt-1">Conv. Rate</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <Calendar className="w-6 h-6 text-orange-600 mx-auto" />
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {affiliateData?.createdAt ? new Date(affiliateData.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Member Since</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <QuickActionCard
            icon={Shield}
            title="KYC & Bank Details"
            description="Complete verification and add bank account for payouts"
            action="Manage KYC"
            color="blue"
            badge={getKycStatus.badge}
            onClick={() => navigate('/affiliate-dashboard/kyc')}
          />
          <QuickActionCard
            icon={CreditCard}
            title="Commission History"
            description="View earnings, pending payouts, and transaction history"
            action="View Commissions"
            color="green"
            onClick={() => navigate('/affiliate-dashboard/commissions')}
          />
          <QuickActionCard
            icon={Link2}
            title="Manage Links"
            description="Create and manage your affiliate product links"
            action="View Links"
            color="purple"
            onClick={() => navigate('/affiliate-dashboard/links')}
          />
          <QuickActionCard
            icon={FileText}
            title="Performance Reports"
            description="Detailed analytics and performance insights"
            action="View Reports"
            color="orange"
            onClick={() => navigate('/affiliate-dashboard')}
          />
        </div>
      </div>

      {/* Preferences Section */}
      <CollapsibleSection title="Preferences" icon={Settings} defaultOpen={true}>
        <div className="space-y-3 mt-4">
          {/* Display Preferences */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Display</p>
            <div className="space-y-2">
              <PreferenceItem
                icon={soundEnabled ? Volume2 : VolumeX}
                title="Sound Notifications"
                description="Play sounds for alerts and actions"
                enabled={soundEnabled}
                onChange={handleSoundToggle}
              />
              <PreferenceItem
                icon={showEarnings ? Eye : EyeOff}
                title="Show Earnings"
                description="Display earnings amounts on dashboard"
                enabled={showEarnings}
                onChange={handleEarningsToggle}
              />
            </div>
          </div>

          {/* Communication Preferences */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Communication</p>
            <div className="space-y-2">
              <PreferenceItem
                icon={emailNotifications ? Bell : BellOff}
                title="Email Notifications"
                description="Commission and payout updates via email"
                enabled={emailNotifications}
                onChange={handleEmailToggle}
              />
              <PreferenceItem
                icon={weeklyReports ? BarChart3 : BarChart3}
                title="Weekly Reports"
                description="Receive weekly performance summary"
                enabled={weeklyReports}
                onChange={handleWeeklyReportsToggle}
              />
              <PreferenceItem
                icon={monthlyReports ? BarChart3 : BarChart3}
                title="Monthly Reports"
                description="Receive monthly earnings report"
                enabled={monthlyReports}
                onChange={handleMonthlyReportsToggle}
              />
              <PreferenceItem
                icon={promotionalEmails ? Megaphone : Megaphone}
                title="Promotional Emails"
                description="New campaigns and promotional offers"
                enabled={promotionalEmails}
                onChange={handlePromotionalToggle}
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Account Details Section */}
      <CollapsibleSection title="Account Details" icon={Building2} defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Affiliate Code</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-mono text-lg font-bold text-blue-600">{affiliateData?.code || 'N/A'}</span>
              <button onClick={copyCode} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                {codeCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Account Status</p>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getAccountStatus.color}`}>
                <StatusIcon className="w-4 h-4" />
                {getAccountStatus.label}
              </span>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Commission Rate</p>
            <p className="text-lg font-bold text-gray-900 mt-2">{affiliateData?.commissionPercentage || 5}%</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 uppercase tracking-wide">KYC Status</p>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                affiliateData?.kyc?.status === 'approved' ? 'bg-green-100 text-green-800' :
                affiliateData?.kyc?.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {(affiliateData?.kyc?.status || 'pending').charAt(0).toUpperCase() + (affiliateData?.kyc?.status || 'pending').slice(1)}
              </span>
            </div>
          </div>
          {affiliateData?.razorpay?.accountStatus && affiliateData.razorpay.accountStatus !== 'not_connected' && (
            <div className="p-4 bg-gray-50 rounded-xl sm:col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Razorpay Account</p>
              <div className="flex items-center justify-between mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                  affiliateData.razorpay.accountStatus === 'activated' ? 'bg-green-100 text-green-800' :
                  affiliateData.razorpay.accountStatus === 'suspended' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {affiliateData.razorpay.accountStatus.charAt(0).toUpperCase() + affiliateData.razorpay.accountStatus.slice(1)}
                </span>
                <span className="text-sm text-gray-500">
                  Settlement: {affiliateData.razorpay.settlementSchedule || 'Weekly'}
                </span>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Help Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Need Help?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Have questions about your affiliate account or commissions?
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/affiliate-dashboard/support')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <Info className="w-4 h-4" />
                Contact Support
              </button>
              <button
                onClick={() => navigate('/page/faq')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View FAQs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 sm:p-6 text-white">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">Pro Tips for Affiliates</h3>
            <ul className="mt-3 space-y-2 text-sm text-purple-100">
              <li className="flex items-start gap-2">
                <Award className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Complete KYC verification to unlock higher commission rates</span>
              </li>
              <li className="flex items-start gap-2">
                <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Share product-specific links for better conversion tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Monitor your dashboard regularly to identify top-performing products</span>
              </li>
              <li className="flex items-start gap-2">
                <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Commissions are processed weekly once they reach the minimum threshold</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateSettings;
