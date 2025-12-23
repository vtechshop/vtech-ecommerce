// FILE: apps/web/src/pages/dashboard/vendor/Ads.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Spinner from '@/components/common/Spinner';
import Input from '@/components/common/Input';
import { useToast } from '@/components/common/ToastContainer';
import { formatCurrency, formatDate } from '@/utils/format';

const Ads = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');

  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    type: 'SponsoredProduct',
    pricing: 'CPC',
    bid: '',
    dailyBudget: '',
    startAt: new Date().toISOString().split('T')[0],
    endAt: '',
    placement: 'homepage_banner',
    productIds: [],
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['ad-campaigns'],
    queryFn: async () => {
      const response = await api.get('/ads/campaigns');
      return response.data.data;
    },
  });

  const { data: wallet } = useQuery({
    queryKey: ['ad-wallet'],
    queryFn: async () => {
      const response = await api.get('/ads/wallet');
      return response.data.data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['vendor-products'],
    queryFn: async () => {
      const response = await api.get('/vendors/products');
      return response.data.data;
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/ads/campaigns/${id}`, { status: 'paused' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/ads/campaigns/${id}`, { status: 'active' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/ads/campaigns', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['ad-wallet'] });
      toast.success('Campaign created successfully! Waiting for admin approval.');
      setIsCreateModalOpen(false);
      setCampaignForm({
        name: '',
        type: 'SponsoredProduct',
        pricing: 'CPC',
        bid: '',
        dailyBudget: '',
        startAt: new Date().toISOString().split('T')[0],
        endAt: '',
        placement: 'homepage_banner',
        productIds: [],
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create campaign');
    },
  });

  const handleCreateCampaign = (e) => {
    e.preventDefault();

    // Validation
    if (!campaignForm.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    if (!campaignForm.bid || parseFloat(campaignForm.bid) <= 0) {
      toast.error('Valid bid amount is required');
      return;
    }

    if (!campaignForm.dailyBudget || parseFloat(campaignForm.dailyBudget) <= 0) {
      toast.error('Valid daily budget is required');
      return;
    }

    if (campaignForm.type === 'SponsoredProduct' && campaignForm.productIds.length === 0) {
      toast.error('Please select at least one product for sponsored product campaigns');
      return;
    }

    // Prepare data
    const data = {
      name: campaignForm.name,
      type: campaignForm.type,
      pricing: campaignForm.pricing,
      bid: parseFloat(campaignForm.bid),
      dailyBudget: parseFloat(campaignForm.dailyBudget),
      startAt: new Date(campaignForm.startAt),
      placement: campaignForm.placement,
      status: 'draft', // Changed from 'active' to 'draft' - requires admin approval
    };

    if (campaignForm.endAt) {
      data.endAt = new Date(campaignForm.endAt);
    }

    if (campaignForm.type === 'SponsoredProduct' && campaignForm.productIds.length > 0) {
      data.targeting = {
        products: campaignForm.productIds,
      };
    }

    createCampaignMutation.mutate(data);
  };

  const rechargeWalletMutation = useMutation({
    mutationFn: async (amount) => {
      const response = await api.post('/ads/wallet/recharge', { amount });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-wallet'] });
      toast.success('Wallet recharged successfully');
      setIsModalOpen(false);
      setRechargeAmount('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to recharge wallet');
    },
  });

  const handleRechargeWallet = (e) => {
    e.preventDefault();

    const amount = parseFloat(rechargeAmount);
    if (!amount || amount < 100) {
      toast.error('Minimum recharge amount is ₹100');
      return;
    }

    rechargeWalletMutation.mutate(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Sponsored Ads</h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-700">Wallet Balance</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(wallet?.balance || 0)}
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} variant="outline">
            Recharge Wallet
          </Button>
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Sponsor Ads Info Card */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-5 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="font-bold text-purple-900 mb-2">What are Sponsored Ads?</h3>
            <p className="text-sm text-purple-800 mb-3">
              Promote your products in premium positions across V-Tech - homepage banners, category pages, and search results. Choose from CPC (pay per click), CPM (pay per 1000 views), or CPA (pay per sale) models.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="bg-white border border-purple-200 rounded p-3">
                <p className="text-xs text-purple-700 font-semibold mb-1">CPC Pricing</p>
                <p className="text-lg font-bold text-purple-600">₹5-₹20</p>
                <p className="text-xs text-purple-700">per click</p>
              </div>
              <div className="bg-white border border-purple-200 rounded p-3">
                <p className="text-xs text-purple-700 font-semibold mb-1">CPM Pricing</p>
                <p className="text-lg font-bold text-purple-600">₹100-₹300</p>
                <p className="text-xs text-purple-700">per 1000 views</p>
              </div>
              <div className="bg-white border border-purple-200 rounded p-3">
                <p className="text-xs text-purple-700 font-semibold mb-1">Starter Budget</p>
                <p className="text-lg font-bold text-purple-600">₹500+</p>
                <p className="text-xs text-purple-700">daily minimum</p>
              </div>
            </div>
            <Link
              to="/page/vendor-guide#sponsor-ads"
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Learn More About Sponsored Ads →
            </Link>
          </div>
        </div>
      </div>

      {campaigns?.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
          <p className="text-gray-700 mb-6">Start promoting your products with sponsored ads</p>
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            Create Your First Campaign
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{campaign.name}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      campaign.status === 'budget_exhausted' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-gray-900'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {campaign.type} • {campaign.pricing} • Bid: {formatCurrency(campaign.bid)}
                  </p>
                  <p className="text-sm text-gray-700">
                    Daily Budget: {formatCurrency(campaign.dailyBudget)} • 
                    Spent Today: {formatCurrency(campaign.dailySpend?.amount || 0)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {campaign.status === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => pauseMutation.mutate(campaign._id)}
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resumeMutation.mutate(campaign._id)}
                    >
                      Resume
                    </Button>
                  )}
                  <Button variant="primary" size="sm" disabled title="Detailed reports coming soon">
                    View Report
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-5 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-gray-700">Impressions</p>
                  <p className="text-lg font-bold">{campaign.stats?.impressions || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-700">Clicks</p>
                  <p className="text-lg font-bold">{campaign.stats?.clicks || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-700">CTR</p>
                  <p className="text-lg font-bold">
                    {campaign.stats?.impressions > 0
                      ? ((campaign.stats.clicks / campaign.stats.impressions) * 100).toFixed(2)
                      : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-700">Conversions</p>
                  <p className="text-lg font-bold">{campaign.stats?.conversions || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-700">Spend</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(campaign.stats?.spend || 0)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recharge Wallet Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Recharge Ad Wallet"
      >
        <form onSubmit={handleRechargeWallet} className="space-y-4">
          <p className="text-sm text-gray-700">
            Current Balance: <span className="font-semibold">{formatCurrency(wallet?.balance || 0)}</span>
          </p>
          <Input
            label="Recharge Amount"
            type="number"
            min="100"
            step="100"
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(e.target.value)}
            placeholder="Enter amount (minimum ₹100)"
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={rechargeWalletMutation.isPending}>
              Proceed to Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Campaign Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Ad Campaign"
        size="lg"
      >
        <form onSubmit={handleCreateCampaign} className="space-y-6">
          {/* Campaign Basic Info */}
          <div className="space-y-4">
            <Input
              label="Campaign Name"
              value={campaignForm.name}
              onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
              required
              placeholder="e.g., Summer Sale Campaign"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Type</label>
                <select
                  value={campaignForm.type}
                  onChange={(e) => setCampaignForm({ ...campaignForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="SponsoredProduct">Sponsored Product</option>
                  <option value="SponsoredBrand">Sponsored Brand</option>
                  <option value="Banner">Banner Ad</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Model</label>
                <select
                  value={campaignForm.pricing}
                  onChange={(e) => setCampaignForm({ ...campaignForm, pricing: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="CPC">CPC (Cost Per Click)</option>
                  <option value="CPM">CPM (Cost Per 1000 Views)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Placement</label>
              <select
                value={campaignForm.placement}
                onChange={(e) => setCampaignForm({ ...campaignForm, placement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <optgroup label="Homepage">
                  <option value="homepage_banner">Homepage Banner</option>
                  <option value="homepage_top">Homepage Top</option>
                  <option value="homepage_sidebar_left">Homepage Sidebar Left</option>
                  <option value="homepage_sidebar_right">Homepage Sidebar Right</option>
                </optgroup>
                <optgroup label="Search & Category">
                  <option value="search_sponsored_products">Search Sponsored Products</option>
                  <option value="category_top_banner">Category Top Banner</option>
                  <option value="category_grid">Category Grid</option>
                </optgroup>
                <optgroup label="Product Pages">
                  <option value="product_sidebar">Product Sidebar</option>
                  <option value="product_related">Product Related</option>
                </optgroup>
              </select>
            </div>

            {campaignForm.type === 'SponsoredProduct' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Products to Promote
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                  {products?.map((product) => (
                    <label key={product._id} className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={campaignForm.productIds.includes(product._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCampaignForm({
                              ...campaignForm,
                              productIds: [...campaignForm.productIds, product._id],
                            });
                          } else {
                            setCampaignForm({
                              ...campaignForm,
                              productIds: campaignForm.productIds.filter((id) => id !== product._id),
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">{product.title}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {campaignForm.productIds.length} product(s) selected
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`Bid Amount (₹) - ${campaignForm.pricing === 'CPC' ? 'per click' : 'per 1000 views'}`}
                type="number"
                step="0.01"
                min="0"
                value={campaignForm.bid}
                onChange={(e) => setCampaignForm({ ...campaignForm, bid: e.target.value })}
                required
                placeholder={campaignForm.pricing === 'CPC' ? '5.00 - 20.00' : '100.00 - 300.00'}
              />

              <Input
                label="Daily Budget (₹)"
                type="number"
                step="0.01"
                min="0"
                value={campaignForm.dailyBudget}
                onChange={(e) => setCampaignForm({ ...campaignForm, dailyBudget: e.target.value })}
                required
                placeholder="Minimum ₹500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={campaignForm.startAt}
                onChange={(e) => setCampaignForm({ ...campaignForm, startAt: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
              />

              <Input
                label="End Date (Optional)"
                type="date"
                value={campaignForm.endAt}
                onChange={(e) => setCampaignForm({ ...campaignForm, endAt: e.target.value })}
                min={campaignForm.startAt}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Campaign will start automatically on the selected date.
                Make sure you have sufficient balance in your ad wallet before creating the campaign.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={createCampaignMutation.isPending}>
              Create Campaign
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Ads;