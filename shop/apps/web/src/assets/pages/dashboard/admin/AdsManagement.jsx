import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Eye, Edit, Trash2, X, CheckCircle, RefreshCw, Search,
  TrendingUp, TrendingDown, DollarSign, MousePointer, BarChart3,
  Target, Settings, Wallet, Download, Play, Pause, Filter,
  ChevronDown, ChevronUp, Megaphone, Layers, Users, Zap, Globe
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../../utils/api';
import CustomSelect from '../../../components/common/CustomSelect';
import { useToast } from '../../../components/common/ToastContainer';

// ============ CONSTANTS ============
const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'wallets', label: 'Wallets', icon: Wallet },
];

const PERIODS = [
  { value: '7days', label: '7 Days' },
  { value: '30days', label: '30 Days' },
  { value: '90days', label: '90 Days' },
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-purple-100 text-purple-800',
  budget_exhausted: 'bg-red-100 text-red-800',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const formatNum = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return (n || 0).toLocaleString();
};

const formatCurrency = (n) => '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const placementLabel = (p) => p ? p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '-';

// ============ TREND BADGE ============
const TrendBadge = ({ current, previous }) => {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  const isUp = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
};

// ============ KPI CARD ============
const KPICard = ({ title, value, icon: Icon, color = 'blue', trend, subtitle }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</span>
      <div className={`p-2 rounded-lg bg-${color}-50`}>
        <Icon className={`w-4 h-4 text-${color}-600`} />
      </div>
    </div>
    <div className="flex items-end gap-2">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {trend}
    </div>
    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

// ============ MAIN COMPONENT ============
const AdsManagement = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('30days');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [selectedPricing, setSelectedPricing] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: '', type: 'SponsoredProduct', pricing: 'CPC', bid: '', dailyBudget: '',
    totalBudget: '', startAt: '', endAt: '', status: 'draft', targetKeywords: '',
    vendorId: '', bannerImage: '', placement: 'homepage_banner', position: 'top',
    bannerSize: 'hero', dimensions: { width: '', height: '' },
  });
  const [pricingForm, setPricingForm] = useState({
    placement: '', displayName: '', description: '', pricingType: 'CPC',
    minBid: '', maxBid: '', recommendedBid: '', floorPrice: '', dailyBudgetMin: '',
    auctionType: 'second_price', requiresApproval: true, status: 'active',
  });

  // ============ QUERIES ============
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['admin-ads-analytics', period],
    queryFn: async () => {
      const res = await api.get(`/admin/ads/analytics?period=${period}`);
      return res.data.data;
    },
    enabled: activeTab === 'overview',
  });

  const { data: adsData, isLoading: adsLoading, refetch: refetchAds } = useQuery({
    queryKey: ['admin-ads', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}&limit=100` : '?limit=100';
      const res = await api.get(`/admin/ads/campaigns${params}`);
      return res.data;
    },
    enabled: activeTab === 'campaigns',
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: async () => {
      const res = await api.get('/admin/vendors');
      return res.data.data;
    },
    enabled: modalOpen,
  });

  const { data: pricingData, refetch: refetchPricing } = useQuery({
    queryKey: ['admin-ads-pricing'],
    queryFn: async () => {
      const res = await api.get('/admin/ads/pricing-settings');
      return res.data.data;
    },
    enabled: activeTab === 'pricing',
  });

  const { data: walletsData, isLoading: walletsLoading } = useQuery({
    queryKey: ['admin-ads-wallets'],
    queryFn: async () => {
      const res = await api.get('/admin/ads/wallets');
      return res.data;
    },
    enabled: activeTab === 'wallets',
  });

  // ============ MUTATIONS ============
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (selectedAd) {
        return (await api.put(`/admin/ads/campaigns/${selectedAd._id}`, data)).data;
      }
      return (await api.post('/admin/ads/campaigns', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success(selectedAd ? 'Campaign updated' : 'Campaign created');
      setModalOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => (await api.delete(`/admin/ads/campaigns/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success('Campaign deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to delete'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => (await api.put(`/admin/ads/campaigns/${id}/status`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success('Status updated');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to update'),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }) => {
      await Promise.all(ids.map(id => api.put(`/admin/ads/campaigns/${id}/status`, { status })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      setSelectedIds([]);
      toast.success('Bulk update complete');
    },
    onError: () => toast.error('Some updates failed'),
  });

  const pricingMutation = useMutation({
    mutationFn: async (data) => (await api.post('/admin/ads/pricing-settings', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads-pricing'] });
      toast.success('Pricing settings saved');
      setPricingModalOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to save pricing'),
  });

  const initPricingMutation = useMutation({
    mutationFn: async () => (await api.post('/admin/ads/pricing-settings/initialize')).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads-pricing'] });
      toast.success(data.message || 'Defaults initialized');
    },
    onError: () => toast.error('Failed to initialize defaults'),
  });

  // ============ HELPERS ============
  const resetForm = () => {
    setFormData({
      name: '', type: 'SponsoredProduct', pricing: 'CPC', bid: '', dailyBudget: '',
      totalBudget: '', startAt: '', endAt: '', status: 'draft', targetKeywords: '',
      vendorId: '', bannerImage: '', placement: 'homepage_banner', position: 'top',
      bannerSize: 'hero', dimensions: { width: '', height: '' },
    });
    setSelectedAd(null);
  };

  const handleEdit = (ad) => {
    setSelectedAd(ad);
    setFormData({
      name: ad.name || '', type: ad.type || 'SponsoredProduct', pricing: ad.pricing || 'CPC',
      bid: ad.bid || '', dailyBudget: ad.dailyBudget || '', totalBudget: ad.totalBudget || '',
      startAt: ad.startAt ? new Date(ad.startAt).toISOString().slice(0, 16) : '',
      endAt: ad.endAt ? new Date(ad.endAt).toISOString().slice(0, 16) : '',
      status: ad.status || 'draft',
      targetKeywords: ad.targeting?.keywords?.map(k => k.keyword).join(', ') || '',
      vendorId: ad.vendorId?._id || ad.vendorId || '',
      bannerImage: ad.bannerImage || '', placement: ad.placement || 'homepage_banner',
      position: ad.position || 'top', bannerSize: ad.bannerSize || 'hero',
      dimensions: ad.dimensions || { width: '', height: '' },
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const keywords = formData.targetKeywords.split(',').map(k => k.trim()).filter(Boolean);
    saveMutation.mutate({
      name: formData.name, type: formData.type, pricing: formData.pricing,
      bid: parseFloat(formData.bid), dailyBudget: parseFloat(formData.dailyBudget),
      totalBudget: formData.totalBudget ? parseFloat(formData.totalBudget) : undefined,
      startAt: formData.startAt, endAt: formData.endAt || undefined, status: formData.status,
      vendorId: formData.vendorId, bannerImage: formData.bannerImage || undefined,
      placement: formData.placement, position: formData.position, bannerSize: formData.bannerSize,
      dimensions: formData.bannerSize === 'custom' && formData.dimensions.width && formData.dimensions.height
        ? { width: parseInt(formData.dimensions.width), height: parseInt(formData.dimensions.height) } : undefined,
      targeting: { keywords: keywords.map(k => ({ keyword: k, matchType: 'broad' })) },
    });
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'ads');
    try {
      const res = await api.post('/upload/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFormData({ ...formData, bannerImage: res.data.data.url });
      toast.success('Image uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingImage(false); }
  };

  const handleCSVExport = () => {
    const campaigns = filteredCampaigns;
    if (!campaigns?.length) return;
    const headers = ['Name', 'Type', 'Status', 'Placement', 'Pricing', 'Bid', 'Daily Budget', 'Impressions', 'Clicks', 'CTR%', 'Conversions', 'Spend', 'Revenue', 'Vendor'];
    const rows = campaigns.map(c => [
      c.name, c.type, c.status, c.placement, c.pricing, c.bid, c.dailyBudget,
      c.stats?.impressions || 0, c.stats?.clicks || 0,
      c.stats?.impressions > 0 ? ((c.stats.clicks / c.stats.impressions) * 100).toFixed(2) : 0,
      c.stats?.conversions || 0, c.stats?.spend || 0, c.stats?.revenue || 0,
      c.vendorId?.storeName || '-',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `campaigns-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Filter & sort campaigns
  const filteredCampaigns = useMemo(() => {
    let list = adsData?.data || [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.vendorId?.storeName?.toLowerCase().includes(q) ||
        c.placement?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField.includes('.')) {
        const parts = sortField.split('.');
        va = parts.reduce((o, k) => o?.[k], a);
        vb = parts.reduce((o, k) => o?.[k], b);
      }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
    });
    return list;
  }, [adsData, searchQuery, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    const allIds = filteredCampaigns.map(c => c._id);
    setSelectedIds(prev => prev.length === allIds.length ? [] : allIds);
  };

  const refetchAll = () => {
    refetchAnalytics();
    refetchAds();
    refetchPricing();
  };

  // ============ RENDER ============
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advertising Console</h1>
          <p className="text-gray-500 text-sm">Amazon-style campaign management & analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetchAll} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link to="/admin-dashboard/ads/approvals" className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
            <CheckCircle className="w-4 h-4" /> Approvals
          </Link>
          <button onClick={() => { resetForm(); setModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Plus className="w-4 h-4" /> Create Campaign
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============ TAB: OVERVIEW ============ */}
        {activeTab === 'overview' && (
          <div className="p-5 space-y-6">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${period === p.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {analyticsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
              </div>
            ) : analytics ? (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <KPICard title="Total Campaigns" value={analytics.overview.totalCampaigns} icon={Megaphone} color="blue" subtitle={`${analytics.overview.activeCampaigns} active`} />
                  <KPICard title="Total Spend" value={formatCurrency(analytics.overview.totalSpend)} icon={DollarSign} color="green" trend={<TrendBadge current={analytics.overview.totalSpend} previous={analytics.overview.prevSpend} />} />
                  <KPICard title="Impressions" value={formatNum(analytics.overview.totalImpressions)} icon={Eye} color="purple" trend={<TrendBadge current={analytics.overview.totalImpressions} previous={analytics.overview.prevImpressions} />} />
                  <KPICard title="Clicks" value={formatNum(analytics.overview.totalClicks)} icon={MousePointer} color="orange" trend={<TrendBadge current={analytics.overview.totalClicks} previous={analytics.overview.prevClicks} />} />
                  <KPICard title="CTR" value={analytics.overview.ctr + '%'} icon={Target} color="cyan" subtitle={`Avg CPC: ${formatCurrency(analytics.overview.avgCPC)}`} />
                  <KPICard title="Revenue" value={formatCurrency(analytics.overview.totalRevenue)} icon={TrendingUp} color="emerald" subtitle={`ROAS: ${analytics.overview.totalSpend > 0 ? (analytics.overview.totalRevenue / analytics.overview.totalSpend).toFixed(2) : '0'}x`} />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Time Series Chart */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Performance Trend</h3>
                    {analytics.timeSeries?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={analytics.timeSeries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Impressions" />
                          <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} name="Clicks" />
                          <Line type="monotone" dataKey="spend" stroke="#ef4444" strokeWidth={2} dot={false} name="Spend (₹)" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">No event data yet</div>
                    )}
                  </div>

                  {/* Status Breakdown + Type Pie */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Campaign Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Status Counts */}
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 font-medium uppercase">By Status</p>
                        {Object.entries(analytics.statusBreakdown || {}).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>
                            <span className="text-sm font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                      {/* Type Pie Chart */}
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase mb-2">By Type</p>
                        {Object.keys(analytics.typeBreakdown || {}).length > 0 ? (
                          <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                              <Pie
                                data={Object.entries(analytics.typeBreakdown).map(([type, d]) => ({ name: type, value: d.count }))}
                                cx="50%" cy="50%" innerRadius={35} outerRadius={65}
                                paddingAngle={3} dataKey="value"
                              >
                                {Object.keys(analytics.typeBreakdown).map((_, i) => (
                                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <div className="text-gray-400 text-sm text-center pt-8">No data</div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Top Campaigns + Placement + Vendor */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Top Campaigns by Spend */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Campaigns (Spend)</h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(analytics.topCampaigns || []).map((c, i) => (
                        <div key={c._id} className="flex items-center gap-2 text-sm">
                          <span className="w-5 text-xs text-gray-400 font-mono">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.vendorId?.storeName || '-'}</p>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{formatCurrency(c.stats?.spend)}</span>
                        </div>
                      ))}
                      {(!analytics.topCampaigns?.length) && <p className="text-gray-400 text-sm">No campaigns yet</p>}
                    </div>
                  </div>

                  {/* Placement Performance */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Placement Performance</h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(analytics.placementStats || []).map((p) => (
                        <div key={p._id} className="flex items-center gap-2 text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate text-xs">{placementLabel(p._id)}</p>
                            <p className="text-xs text-gray-500">{p.campaigns} campaigns</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold">{formatNum(p.clicks)} clicks</p>
                            <p className="text-xs text-gray-500">{formatCurrency(p.spend)}</p>
                          </div>
                        </div>
                      ))}
                      {(!analytics.placementStats?.length) && <p className="text-gray-400 text-sm">No data</p>}
                    </div>
                  </div>

                  {/* Vendor Leaderboard */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Vendor Ad Spend</h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(analytics.vendorStats || []).map((v, i) => (
                        <div key={v._id} className="flex items-center gap-2 text-sm">
                          <span className="w-5 text-xs text-gray-400 font-mono">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{v.storeName || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{v.campaigns} campaigns</p>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{formatCurrency(v.totalSpend)}</span>
                        </div>
                      ))}
                      {(!analytics.vendorStats?.length) && <p className="text-gray-400 text-sm">No vendors yet</p>}
                    </div>
                  </div>
                </div>

                {/* Wallet Summary Bar */}
                {analytics.walletOverview && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-900">Platform Wallets</span>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div><span className="text-gray-500">Active: </span><span className="font-semibold">{analytics.walletOverview.walletCount}</span></div>
                      <div><span className="text-gray-500">Total Balance: </span><span className="font-semibold text-green-700">{formatCurrency(analytics.walletOverview.totalBalance)}</span></div>
                      <div><span className="text-gray-500">Recharged: </span><span className="font-semibold">{formatCurrency(analytics.walletOverview.totalRecharged)}</span></div>
                      <div><span className="text-gray-500">Spent: </span><span className="font-semibold text-red-600">{formatCurrency(analytics.walletOverview.totalSpent)}</span></div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* ============ TAB: CAMPAIGNS ============ */}
        {activeTab === 'campaigns' && (
          <div className="p-5 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" placeholder="Search campaigns, vendors, placements..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <CustomSelect
                value={statusFilter} onChange={setStatusFilter}
                options={[
                  { value: '', label: 'All Status' }, { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' },
                  { value: 'approved', label: 'Approved' }, { value: 'pending_approval', label: 'Pending' },
                  { value: 'completed', label: 'Completed' }, { value: 'budget_exhausted', label: 'Budget Exhausted' },
                ]}
                placeholder="All Status" className="w-44"
              />
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                  <span className="text-sm text-blue-700 font-medium">{selectedIds.length} selected</span>
                  <button onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'active' })} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Activate</button>
                  <button onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, status: 'paused' })} className="text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700">Pause</button>
                </div>
              )}
              <button onClick={handleCSVExport} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" /> CSV
              </button>
            </div>

            {/* Table */}
            {adsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No campaigns found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2.5 text-left">
                        <input type="checkbox" checked={selectedIds.length === filteredCampaigns.length && filteredCampaigns.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('name')}>
                        <span className="flex items-center gap-1">Campaign <SortIcon field="name" /></span>
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Placement</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('bid')}>
                        <span className="flex items-center gap-1">Bid <SortIcon field="bid" /></span>
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('dailyBudget')}>
                        <span className="flex items-center gap-1">Budget <SortIcon field="dailyBudget" /></span>
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('stats.impressions')}>
                        <span className="flex items-center gap-1">Impr. <SortIcon field="stats.impressions" /></span>
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('stats.clicks')}>
                        <span className="flex items-center gap-1">Clicks <SortIcon field="stats.clicks" /></span>
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">CTR</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('stats.spend')}>
                        <span className="flex items-center gap-1">Spend <SortIcon field="stats.spend" /></span>
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCampaigns.map(ad => {
                      const ctr = ad.stats?.impressions > 0 ? ((ad.stats.clicks / ad.stats.impressions) * 100).toFixed(2) : '0.00';
                      return (
                        <tr key={ad._id} className={`hover:bg-gray-50 ${selectedIds.includes(ad._id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-3 py-2.5">
                            <input type="checkbox" checked={selectedIds.includes(ad._id)} onChange={() => toggleSelect(ad._id)} className="rounded border-gray-300" />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-gray-900 truncate max-w-[180px]">{ad.name}</div>
                            <div className="text-xs text-gray-500">{ad.pricing}</div>
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 text-xs">{ad.vendorId?.storeName || '-'}</td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{ad.type}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-600">{placementLabel(ad.placement)}</td>
                          <td className="px-3 py-2.5 font-medium">{formatCurrency(ad.bid)}</td>
                          <td className="px-3 py-2.5 text-gray-600">{formatCurrency(ad.dailyBudget)}/day</td>
                          <td className="px-3 py-2.5 font-medium">{formatNum(ad.stats?.impressions)}</td>
                          <td className="px-3 py-2.5 font-medium">{formatNum(ad.stats?.clicks)}</td>
                          <td className="px-3 py-2.5 text-gray-600">{ctr}%</td>
                          <td className="px-3 py-2.5 font-semibold">{formatCurrency(ad.stats?.spend)}</td>
                          <td className="px-3 py-2.5">
                            <select
                              value={ad.status}
                              onChange={e => statusMutation.mutate({ id: ad._id, status: e.target.value })}
                              className={`text-xs px-2 py-1 rounded-full font-medium cursor-pointer ${STATUS_COLORS[ad.status] || 'bg-gray-100 text-gray-700'}`}
                            >
                              <option value="draft">Draft</option>
                              <option value="active">Active</option>
                              <option value="paused">Paused</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => { setSelectedAd(ad); setViewModalOpen(true); }} className="text-blue-600 hover:text-blue-700" title="View">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleEdit(ad)} className="text-gray-500 hover:text-gray-700" title="Edit">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => { if (confirm('Delete this campaign?')) deleteMutation.mutate(ad._id); }} className="text-red-500 hover:text-red-700" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============ TAB: PRICING ============ */}
        {activeTab === 'pricing' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Placement Pricing Settings</h3>
                <p className="text-sm text-gray-500">Configure bid ranges, floor prices, and auction rules per placement</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => initPricingMutation.mutate()}
                  disabled={initPricingMutation.isPending}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Zap className="w-4 h-4 inline mr-1" />
                  {initPricingMutation.isPending ? 'Initializing...' : 'Init Defaults'}
                </button>
                <button
                  onClick={() => {
                    setSelectedPricing(null);
                    setPricingForm({ placement: '', displayName: '', description: '', pricingType: 'CPC', minBid: '', maxBid: '', recommendedBid: '', floorPrice: '', dailyBudgetMin: '', auctionType: 'second_price', requiresApproval: true, status: 'active' });
                    setPricingModalOpen(true);
                  }}
                  className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4 inline mr-1" /> Add Placement
                </button>
              </div>
            </div>

            {(pricingData || []).length === 0 ? (
              <div className="text-center py-12 text-gray-500">No pricing settings configured. Click "Init Defaults" to get started.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Placement</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Min Bid</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Max Bid</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Recommended</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Floor</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Min Budget/day</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Auction</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pricingData.map(p => (
                      <tr key={p._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-900">{p.displayName}</div>
                          <div className="text-xs text-gray-500">{p.placement}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.pricingType === 'CPC' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{p.pricingType}</span>
                        </td>
                        <td className="px-4 py-2.5">{formatCurrency(p.minBid)}</td>
                        <td className="px-4 py-2.5">{formatCurrency(p.maxBid)}</td>
                        <td className="px-4 py-2.5 font-medium text-green-700">{formatCurrency(p.recommendedBid)}</td>
                        <td className="px-4 py-2.5">{formatCurrency(p.floorPrice)}</td>
                        <td className="px-4 py-2.5">{formatCurrency(p.dailyBudgetMin)}</td>
                        <td className="px-4 py-2.5 text-xs">{p.auctionType === 'second_price' ? '2nd Price' : '1st Price'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => {
                              setSelectedPricing(p);
                              setPricingForm({
                                placement: p.placement, displayName: p.displayName, description: p.description || '',
                                pricingType: p.pricingType, minBid: p.minBid, maxBid: p.maxBid,
                                recommendedBid: p.recommendedBid, floorPrice: p.floorPrice,
                                dailyBudgetMin: p.dailyBudgetMin, auctionType: p.auctionType || 'second_price',
                                requiresApproval: p.requiresApproval !== false, status: p.status || 'active',
                              });
                              setPricingModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============ TAB: WALLETS ============ */}
        {activeTab === 'wallets' && (
          <div className="p-5 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Vendor Ad Wallets</h3>
            {walletsLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
              </div>
            ) : (walletsData?.data || []).length === 0 ? (
              <div className="text-center py-12 text-gray-500">No wallets found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Total Recharged</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Spend Rate</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {walletsData.data.map(w => {
                      const spendRate = w.totalRecharged > 0 ? ((w.totalSpent / w.totalRecharged) * 100).toFixed(1) : 0;
                      return (
                        <tr key={w._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-gray-900">{w.vendorId?.storeName || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{w.vendorId?.email || ''}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`font-semibold ${w.balance > 100 ? 'text-green-700' : w.balance > 0 ? 'text-yellow-700' : 'text-red-700'}`}>
                              {formatCurrency(w.balance)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">{formatCurrency(w.totalRecharged)}</td>
                          <td className="px-4 py-2.5">{formatCurrency(w.totalSpent)}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[80px]">
                                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(spendRate, 100)}%` }}></div>
                              </div>
                              <span className="text-xs text-gray-600">{spendRate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{w.transactions?.length || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============ CREATE/EDIT CAMPAIGN MODAL ============ */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-5 border-b border-gray-200 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{selectedAd ? 'Edit Campaign' : 'Create Campaign'}</h2>
                <button onClick={() => { setModalOpen(false); resetForm(); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                <select value={formData.vendorId} onChange={e => setFormData({ ...formData, vendorId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                  <option value="">Select vendor</option>
                  {(vendorsData || []).map(v => <option key={v._id} value={v._id}>{v.storeName} ({v.userId?.email})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="SponsoredProduct">Sponsored Product</option>
                    <option value="SponsoredBrand">Sponsored Brand</option>
                    <option value="Banner">Banner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pricing *</label>
                  <select value={formData.pricing} onChange={e => setFormData({ ...formData, pricing: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="CPC">CPC (Per Click)</option>
                    <option value="CPM">CPM (Per 1000 Views)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bid (₹) *</label>
                  <input type="number" step="0.01" value={formData.bid} onChange={e => setFormData({ ...formData, bid: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Budget (₹) *</label>
                  <input type="number" step="0.01" value={formData.dailyBudget} onChange={e => setFormData({ ...formData, dailyBudget: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget (₹)</label>
                  <input type="number" step="0.01" value={formData.totalBudget} onChange={e => setFormData({ ...formData, totalBudget: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input type="datetime-local" value={formData.startAt} onChange={e => setFormData({ ...formData, startAt: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="datetime-local" value={formData.endAt} onChange={e => setFormData({ ...formData, endAt: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placement *</label>
                <select value={formData.placement} onChange={e => setFormData({ ...formData, placement: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                  <optgroup label="Homepage">
                    <option value="homepage_banner">Homepage - Hero Banner</option>
                    <option value="homepage_sidebar_left">Homepage - Left Sidebar</option>
                    <option value="homepage_sidebar_right">Homepage - Right Sidebar</option>
                    <option value="homepage_top">Homepage - Top</option>
                    <option value="homepage_middle">Homepage - Middle</option>
                    <option value="homepage_bottom">Homepage - Bottom</option>
                  </optgroup>
                  <optgroup label="Product Pages">
                    <option value="product_sidebar">Product - Sidebar</option>
                    <option value="product_top">Product - Top Banner</option>
                    <option value="product_bottom">Product - Bottom Banner</option>
                    <option value="product_related">Product - Related Section</option>
                  </optgroup>
                  <optgroup label="Category Pages">
                    <option value="category_top_banner">Category - Top Banner</option>
                    <option value="category_sidebar">Category - Sidebar</option>
                    <option value="category_grid">Category - In Grid</option>
                  </optgroup>
                  <optgroup label="Search Results">
                    <option value="search_sponsored_products">Search - Sponsored Products</option>
                    <option value="search_top">Search - Top Banner</option>
                    <option value="search_sidebar">Search - Sidebar</option>
                  </optgroup>
                  <optgroup label="Blog">
                    <option value="blog_sidebar">Blog - Sidebar</option>
                    <option value="blog_top">Blog - Top</option>
                    <option value="blog_in_content">Blog - In Content</option>
                    <option value="blog_bottom">Blog - Bottom</option>
                  </optgroup>
                  <optgroup label="Cart & Checkout">
                    <option value="cart_sidebar">Cart - Sidebar</option>
                    <option value="cart_bottom">Cart - Bottom</option>
                    <option value="checkout_top">Checkout - Top</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="vendor_store">Vendor Store</option>
                    <option value="vendor_list">Vendor List</option>
                    <option value="about_us">About Us</option>
                    <option value="contact_us">Contact Us</option>
                    <option value="faq">FAQ</option>
                  </optgroup>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="top">Top</option>
                    <option value="right">Right</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banner Size</label>
                  <select value={formData.bannerSize} onChange={e => setFormData({ ...formData, bannerSize: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="hero">Hero (1920x600)</option>
                    <option value="leaderboard">Leaderboard (728x90)</option>
                    <option value="side-large">Large Sidebar (300x600)</option>
                    <option value="side-small">Small Sidebar (300x250)</option>
                    <option value="rectangle">Rectangle (300x250)</option>
                    <option value="skyscraper">Skyscraper (160x600)</option>
                    <option value="square">Square (250x250)</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              {formData.bannerSize === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width (px)</label>
                    <input type="number" value={formData.dimensions.width} onChange={e => setFormData({ ...formData, dimensions: { ...formData.dimensions, width: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (px)</label>
                    <input type="number" value={formData.dimensions.height} onChange={e => setFormData({ ...formData, dimensions: { ...formData.dimensions, height: e.target.value } })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image</label>
                {formData.bannerImage ? (
                  <div className="relative inline-block">
                    <img src={formData.bannerImage} alt="Banner" className="w-full max-w-md h-32 object-cover rounded-lg border" />
                    <button type="button" onClick={() => setFormData({ ...formData, bannerImage: '' })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e.target.files[0])} disabled={uploadingImage} className="hidden" id="bannerUpload" />
                    <label htmlFor="bannerUpload" className="cursor-pointer text-sm text-gray-600">{uploadingImage ? 'Uploading...' : 'Click to upload'}</label>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Keywords (comma-separated)</label>
                <input type="text" value={formData.targetKeywords} onChange={e => setFormData({ ...formData, targetKeywords: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="kitchen, grinder, tawa" />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {saveMutation.isPending ? 'Saving...' : selectedAd ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ VIEW CAMPAIGN MODAL ============ */}
      {viewModalOpen && selectedAd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Campaign Details</h2>
              <button onClick={() => { setViewModalOpen(false); setSelectedAd(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Campaign Name</p>
                <p className="font-semibold text-gray-900 text-lg">{selectedAd.name}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-xs text-gray-500">Type</p><p className="font-medium capitalize">{selectedAd.type}</p></div>
                <div><p className="text-xs text-gray-500">Status</p><p className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedAd.status] || ''}`}>{selectedAd.status}</p></div>
                <div><p className="text-xs text-gray-500">Pricing</p><p className="font-medium">{selectedAd.pricing}</p></div>
                <div><p className="text-xs text-gray-500">Bid</p><p className="font-medium">{formatCurrency(selectedAd.bid)}</p></div>
                <div><p className="text-xs text-gray-500">Daily Budget</p><p className="font-medium">{formatCurrency(selectedAd.dailyBudget)}</p></div>
                <div><p className="text-xs text-gray-500">Total Budget</p><p className="font-medium">{selectedAd.totalBudget ? formatCurrency(selectedAd.totalBudget) : 'Unlimited'}</p></div>
                <div><p className="text-xs text-gray-500">Placement</p><p className="font-medium text-xs">{placementLabel(selectedAd.placement)}</p></div>
                <div><p className="text-xs text-gray-500">Vendor</p><p className="font-medium">{selectedAd.vendorId?.storeName || '-'}</p></div>
              </div>
              {selectedAd.bannerImage && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Banner Image</p>
                  <img src={selectedAd.bannerImage} alt="Banner" className="max-w-full h-40 object-cover rounded-lg border" />
                </div>
              )}
              {(selectedAd.qualityScore?.overall > 0) && (
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-xs text-gray-500">Quality Score</p><p className="font-bold text-lg">{selectedAd.qualityScore.overall}/10</p></div>
                  <div><p className="text-xs text-gray-500">Auction Score</p><p className="font-bold text-lg">{selectedAd.auctionScore?.toFixed(2) || '-'}</p></div>
                  <div><p className="text-xs text-gray-500">Approval</p><p className={`font-medium capitalize ${selectedAd.approval?.status === 'approved' ? 'text-green-600' : selectedAd.approval?.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{selectedAd.approval?.status || 'pending'}</p></div>
                </div>
              )}
              {selectedAd.stats && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 font-medium mb-3 uppercase">Performance</p>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                    <div><p className="text-xs text-gray-500">Impressions</p><p className="font-bold text-lg">{formatNum(selectedAd.stats.impressions)}</p></div>
                    <div><p className="text-xs text-gray-500">Clicks</p><p className="font-bold text-lg">{formatNum(selectedAd.stats.clicks)}</p></div>
                    <div><p className="text-xs text-gray-500">CTR</p><p className="font-bold text-lg">{selectedAd.stats.impressions > 0 ? ((selectedAd.stats.clicks / selectedAd.stats.impressions) * 100).toFixed(2) : 0}%</p></div>
                    <div><p className="text-xs text-gray-500">Conversions</p><p className="font-bold text-lg">{selectedAd.stats.conversions || 0}</p></div>
                    <div><p className="text-xs text-gray-500">Spend</p><p className="font-bold text-lg">{formatCurrency(selectedAd.stats.spend)}</p></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ PRICING MODAL ============ */}
      {pricingModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">{selectedPricing ? 'Edit Pricing' : 'Add Pricing'}</h2>
              <button onClick={() => setPricingModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); pricingMutation.mutate(pricingForm); }} className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placement ID *</label>
                <input type="text" value={pricingForm.placement} onChange={e => setPricingForm({ ...pricingForm, placement: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required disabled={!!selectedPricing} placeholder="homepage_banner" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
                <input type="text" value={pricingForm.displayName} onChange={e => setPricingForm({ ...pricingForm, displayName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required placeholder="Homepage Banner" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={pricingForm.description} onChange={e => setPricingForm({ ...pricingForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Type</label>
                  <select value={pricingForm.pricingType} onChange={e => setPricingForm({ ...pricingForm, pricingType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="CPC">CPC</option>
                    <option value="CPM">CPM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auction Type</label>
                  <select value={pricingForm.auctionType} onChange={e => setPricingForm({ ...pricingForm, auctionType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="second_price">2nd Price</option>
                    <option value="first_price">1st Price</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Min Bid (₹)</label><input type="number" step="0.01" value={pricingForm.minBid} onChange={e => setPricingForm({ ...pricingForm, minBid: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Bid (₹)</label><input type="number" step="0.01" value={pricingForm.maxBid} onChange={e => setPricingForm({ ...pricingForm, maxBid: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Recommended Bid (₹)</label><input type="number" step="0.01" value={pricingForm.recommendedBid} onChange={e => setPricingForm({ ...pricingForm, recommendedBid: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Floor Price (₹)</label><input type="number" step="0.01" value={pricingForm.floorPrice} onChange={e => setPricingForm({ ...pricingForm, floorPrice: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Min Daily Budget (₹)</label><input type="number" step="0.01" value={pricingForm.dailyBudgetMin} onChange={e => setPricingForm({ ...pricingForm, dailyBudgetMin: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={pricingForm.status} onChange={e => setPricingForm({ ...pricingForm, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setPricingModalOpen(false)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={pricingMutation.isPending} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {pricingMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsManagement;
