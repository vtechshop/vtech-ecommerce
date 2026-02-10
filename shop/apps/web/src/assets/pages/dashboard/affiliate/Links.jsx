// FILE: apps/web/src/pages/dashboard/affiliate/Links.jsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import {
  Copy, Check, AlertCircle, Home, Search, ShoppingBag, Tag, Link2,
  ExternalLink, Share2, QrCode, MousePointerClick, TrendingUp,
  DollarSign, ChevronRight, Lightbulb, Globe, Image, FileText,
  Facebook, Twitter, MessageCircle, Mail, ChevronDown, ChevronUp,
  Sparkles, Target, Clock, Zap, RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/common/ToastContainer';

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, subValue, color }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-50 text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-50 text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-50 text-purple-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', badge: 'bg-orange-50 text-orange-600' },
  };
  const classes = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${classes.bg}`}>
          <Icon className={`w-5 h-5 ${classes.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
        {subValue && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${classes.badge}`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};

// Link Card Component
const LinkCard = ({ icon: Icon, title, description, url, onCopy, copied, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <Button
          variant={copied ? 'success' : 'outline'}
          size="sm"
          onClick={onCopy}
          className="flex-shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Copy Link</span>
            </>
          )}
        </Button>
      </div>
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <code className="text-sm text-gray-700 break-all">{url}</code>
      </div>
    </div>
  );
};

// Social Share Button
const SocialShareButton = ({ icon: Icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:shadow-sm ${color}`}
    title={`Share on ${label}`}
  >
    <Icon className="w-4 h-4" />
    <span className="text-sm font-medium hidden sm:inline">{label}</span>
  </button>
);

const Links = () => {
  const [copiedLink, setCopiedLink] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [showLinkBuilder, setShowLinkBuilder] = useState(false);
  const toast = useToast();

  const { data: linksData, isLoading, error, refetch } = useQuery({
    queryKey: ['affiliate-links'],
    queryFn: async () => {
      const response = await api.get('/affiliates/links');
      return response.data.data;
    },
    staleTime: 10 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    retry: false,
  });

  // Fetch dashboard stats for quick overview
  const { data: statsData } = useQuery({
    queryKey: ['affiliate-dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/affiliates/dashboard/stats');
      return response.data.data;
    },
    retry: false,
  });

  // Generate custom product link
  const customProductLink = useMemo(() => {
    if (!customSlug.trim() || !linksData?.code) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/product/${customSlug.trim()}?affId=${linksData.code}`;
  }, [customSlug, linksData?.code]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show error only for non-404 errors
  if (error && error?.response?.status !== 404) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to load links</h2>
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

  // For 404 errors, show setup message and retry button
  if (error && error?.response?.status === 404) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
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

  const handleCopy = (url, key) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(key);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleSocialShare = (platform, url) => {
    const text = encodeURIComponent('Check out this amazing product!');
    const encodedUrl = encodeURIComponent(url);

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`,
      whatsapp: `https://wa.me/?text=${text}%20${encodedUrl}`,
      email: `mailto:?subject=Check this out&body=${text}%20${encodedUrl}`,
    };

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  const stats = statsData || {};
  const linkIcons = {
    homepage: Home,
    search: Search,
    product: ShoppingBag,
    category: Tag,
  };
  const linkColors = {
    homepage: 'blue',
    search: 'purple',
    product: 'green',
    category: 'orange',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Affiliate Links</h1>
          <p className="text-gray-600 text-sm mt-1">Generate and share your affiliate links</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link
            to="/affiliate-dashboard/all-product-links"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            All Product Links
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          icon={MousePointerClick}
          label="Total Clicks"
          value={stats.totalClicks || 0}
          color="blue"
        />
        <StatsCard
          icon={TrendingUp}
          label="Conversions"
          value={stats.totalConversions || 0}
          subValue={stats.conversionRate ? `${stats.conversionRate}%` : null}
          color="green"
        />
        <StatsCard
          icon={DollarSign}
          label="Total Earnings"
          value={`₹${(stats.totalEarnings || 0).toLocaleString()}`}
          color="purple"
        />
        <StatsCard
          icon={Clock}
          label="Pending"
          value={`₹${(stats.pendingCommissions || 0).toLocaleString()}`}
          color="orange"
        />
      </div>

      {/* Affiliate Code Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">Your Unique Affiliate Code</p>
            <div className="flex items-center gap-3">
              <code className="text-2xl sm:text-3xl font-bold tracking-wider">{linksData?.code}</code>
              <button
                onClick={() => handleCopy(linksData?.code, 'code')}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Copy code"
              >
                {copiedLink === 'code' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-blue-100 text-sm mt-2">
              Share this code with your audience to earn {linksData?.commissionPercentage || 5}% commission
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-3xl font-bold">{linksData?.commissionPercentage || 5}%</p>
              <p className="text-blue-100 text-sm">Commission Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Link Builder */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowLinkBuilder(!showLinkBuilder)}
          className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Custom Link Builder</h3>
              <p className="text-xs text-gray-500">Create affiliate links for specific products</p>
            </div>
          </div>
          {showLinkBuilder ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showLinkBuilder && (
          <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Slug</label>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="e.g., premium-wireless-headphones"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="sm:self-end">
                <Button
                  onClick={() => customProductLink && handleCopy(customProductLink, 'custom')}
                  disabled={!customProductLink}
                  className="w-full sm:w-auto"
                >
                  {copiedLink === 'custom' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </div>

            {customProductLink && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Generated Link:</p>
                <code className="text-sm text-gray-700 break-all">{customProductLink}</code>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-3">
              Tip: Find product slugs on the <Link to="/affiliate-dashboard/all-product-links" className="text-blue-600 hover:underline">All Product Links</Link> page
            </p>
          </div>
        )}
      </div>

      {/* Pre-built Links */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Share Links</h2>
        <div className="grid gap-4">
          {linksData?.links?.map((link, index) => (
            <LinkCard
              key={index}
              icon={linkIcons[link.type] || Link2}
              title={link.type.charAt(0).toUpperCase() + link.type.slice(1)}
              description={link.description}
              url={link.url}
              onCopy={() => handleCopy(link.url, index)}
              copied={copiedLink === index}
              color={linkColors[link.type] || 'blue'}
            />
          ))}
        </div>
      </div>

      {/* Social Sharing */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
            <Share2 className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Share on Social Media</h3>
            <p className="text-xs text-gray-500">Quickly share your homepage link</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SocialShareButton
            icon={Facebook}
            label="Facebook"
            color="bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20 hover:bg-[#1877F2]/20"
            onClick={() => handleSocialShare('facebook', linksData?.links?.[0]?.url)}
          />
          <SocialShareButton
            icon={Twitter}
            label="Twitter"
            color="bg-[#1DA1F2]/10 text-[#1DA1F2] border-[#1DA1F2]/20 hover:bg-[#1DA1F2]/20"
            onClick={() => handleSocialShare('twitter', linksData?.links?.[0]?.url)}
          />
          <SocialShareButton
            icon={MessageCircle}
            label="WhatsApp"
            color="bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20 hover:bg-[#25D366]/20"
            onClick={() => handleSocialShare('whatsapp', linksData?.links?.[0]?.url)}
          />
          <SocialShareButton
            icon={Mail}
            label="Email"
            color="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
            onClick={() => handleSocialShare('email', linksData?.links?.[0]?.url)}
          />
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200 overflow-hidden">
        <button
          onClick={() => setShowTips(!showTips)}
          className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-amber-100/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Tips to Maximize Earnings</h3>
              <p className="text-xs text-gray-600">Learn how to get more conversions</p>
            </div>
          </div>
          {showTips ? <ChevronUp className="w-5 h-5 text-amber-600" /> : <ChevronDown className="w-5 h-5 text-amber-600" />}
        </button>

        {showTips && (
          <div className="p-4 sm:p-5 border-t border-amber-200 bg-white/50">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">Share on Your Website</h4>
                  <p className="text-xs text-gray-600 mt-1">Add affiliate links to your blog posts, reviews, and product comparisons</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">Target Your Audience</h4>
                  <p className="text-xs text-gray-600 mt-1">Share products relevant to your followers for higher conversion rates</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Image className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">Use Product Images</h4>
                  <p className="text-xs text-gray-600 mt-1">Visual content attracts more clicks than plain text links</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">Create Urgency</h4>
                  <p className="text-xs text-gray-600 mt-1">Highlight limited deals and discounts to encourage quick purchases</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-amber-200">
              <h4 className="font-medium text-gray-900 text-sm mb-2">Cookie Duration</h4>
              <p className="text-xs text-gray-600">
                When someone clicks your affiliate link, a cookie is stored for <strong>30 days</strong>.
                You'll earn a commission on any purchase they make within this period, even if they don't buy immediately!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/affiliate-dashboard/all-product-links"
          className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <ShoppingBag className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Browse All Products</h3>
            <p className="text-xs text-gray-500">Generate links for specific products</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </Link>

        <Link
          to="/affiliate-dashboard/commissions"
          className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">View Commissions</h3>
            <p className="text-xs text-gray-500">Track your earnings and payouts</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
        </Link>
      </div>
    </div>
  );
};

export default Links;
