import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Eye, Edit, Trash2, X, CheckCircle, Search, Filter, Download,
  Copy, Calendar, TrendingUp, MousePointer, BarChart3, DollarSign,
  Target, Star, Image as ImageIcon
} from 'lucide-react';
import api from '../../../utils/api';
import CustomSelect from '../../../components/common/CustomSelect';
import { useToast } from '../../../components/common/ToastContainer';
import { formatCurrency } from '../../../utils/format';
import ImageCropUpload from '../../../components/common/ImageCropUpload';

const AdsManagement = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  // Filter & Sort States
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [creativesModalOpen, setCreativesModalOpen] = useState(false);

  const [selectedAd, setSelectedAd] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'SponsoredProduct',
    pricing: 'CPC',
    bid: '',
    dailyBudget: '',
    totalBudget: '',
    startAt: '',
    endAt: '',
    status: 'draft',
    targetKeywords: '',
    targetProducts: '',
    vendorId: '',
    bannerImage: '',
    placement: 'homepage_banner',
    position: 'top',
    bannerSize: 'hero',
    dimensions: { width: '', height: '' },
    targetUrl: '', // URL to redirect when ad is clicked
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCreative, setUploadingCreative] = useState(false);

  // Fetch ads
  const { data: adsData, isLoading } = useQuery({
    queryKey: ['admin-ads'],
    queryFn: async () => {
      const response = await api.get('/admin/ads/campaigns');
      return response.data;
    },
  });

  // Fetch vendors for dropdown
  const { data: vendorsData } = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: async () => {
      const response = await api.get('/admin/vendors');
      return response.data.data;
    },
  });

  // Fetch creatives for selected campaign
  const { data: creativesData, isLoading: creativesLoading } = useQuery({
    queryKey: ['campaign-creatives', selectedAd?._id],
    queryFn: async () => {
      if (!selectedAd?._id) return { data: [] };
      const response = await api.get(`/ads/campaigns/${selectedAd._id}/creatives`);
      return response.data;
    },
    enabled: !!selectedAd?._id && creativesModalOpen,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditMode && editingCampaign) {
        const response = await api.put(`/admin/ads/campaigns/${editingCampaign._id}`, data);
        return response.data;
      } else {
        const response = await api.post('/admin/ads/campaigns', data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success(isEditMode ? 'Campaign updated successfully' : 'Campaign created successfully');
      setModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save campaign');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/admin/ads/campaigns/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success('Campaign deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete campaign');
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (campaign) => {
      const data = {
        name: `${campaign.name} (Copy)`,
        type: campaign.type,
        pricing: campaign.pricing,
        bid: campaign.bid,
        dailyBudget: campaign.dailyBudget,
        totalBudget: campaign.totalBudget,
        startAt: new Date(),
        placement: campaign.placement,
        position: campaign.position,
        bannerSize: campaign.bannerSize,
        dimensions: campaign.dimensions,
        status: 'draft',
        vendorId: campaign.vendorId?._id || campaign.vendorId,
        targeting: campaign.targeting,
      };
      const response = await api.post('/admin/ads/campaigns', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success('Campaign duplicated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to duplicate campaign');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await api.put(`/admin/ads/campaigns/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update status');
    },
  });

  // Upload Creative mutation
  const uploadCreativeMutation = useMutation({
    mutationFn: async ({ campaignId, file, campaign }) => {
      // Validate file
      if (!file) {
        throw new Error('Please select a file');
      }

      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/tiff', 'image/x-icon'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload an image file (PNG, JPG, GIF, WebP, BMP, SVG, TIFF, ICO)');
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'ad-creatives');

      const uploadResponse = await api.post('/upload/single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!uploadResponse.data?.data?.url) {
        throw new Error('Failed to get upload URL from server');
      }

      // Amazon-style: Automatically inherit campaign settings for seamless upload
      const placementValue = campaign?.placement || 'search_sponsored_products';
      console.log('🎨 [CREATIVE DEBUG] Campaign object:', campaign);
      console.log('🎨 [CREATIVE DEBUG] Campaign placement:', campaign?.placement);
      console.log('🎨 [CREATIVE DEBUG] Using placement:', placementValue);

      const creativeData = {
        imageUrl: uploadResponse.data.data.url,
        title: file.name,
        placement: placementValue,
        status: 'active', // Auto-activate creative
      };

      console.log('🎨 [CREATIVE DEBUG] Creative data being sent:', creativeData);

      const response = await api.post(`/ads/campaigns/${campaignId}/creatives`, creativeData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-creatives'] });
      toast.success('Creative uploaded successfully!');
      setUploadingCreative(false);
    },
    onError: (error) => {
      console.error('Creative upload error:', error);
      const errorMessage = error.message || error.response?.data?.error?.message || 'Failed to upload creative';
      toast.error(errorMessage);
      setUploadingCreative(false);
    },
  });

  // Delete Creative mutation
  const deleteCreativeMutation = useMutation({
    mutationFn: async ({ campaignId, creativeId }) => {
      if (!campaignId || !creativeId) {
        throw new Error('Campaign ID and Creative ID are required');
      }
      const response = await api.delete(`/ads/campaigns/${campaignId}/creatives/${creativeId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-creatives'] });
      toast.success('Creative deleted successfully!');
    },
    onError: (error) => {
      console.error('Creative delete error:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to delete creative';
      toast.error(errorMessage);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'SponsoredProduct',
      pricing: 'CPC',
      bid: '',
      dailyBudget: '',
      totalBudget: '',
      startAt: '',
      endAt: '',
      status: 'draft',
      targetKeywords: '',
      targetProducts: '',
      vendorId: '',
      bannerImage: '',
      placement: 'homepage_banner',
      position: 'top',
      bannerSize: 'hero',
      dimensions: { width: '', height: '' },
      targetUrl: '',
    });
    setIsEditMode(false);
    setEditingCampaign(null);
  };

  const handleCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleEdit = (ad) => {
    setIsEditMode(true);
    setEditingCampaign(ad);
    setFormData({
      name: ad.name || '',
      type: ad.type || 'SponsoredProduct',
      pricing: ad.pricing || 'CPC',
      bid: ad.bid || '',
      dailyBudget: ad.dailyBudget || '',
      totalBudget: ad.totalBudget || '',
      startAt: ad.startAt ? new Date(ad.startAt).toISOString().slice(0, 16) : '',
      endAt: ad.endAt ? new Date(ad.endAt).toISOString().slice(0, 16) : '',
      status: ad.status || 'draft',
      targetKeywords: ad.targeting?.keywords?.map(k => k.keyword).join(', ') || '',
      targetProducts: ad.targeting?.products?.join(', ') || '',
      vendorId: ad.vendorId?._id || ad.vendorId || '',
      bannerImage: ad.bannerImage || '',
      placement: ad.placement || 'homepage_banner',
      position: ad.position || 'top',
      bannerSize: ad.bannerSize || 'hero',
      dimensions: ad.dimensions || { width: '', height: '' },
      targetUrl: ad.targetUrl || '',
    });
    setModalOpen(true);
  };

  const handleView = (ad) => {
    setSelectedAd(ad);
    setViewModalOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDuplicate = (campaign) => {
    if (confirm(`Duplicate campaign "${campaign.name}"?`)) {
      duplicateMutation.mutate(campaign);
    }
  };

  const handleOpenReport = (campaign) => {
    setSelectedAd(campaign);
    setReportModalOpen(true);
  };

  const handleOpenCreatives = (campaign) => {
    setSelectedAd(campaign);
    setCreativesModalOpen(true);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    setUploadingImage(true);
    const imageFormData = new FormData();
    imageFormData.append('file', file);
    imageFormData.append('folder', 'ads');

    try {
      const response = await api.post('/upload/single', imageFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFormData({ ...formData, bannerImage: response.data.data.url });
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreativeUpload = async (file, preview) => {
    if (!file || !selectedAd) return;

    setUploadingCreative(true);
    try {
      await uploadCreativeMutation.mutateAsync({
        campaignId: selectedAd._id,
        file,
        campaign: selectedAd // Pass campaign to inherit placement
      });
    } finally {
      setUploadingCreative(false);
    }
  };

  const handleDeleteCreative = (creativeId) => {
    if (confirm('Are you sure you want to delete this creative?')) {
      deleteCreativeMutation.mutate({ campaignId: selectedAd._id, creativeId });
    }
  };

  const downloadReportCSV = (campaign) => {
    const stats = campaign.stats || {};
    const impressions = stats.impressions || 0;
    const clicks = stats.clicks || 0;
    const conversions = stats.conversions || 0;
    const spend = stats.spend || 0;

    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
    const convRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00';
    const avgCpc = clicks > 0 ? (spend / clicks).toFixed(2) : '0.00';
    const cpa = conversions > 0 ? (spend / conversions).toFixed(2) : '0.00';

    const csvContent = [
      ['Campaign Report', campaign.name],
      ['Generated on', new Date().toLocaleString()],
      [''],
      ['Metric', 'Value'],
      ['Campaign Name', campaign.name],
      ['Type', campaign.type],
      ['Status', campaign.status],
      ['Vendor', campaign.vendorId?.storeName || 'N/A'],
      [''],
      ['Performance Metrics', ''],
      ['Impressions', impressions],
      ['Clicks', clicks],
      ['CTR', `${ctr}%`],
      ['Conversions', conversions],
      ['Conversion Rate', `${convRate}%`],
      ['Average CPC', `$${avgCpc}`],
      ['CPA', `$${cpa}`],
      ['Total Spend', `$${spend.toFixed(2)}`],
      [''],
      ['Budget Information', ''],
      ['Bid', `$${campaign.bid}`],
      ['Daily Budget', `$${campaign.dailyBudget}`],
      ['Total Budget', campaign.totalBudget ? `$${campaign.totalBudget}` : 'Not set'],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.name}_report.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const keywords = formData.targetKeywords.split(',').map(k => k.trim()).filter(Boolean);

    // Parse target products if provided
    const targetProducts = formData.targetProducts
      ? formData.targetProducts.split(',').map(p => p.trim()).filter(Boolean)
      : [];

    const dataToSend = {
      name: formData.name,
      type: formData.type,
      pricing: formData.pricing,
      bid: parseFloat(formData.bid),
      dailyBudget: parseFloat(formData.dailyBudget),
      totalBudget: formData.totalBudget ? parseFloat(formData.totalBudget) : undefined,
      startAt: formData.startAt,
      endAt: formData.endAt || undefined,
      status: formData.status,
      vendorId: formData.vendorId,
      bannerImage: formData.bannerImage || undefined,
      placement: formData.placement,
      position: formData.position,
      bannerSize: formData.bannerSize,
      dimensions: formData.bannerSize === 'custom' && formData.dimensions.width && formData.dimensions.height
        ? { width: parseInt(formData.dimensions.width), height: parseInt(formData.dimensions.height) }
        : undefined,
      targetUrl: formData.targetUrl || undefined,
      targeting: {
        keywords: keywords.map(k => ({ keyword: k, matchType: 'broad' })),
        // Include products array - empty for search placements, can be populated for product-specific ads
        products: targetProducts.length > 0 ? targetProducts : [],
      },
    };

    console.log('🎯 [ADMIN DEBUG] Submitting campaign with targeting:', dataToSend.targeting);
    saveMutation.mutate(dataToSend);
  };

  // Filter and Sort Campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    const campaigns = adsData?.data || [];
    let filtered = campaigns;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.vendorId?.storeName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'spend':
          return (b.stats?.spend || 0) - (a.stats?.spend || 0);
        case 'ctr': {
          const aCtr = a.stats?.impressions > 0 ? (a.stats.clicks / a.stats.impressions) : 0;
          const bCtr = b.stats?.impressions > 0 ? (b.stats.clicks / b.stats.impressions) : 0;
          return bCtr - aCtr;
        }
        case 'clicks':
          return (b.stats?.clicks || 0) - (a.stats?.clicks || 0);
        case 'impressions':
          return (b.stats?.impressions || 0) - (a.stats?.impressions || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [adsData, searchQuery, statusFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const badges = {
      draft: { label: 'Draft', emoji: '📝', color: 'bg-gray-100 text-gray-800' },
      active: { label: 'Active', emoji: '✅', color: 'bg-green-100 text-green-800' },
      paused: { label: 'Paused', emoji: '⏸️', color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Completed', emoji: '🏁', color: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Cancelled', emoji: '❌', color: 'bg-red-100 text-red-800' },
      budget_exhausted: { label: 'Budget Exhausted', emoji: '💸', color: 'bg-orange-100 text-orange-800' },
    };
    const badge = badges[status] || badges.draft;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <span>{badge.emoji}</span>
        {badge.label}
      </span>
    );
  };

  const renderStars = (score) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${i <= score ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    return stars;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sponsored Ads Management</h1>
          <p className="text-sm sm:text-base text-gray-700 mt-1">Manage all vendor advertising campaigns</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/admin-dashboard/ads/approvals"
            className="px-3 sm:px-4 py-2 bg-green-600 text-white text-sm sm:text-base rounded-lg hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Campaign</span> Approvals
          </Link>
          <button
            onClick={handleCreate}
            className="px-3 sm:px-4 py-2 bg-primary-600 text-white text-sm sm:text-base rounded-lg hover:bg-primary-700 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create<span className="hidden sm:inline"> Campaign</span>
          </button>
        </div>
      </div>

      {/* Search, Filter & Sort Bar - Amazon Style */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search campaigns or vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <CustomSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'draft', label: 'Draft' },
                { value: 'active', label: 'Active' },
                { value: 'paused', label: 'Paused' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              placeholder="All Status"
              className="w-48"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="spend">Sort by Spend</option>
              <option value="ctr">Sort by CTR</option>
              <option value="clicks">Sort by Clicks</option>
              <option value="impressions">Sort by Impressions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Grid - Amazon Style */}
      <div className="space-y-4">
        {filteredAndSortedCampaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12">
            <p className="text-gray-500">No campaigns found</p>
          </div>
        ) : (
          filteredAndSortedCampaigns.map((campaign) => {
            const stats = campaign.stats || {};
            const impressions = stats.impressions || 0;
            const clicks = stats.clicks || 0;
            const conversions = stats.conversions || 0;
            const spend = stats.spend || 0;

            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
            const convRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00';
            const avgCpc = clicks > 0 ? (spend / clicks).toFixed(2) : '0.00';

            const qualityScore = campaign.qualityScore || Math.floor(Math.random() * 3) + 3;

            return (
              <div key={campaign._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Campaign Header - Gradient Amazon Style */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-4 text-white">
                  <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3">
                    <div className="flex-1 w-full min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold mb-2">{campaign.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-blue-100">
                        <span className="shrink-0 truncate max-w-[140px] sm:max-w-none">{campaign.type}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="shrink-0 truncate max-w-[180px] sm:max-w-none">Vendor: {campaign.vendorId?.storeName || 'N/A'}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="shrink-0 whitespace-nowrap">Bid: ${campaign.bid} {campaign.pricing}</span>
                      </div>
                    </div>
                    <div className="shrink-0">{getStatusBadge(campaign.status)}</div>
                  </div>
                </div>

                {/* Campaign Details */}
                <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Daily Budget</p>
                      <p className="font-semibold text-gray-900">${campaign.dailyBudget}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Placement</p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {campaign.placement ? campaign.placement.replace(/_/g, ' ') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Position</p>
                      <p className="font-semibold text-gray-900 capitalize">{campaign.position || 'top'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Quality Score</p>
                      <div className="flex items-center gap-1">
                        {renderStars(qualityScore)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics - 7 Cards Amazon Style */}
                <div className="px-4 sm:px-6 py-4 bg-white border-b border-gray-200">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
                    {/* Impressions */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-l-4 border-blue-500">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="w-4 h-4 text-blue-600" />
                        <p className="text-xs text-gray-600 font-medium">Impressions</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{impressions.toLocaleString()}</p>
                    </div>

                    {/* Clicks */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-l-4 border-purple-500">
                      <div className="flex items-center gap-2 mb-1">
                        <MousePointer className="w-4 h-4 text-purple-600" />
                        <p className="text-xs text-gray-600 font-medium">Clicks</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{clicks.toLocaleString()}</p>
                    </div>

                    {/* CTR */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <p className="text-xs text-gray-600 font-medium">CTR</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{ctr}%</p>
                    </div>

                    {/* Conversions */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border-l-4 border-orange-500">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-orange-600" />
                        <p className="text-xs text-gray-600 font-medium">Conversions</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{conversions.toLocaleString()}</p>
                    </div>

                    {/* Conv. Rate */}
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-3 border-l-4 border-teal-500">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-4 h-4 text-teal-600" />
                        <p className="text-xs text-gray-600 font-medium">Conv. Rate</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{convRate}%</p>
                    </div>

                    {/* Avg CPC */}
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-3 border-l-4 border-pink-500">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-pink-600" />
                        <p className="text-xs text-gray-600 font-medium">Avg CPC</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">${avgCpc}</p>
                    </div>

                    {/* Total Spend */}
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border-l-4 border-red-500">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-red-600" />
                        <p className="text-xs text-gray-600 font-medium">Total Spend</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">${spend.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-4 sm:px-6 py-4 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleEdit(campaign)}
                      className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(campaign)}
                      className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleOpenCreatives(campaign)}
                      className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Creatives
                    </button>
                    <button
                      onClick={() => handleOpenReport(campaign)}
                      className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      Report
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Status Update Dropdown */}
                    <select
                      value={campaign.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: campaign._id, status: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-1 sm:flex-initial"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <button
                      onClick={() => handleDelete(campaign._id)}
                      className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm whitespace-nowrap flex-1 sm:flex-initial justify-center"
                      disabled={deleteMutation.isLoading}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-[95vw] sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Campaign' : 'Create Campaign'}
                </h2>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                <select
                  value={formData.vendorId}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a vendor</option>
                  {(vendorsData || []).map((vendor) => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.storeName} ({vendor.userId?.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="SponsoredProduct">Sponsored Product</option>
                    <option value="SponsoredBrand">Sponsored Brand</option>
                    <option value="Banner">Banner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pricing *</label>
                  <select
                    value={formData.pricing}
                    onChange={(e) => setFormData({ ...formData, pricing: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="CPC">CPC (Cost Per Click)</option>
                    <option value="CPM">CPM (Cost Per Mille)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bid ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.bid}
                    onChange={(e) => setFormData({ ...formData, bid: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Budget ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.dailyBudget}
                    onChange={(e) => setFormData({ ...formData, dailyBudget: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalBudget}
                    onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={formData.endAt}
                    onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="budget_exhausted">Budget Exhausted</option>
                </select>
              </div>

              {/* Placement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placement (Page/Location) *
                </label>
                <select
                  value={formData.placement}
                  onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoComplete="off"
                  required
                >
                  <optgroup label="Homepage">
                    <option value="homepage_banner">Homepage - Banner (Hero Section)</option>
                    <option value="homepage_sidebar_left">Homepage - Left Sidebar</option>
                    <option value="homepage_sidebar_right">Homepage - Right Sidebar</option>
                    <option value="homepage_middle">Homepage - Middle Section</option>
                    <option value="homepage_bottom">Homepage - Bottom Section</option>
                  </optgroup>

                  <optgroup label="Search & Category">
                    <option value="search_sponsored_products">Search Results - Sponsored Products</option>
                    <option value="search_top">Search Results - Top Banner</option>
                    <option value="category_top_banner">Category Page - Top Banner</option>
                    <option value="category_sidebar">Category Page - Sidebar</option>
                    <option value="category_grid">Category Page - In Product Grid</option>
                  </optgroup>

                  <optgroup label="Blog Pages">
                    <option value="blog_top">Blog - Top Banner</option>
                    <option value="blog_sidebar">Blog - Sidebar</option>
                    <option value="blog_in_content">Blog Post - In Content</option>
                    <option value="blog_bottom">Blog Post - Bottom Banner</option>
                  </optgroup>
                </select>
              </div>

              {/* Banner Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Position *
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="top">Top - Full Width</option>
                  <option value="right">Right - Sidebar</option>
                  <option value="bottom">Bottom - Full Width</option>
                  <option value="left">Left - Sidebar</option>
                  <option value="center">Center - Overlay</option>
                  <option value="top-right">Top-Right - Corner</option>
                  <option value="top-left">Top-Left - Corner</option>
                  <option value="bottom-right">Bottom-Right - Corner</option>
                  <option value="bottom-left">Bottom-Left - Corner</option>
                </select>
              </div>

              {/* Banner Size/Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Size/Type *
                </label>
                <select
                  value={formData.bannerSize}
                  onChange={(e) => setFormData({ ...formData, bannerSize: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="hero">Hero Banner - Full Width Header (1920x600px)</option>
                  <option value="leaderboard">Leaderboard - Top Banner (728x90px)</option>
                  <option value="side-large">Large Sidebar Banner (300x600px)</option>
                  <option value="side-small">Small Sidebar Banner (300x250px)</option>
                  <option value="rectangle">Medium Rectangle (300x250px)</option>
                  <option value="skyscraper">Skyscraper - Tall Sidebar (160x600px)</option>
                  <option value="square">Square Banner (250x250px)</option>
                  <option value="custom">Custom Size (Specify Dimensions)</option>
                </select>
              </div>

              {/* Custom Dimensions */}
              {formData.bannerSize === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (px) *
                    </label>
                    <input
                      type="number"
                      value={formData.dimensions.width}
                      onChange={(e) => setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions, width: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., 300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (px) *
                    </label>
                    <input
                      type="number"
                      value={formData.dimensions.height}
                      onChange={(e) => setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions, height: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., 250"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Banner Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner Image (Optional)
                </label>
                {formData.bannerImage ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.bannerImage}
                      alt="Banner preview"
                      className="w-full max-w-md h-40 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, bannerImage: '' })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.tiff,.ico,image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp,image/svg+xml,image/tiff,image/x-icon"
                      onChange={(e) => handleImageUpload(e.target.files[0])}
                      disabled={uploadingImage}
                      className="hidden"
                      id="bannerImageUpload"
                    />
                    <label htmlFor="bannerImageUpload" className="cursor-pointer">
                      {uploadingImage ? (
                        <p className="text-blue-600 font-medium">Uploading...</p>
                      ) : (
                        <>
                          <p className="font-medium text-gray-700">Click to upload banner image</p>
                          <p className="text-xs text-gray-500 mt-1">Supports: PNG, JPG, JPEG, GIF, WebP, BMP, SVG, TIFF, ICO (Max 10MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Keywords (comma-separated) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.targetKeywords}
                  onChange={(e) => setFormData({ ...formData, targetKeywords: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., all, laptop, phone, headphones"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Required:</strong> Keywords for ad targeting. Use "all" to match all search queries, or enter specific keywords separated by commas.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  💡 Examples: "all" (shows for all searches) | "laptop, computer, electronics" (shows for specific searches)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Products (comma-separated Product IDs)
                </label>
                <input
                  type="text"
                  value={formData.targetProducts}
                  onChange={(e) => setFormData({ ...formData, targetProducts: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Leave empty for search placements"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Leave empty for keyword-based search ads. For product-specific placements, enter product IDs separated by commas.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target URL (Click Destination)
                </label>
                <input
                  type="text"
                  value={formData.targetUrl}
                  onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., /product/iphone-15 or https://example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Where to redirect when ad is clicked. Use internal paths like "/product/slug" or "/category/electronics", or external URLs starting with "https://".
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isLoading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saveMutation.isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModalOpen && selectedAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-[95vw] sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Campaign Report</h2>
                <button
                  onClick={() => {
                    setReportModalOpen(false);
                    setSelectedAd(null);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedAd.name}</h3>
                <p className="text-sm text-gray-600">
                  Vendor: {selectedAd.vendorId?.storeName || 'N/A'} • Type: {selectedAd.type} • Status: {selectedAd.status}
                </p>
              </div>

              {/* Performance Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
                <h4 className="font-semibold mb-4">Performance Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Impressions</p>
                    <p className="text-2xl font-bold">{(selectedAd.stats?.impressions || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Clicks</p>
                    <p className="text-2xl font-bold">{(selectedAd.stats?.clicks || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Conversions</p>
                    <p className="text-2xl font-bold">{(selectedAd.stats?.conversions || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Spend</p>
                    <p className="text-2xl font-bold">${(selectedAd.stats?.spend || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => downloadReportCSV(selectedAd)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creatives Modal */}
      {creativesModalOpen && selectedAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-[95vw] sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Ad Creatives</h2>
                <button
                  onClick={() => {
                    setCreativesModalOpen(false);
                    setSelectedAd(null);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Campaign Name */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-900">Campaign: <span className="text-blue-600">{selectedAd.name}</span></p>
              </div>

              {/* Upload Creative - Amazon Style with Preview & Crop */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Creative</h3>
                {uploadingCreative ? (
                  <div className="text-center py-12 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-blue-600 font-medium text-lg">Uploading creative...</p>
                    <p className="text-blue-500 text-sm mt-2">Please wait while we process your image</p>
                  </div>
                ) : (
                  <ImageCropUpload
                    onImageCropped={handleCreativeUpload}
                    accept="image/*"
                    maxSize={10}
                    recommendedDimensions="1920x1080px for best quality"
                  />
                )}
              </div>

              {/* Divider */}
              <div className="border-t-2 border-gray-200"></div>

              {/* Existing Creatives */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Existing Creatives</h3>

                {creativesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(creativesData?.data || []).length === 0 ? (
                      <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500 font-medium">No creatives uploaded yet</p>
                        <p className="text-sm text-gray-400 mt-1">Upload your first creative above to get started</p>
                      </div>
                    ) : (
                      (creativesData?.data || []).map((creative) => (
                        <div key={creative._id} className="relative group">
                          <img
                            src={creative.bannerAsset?.imageUrl || creative.imageUrl}
                            alt={creative.bannerAsset?.imageAlt || creative.headline || 'Creative'}
                            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all"
                          />
                          <button
                            onClick={() => handleDeleteCreative(creative._id)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-sm text-white font-medium truncate">{creative.title}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsManagement;
