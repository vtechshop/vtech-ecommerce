import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Edit, Trash2, X, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../../../utils/api';
import CustomSelect from '../../../components/common/CustomSelect';
import { useToast } from '../../../components/common/ToastContainer';

const AdsManagement = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
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
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch ads
  const { data: adsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-ads', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const response = await api.get(`/admin/ads/campaigns${params}`);
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

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (selectedAd) {
        const response = await api.put(`/admin/ads/campaigns/${selectedAd._id}`, data);
        return response.data;
      } else {
        const response = await api.post('/admin/ads/campaigns', data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      toast.success(selectedAd ? 'Ad campaign updated successfully' : 'Ad campaign created successfully');
      setModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save ad campaign');
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
      toast.success('Ad campaign deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete ad campaign');
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
    });
    setSelectedAd(null);
  };

  const handleCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleEdit = (ad) => {
    setSelectedAd(ad);
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
    });
    setModalOpen(true);
  };

  const handleView = (ad) => {
    setSelectedAd(ad);
    setViewModalOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this ad campaign?')) {
      deleteMutation.mutate(id);
    }
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const keywords = formData.targetKeywords.split(',').map(k => k.trim()).filter(Boolean);

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
      targeting: {
        keywords: keywords.map(k => ({ keyword: k, matchType: 'broad' })),
      },
    };
    saveMutation.mutate(dataToSend);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const campaigns = adsData?.data || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sponsored Ads</h1>
          <p className="text-gray-700 mt-1">Manage advertising campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link
            to="/admin-dashboard/ads/approvals"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Campaign Approvals
          </Link>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <CustomSelect
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={[
            { value: '', label: 'All Status' },
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

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No ad campaigns found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Placement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((ad) => (
                <tr key={ad._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{ad.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700 capitalize">{ad.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {ad.placement ? (
                        <div className="text-xs">
                          {ad.placement.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                      ) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700 capitalize">
                      {ad.position || ad.bannerSize ? (
                        <div>
                          <div className="font-medium text-xs">{(ad.position || 'top').replace(/-/g, ' ')}</div>
                          <div className="text-xs text-gray-500">
                            {ad.bannerSize || 'hero'}
                          </div>
                        </div>
                      ) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">${ad.bid}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">${ad.budget}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={ad.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: ad._id, status: e.target.value })}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        ad.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : ad.status === 'paused'
                          ? 'bg-yellow-100 text-yellow-800'
                          : ad.status === 'draft'
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(ad)}
                        className="text-blue-600 hover:text-blue-700"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(ad)}
                        className="text-gray-700 hover:text-gray-700"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ad._id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete"
                        disabled={deleteMutation.isLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedAd ? 'Edit Campaign' : 'Create Campaign'}
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

              <div className="grid grid-cols-3 gap-4">
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

              {/* Placement - Now visible for all types */}
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
                    <option value="homepage_top">Homepage - Top Section</option>
                    <option value="homepage_middle">Homepage - Middle Section</option>
                    <option value="homepage_bottom">Homepage - Bottom Section</option>
                  </optgroup>

                  <optgroup label="Product Pages">
                    <option value="product_sidebar">Product Page - Sidebar</option>
                    <option value="product_top">Product Page - Top Banner</option>
                    <option value="product_bottom">Product Page - Bottom Banner</option>
                    <option value="product_related">Product Page - Related Products Section</option>
                  </optgroup>

                  <optgroup label="Category Pages">
                    <option value="category_top_banner">Category Page - Top Banner</option>
                    <option value="category_sidebar">Category Page - Sidebar</option>
                    <option value="category_grid">Category Page - In Product Grid</option>
                  </optgroup>

                  <optgroup label="Search & Results">
                    <option value="search_sponsored_products">Search Results - Sponsored Products</option>
                    <option value="search_top">Search Results - Top Banner</option>
                    <option value="search_sidebar">Search Results - Sidebar</option>
                  </optgroup>

                  <optgroup label="Cart & Checkout">
                    <option value="cart_sidebar">Cart Page - Sidebar</option>
                    <option value="cart_bottom">Cart Page - Bottom Banner</option>
                    <option value="checkout_top">Checkout Page - Top Banner</option>
                  </optgroup>

                  <optgroup label="Blog">
                    <option value="blog_sidebar">Blog - Sidebar</option>
                    <option value="blog_top">Blog - Top Banner</option>
                    <option value="blog_in_content">Blog - In Content</option>
                    <option value="blog_bottom">Blog - Bottom Banner</option>
                  </optgroup>

                  <optgroup label="User Account">
                    <option value="account_dashboard">Account Dashboard - Banner</option>
                    <option value="account_orders">My Orders Page - Sidebar</option>
                    <option value="account_profile">Profile Page - Banner</option>
                  </optgroup>

                  <optgroup label="Vendor Pages">
                    <option value="vendor_store">Vendor Store Page - Banner</option>
                    <option value="vendor_list">Vendor List Page - Sidebar</option>
                  </optgroup>

                  <optgroup label="Other Pages">
                    <option value="about_us">About Us - Banner</option>
                    <option value="contact_us">Contact Us - Sidebar</option>
                    <option value="faq">FAQ Page - Sidebar</option>
                    <option value="terms">Terms & Conditions - Sidebar</option>
                    <option value="privacy">Privacy Policy - Sidebar</option>
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  🎯 Select which page and section your ad will appear on
                </p>
              </div>

              {/* Banner Position - Now visible for all types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Position *
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-5 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-3 border-blue-400 rounded-xl text-gray-900 font-semibold text-base shadow-md focus:ring-4 focus:ring-blue-300 focus:border-blue-600 hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  style={{
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%232563eb'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '3rem'
                  }}
                  autoComplete="off"
                  required
                >
                  <option value="" style={{ background: '#f9fafb', color: '#6b7280', padding: '12px' }}>Select position...</option>
                  <option value="top" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📍 Top - Full Width</option>
                  <option value="right" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📍 Right - Sidebar</option>
                  <option value="bottom" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📍 Bottom - Full Width</option>
                  <option value="left" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📍 Left - Sidebar</option>
                  <option value="center" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📍 Center - Overlay</option>
                  <option value="top-right" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📍 Top-Right - Corner</option>
                  <option value="top-left" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📍 Top-Left - Corner</option>
                  <option value="bottom-right" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📍 Bottom-Right - Corner</option>
                  <option value="bottom-left" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📍 Bottom-Left - Corner</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose where the banner ad will be displayed on the page
                </p>
              </div>

              {/* Banner Size/Type - Now visible for all types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Size/Type *
                </label>
                <select
                  value={formData.bannerSize}
                  onChange={(e) => setFormData({ ...formData, bannerSize: e.target.value })}
                  className="w-full px-5 py-3.5 bg-gradient-to-r from-purple-50 to-pink-50 border-3 border-purple-400 rounded-xl text-gray-900 font-semibold text-base shadow-md focus:ring-4 focus:ring-purple-300 focus:border-purple-600 hover:border-purple-500 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  style={{
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239333ea'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '3rem'
                  }}
                  required
                >
                  <option value="hero" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>🎯 Hero Banner - Full Width Header (1920x600px)</option>
                  <option value="leaderboard" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📏 Leaderboard - Top Banner (728x90px)</option>
                  <option value="side-large" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📱 Large Sidebar Banner (300x600px)</option>
                  <option value="side-small" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>📦 Small Sidebar Banner (300x250px)</option>
                  <option value="rectangle" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>⬛ Medium Rectangle (300x250px)</option>
                  <option value="skyscraper" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>🏢 Skyscraper - Tall Sidebar (160x600px)</option>
                  <option value="square" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>◼️ Square Banner (250x250px)</option>
                  <option value="custom" style={{ background: '#ffffff', color: '#111827', padding: '12px' }}>✏️ Custom Size (Specify Dimensions)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Choose banner size based on placement. Hero for homepage, sidebar for product pages.
                </p>
              </div>

              {/* Custom Dimensions - Now visible for all types when custom size selected */}
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
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files[0])}
                      disabled={uploadingImage}
                      className="hidden"
                      id="bannerImageUpload"
                    />
                    <label htmlFor="bannerImageUpload" className="cursor-pointer">
                      {uploadingImage ? (
                        <p className="text-blue-600 font-medium">📤 Uploading...</p>
                      ) : (
                        <>
                          <p className="font-medium text-gray-700">Click to upload banner image</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                        </>
                      )}
                    </label>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Upload a custom banner image for this ad campaign (will be shown in sponsored ads)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.targetKeywords}
                  onChange={(e) => setFormData({ ...formData, targetKeywords: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="laptop, phone, headphones"
                />
                <p className="text-xs text-gray-500 mt-1">Enter keywords that will trigger this ad (e.g., laptop, phone, headphones)</p>
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
                  {saveMutation.isLoading ? 'Saving...' : selectedAd ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModalOpen && selectedAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Campaign Details</h2>
                <button
                  onClick={() => {
                    setViewModalOpen(false);
                    setSelectedAd(null);
                  }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-700">Campaign Name</p>
                <p className="font-medium text-gray-900">{selectedAd.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-700">Type</p>
                  <p className="font-medium text-gray-900 capitalize">{selectedAd.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700">Status</p>
                  <p className="font-medium text-gray-900 capitalize">{selectedAd.status}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-700">Bid</p>
                  <p className="font-medium text-gray-900">${selectedAd.bid}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700">Budget</p>
                  <p className="font-medium text-gray-900">${selectedAd.budget}</p>
                </div>
              </div>
              {selectedAd.targetKeywords?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-700">Target Keywords</p>
                  <p className="font-medium text-gray-900">{selectedAd.targetKeywords.join(', ')}</p>
                </div>
              )}
              {selectedAd.stats && (
                <div>
                  <p className="text-sm text-gray-700 mb-2">Statistics</p>
                  <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-700">Clicks</p>
                      <p className="font-bold text-lg">{selectedAd.stats.clicks || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-700">Conversions</p>
                      <p className="font-bold text-lg">{selectedAd.stats.conversions || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-700">Spend</p>
                      <p className="font-bold text-lg">${selectedAd.stats.spend || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsManagement;
