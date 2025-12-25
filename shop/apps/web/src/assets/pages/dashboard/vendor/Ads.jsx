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
import { loadRazorpayScript } from '@/utils/razorpay';

const Ads = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedCampaignForReport, setSelectedCampaignForReport] = useState(null);

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
    position: 'top',
    bannerSize: 'hero',
    dimensions: { width: '', height: '' },
    productIds: [],
  });

  // Fetch pricing settings for selected placement
  const { data: pricingSettings } = useQuery({
    queryKey: ['ad-pricing-settings', campaignForm.placement],
    queryFn: async () => {
      const response = await api.get(`/ads/pricing-settings/${campaignForm.placement}`);
      return response.data.data;
    },
    enabled: !!campaignForm.placement && isCreateModalOpen,
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
        position: 'top',
        bannerSize: 'hero',
        dimensions: { width: '', height: '' },
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
      position: campaignForm.position,
      bannerSize: campaignForm.bannerSize,
      dimensions: campaignForm.bannerSize === 'custom' && campaignForm.dimensions.width && campaignForm.dimensions.height
        ? { width: parseInt(campaignForm.dimensions.width), height: parseInt(campaignForm.dimensions.height) }
        : undefined,
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

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Helper to get bid recommendation
  const getBidRecommendation = () => {
    if (!pricingSettings || !campaignForm.bid) return null;

    const bid = parseFloat(campaignForm.bid);
    const { minBid, maxBid, recommendedBid, floorPrice } = pricingSettings;

    if (bid < minBid) {
      return {
        valid: false,
        level: 'error',
        message: `Minimum bid is ₹${minBid}`,
      };
    }
    if (bid > maxBid) {
      return {
        valid: false,
        level: 'error',
        message: `Maximum bid is ₹${maxBid}`,
      };
    }
    if (bid < floorPrice) {
      return {
        valid: false,
        level: 'error',
        message: `Minimum bid to participate in auction is ₹${floorPrice}`,
      };
    }
    if (bid < recommendedBid) {
      return {
        valid: true,
        level: 'warning',
        message: `Your bid is below recommended. Consider bidding ₹${recommendedBid} for better visibility.`,
      };
    }
    return {
      valid: true,
      level: 'success',
      message: 'Your bid is competitive!',
    };
  };

  const initiateWalletRecharge = async (amount) => {
    try {
      setIsProcessingPayment(true);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Create Razorpay order
      const orderResponse = await api.post('/ads/wallet/recharge/create-order', { amount });
      const orderData = orderResponse.data.data;

      // Get user data
      const userResponse = await api.get('/user/profile');
      const userData = userResponse.data.data;

      // Razorpay options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'V-Tech Ad Wallet',
        description: `Recharge Ad Wallet - ₹${amount}`,
        image: '/logo.png',
        order_id: orderData.orderId,
        prefill: {
          name: userData.name || '',
          email: userData.email || '',
          contact: userData.phone || '',
        },
        notes: {
          type: 'ad_wallet_recharge',
          amount: amount.toString(),
        },
        theme: {
          color: '#3b82f6',
        },
        handler: async function (response) {
          try {
            // Verify payment
            const verificationData = {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            };

            const verifyResponse = await api.post('/ads/wallet/recharge/verify', verificationData);

            if (verifyResponse.data.success) {
              queryClient.invalidateQueries({ queryKey: ['ad-wallet'] });
              toast.success('Wallet recharged successfully');
              setIsModalOpen(false);
              setRechargeAmount('');
            }
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast.error(error.response?.data?.error?.message || 'Payment verification failed');
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
            toast.error('Payment cancelled');
          },
        },
      };

      // Create Razorpay instance and open payment modal
      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        setIsProcessingPayment(false);
        toast.error(response.error.description || 'Payment failed');
      });

      razorpay.open();
    } catch (error) {
      setIsProcessingPayment(false);
      console.error('Error initiating payment:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to initiate payment');
    }
  };

  const handleRechargeWallet = (e) => {
    e.preventDefault();

    const amount = parseFloat(rechargeAmount);
    if (!amount || amount < 100) {
      toast.error('Minimum recharge amount is ₹100');
      return;
    }

    initiateWalletRecharge(amount);
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
          {campaigns.map((campaign) => {
            const impressions = campaign.stats?.impressions || 0;
            const clicks = campaign.stats?.clicks || 0;
            const conversions = campaign.stats?.conversions || 0;
            const spend = campaign.stats?.spend || 0;
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
            const conversionRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : 0;
            const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : 0;
            const budgetUsed = campaign.dailyBudget > 0 ? ((campaign.dailySpend?.amount || 0) / campaign.dailyBudget * 100).toFixed(0) : 0;

            return (
              <div key={campaign._id} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md border-2 border-gray-200 hover:border-primary-400 hover:shadow-xl transition-all duration-300 overflow-hidden">
                {/* Header Section - Amazon Style */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{campaign.name}</h3>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                          campaign.status === 'active' ? 'bg-green-500 text-white' :
                          campaign.status === 'pending_approval' ? 'bg-blue-500 text-white' :
                          campaign.status === 'approved' ? 'bg-green-500 text-white' :
                          campaign.status === 'rejected' ? 'bg-red-500 text-white' :
                          campaign.status === 'paused' ? 'bg-yellow-500 text-white' :
                          campaign.status === 'budget_exhausted' ? 'bg-red-600 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {campaign.status === 'active' ? '🟢 ACTIVE' :
                           campaign.status === 'paused' ? '⏸️ PAUSED' :
                           campaign.status === 'budget_exhausted' ? '💰 BUDGET EXHAUSTED' :
                           campaign.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-white text-sm">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                          </svg>
                          {campaign.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                          </svg>
                          {campaign.pricing} - Bid: {formatCurrency(campaign.bid)}
                        </span>
                        {campaign.placement && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                            </svg>
                            {campaign.placement.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.status === 'active' ? (
                        <button
                          onClick={() => pauseMutation.mutate(campaign._id)}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-colors backdrop-blur-sm border border-white/30"
                        >
                          ⏸️ Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => resumeMutation.mutate(campaign._id)}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-colors backdrop-blur-sm border border-white/30"
                        >
                          ▶️ Resume
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedCampaignForReport(campaign);
                          setReportModalOpen(true);
                        }}
                        className="px-4 py-2 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-md"
                      >
                        📊 Report
                      </button>
                    </div>
                  </div>
                </div>

                {/* Campaign Details - Amazon Style */}
                <div className="px-6 py-4 bg-white border-b border-gray-200">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-6">
                      {campaign.approval?.status && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Approval Status:</span>
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            campaign.approval.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-300' :
                            campaign.approval.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
                            'bg-yellow-100 text-yellow-800 border border-yellow-300'
                          }`}>
                            {campaign.approval.status === 'approved' ? '✅ APPROVED' :
                             campaign.approval.status === 'rejected' ? '❌ REJECTED' :
                             '🕐 PENDING REVIEW'}
                          </span>
                        </div>
                      )}
                      {campaign.qualityScore?.overall && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Quality Score:</span>
                          <div className="flex items-center gap-1">
                            <div className="flex">
                              {[...Array(10)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${i < campaign.qualityScore.overall ? 'text-yellow-400' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm font-bold text-purple-600">{campaign.qualityScore.overall}/10</span>
                          </div>
                        </div>
                      )}
                      {campaign.auctionScore && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Auction Score:</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold text-sm">
                            {campaign.auctionScore.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Daily Budget</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(campaign.dailyBudget)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Spent Today</p>
                        <p className={`text-lg font-bold ${budgetUsed > 90 ? 'text-red-600' : budgetUsed > 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {formatCurrency(campaign.dailySpend?.amount || 0)}
                          <span className="text-xs ml-1">({budgetUsed}%)</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  {campaign.approval?.rejectionReason && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        <strong className="font-bold">❌ Rejection Reason:</strong> {campaign.approval.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Performance Stats - Amazon Advertising Style */}
                <div className="px-6 py-5 bg-gradient-to-br from-gray-50 to-white">
                  <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                    </svg>
                    Campaign Performance Metrics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {/* Impressions */}
                    <div className="bg-white rounded-lg p-4 border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-blue-700 uppercase">Impressions</span>
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{impressions.toLocaleString()}</p>
                      <p className="text-xs text-gray-600 mt-1">Total views</p>
                    </div>

                    {/* Clicks */}
                    <div className="bg-white rounded-lg p-4 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-green-700 uppercase">Clicks</span>
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{clicks.toLocaleString()}</p>
                      <p className="text-xs text-gray-600 mt-1">User clicks</p>
                    </div>

                    {/* CTR */}
                    <div className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-purple-700 uppercase">CTR</span>
                        <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{ctr}%</p>
                      <p className="text-xs text-gray-600 mt-1">Click-through rate</p>
                    </div>

                    {/* Conversions */}
                    <div className="bg-white rounded-lg p-4 border-2 border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-yellow-700 uppercase">Conversions</span>
                        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{conversions}</p>
                      <p className="text-xs text-gray-600 mt-1">Sales generated</p>
                    </div>

                    {/* Conversion Rate */}
                    <div className="bg-white rounded-lg p-4 border-2 border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-indigo-700 uppercase">Conv. Rate</span>
                        <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
                      <p className="text-xs text-gray-600 mt-1">Click to sale</p>
                    </div>

                    {/* CPC */}
                    <div className="bg-white rounded-lg p-4 border-2 border-pink-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-pink-700 uppercase">Avg CPC</span>
                        <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(cpc)}</p>
                      <p className="text-xs text-gray-600 mt-1">Cost per click</p>
                    </div>

                    {/* Total Spend */}
                    <div className="bg-white rounded-lg p-4 border-2 border-red-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-red-700 uppercase">Total Spend</span>
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(spend)}</p>
                      <p className="text-xs text-gray-600 mt-1">Total ad spend</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isProcessingPayment}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isProcessingPayment}>
              Proceed to Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Campaign Report Modal */}
      {reportModalOpen && selectedCampaignForReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Report Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">📊 Campaign Performance Report</h2>
                <p className="text-white/90 text-sm">{selectedCampaignForReport.name}</p>
              </div>
              <button
                onClick={() => {
                  setReportModalOpen(false);
                  setSelectedCampaignForReport(null);
                }}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Campaign Overview */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                  </svg>
                  Campaign Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Campaign Type</p>
                    <p className="text-lg font-bold text-gray-900">{selectedCampaignForReport.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pricing Model</p>
                    <p className="text-lg font-bold text-gray-900">{selectedCampaignForReport.pricing}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Bid</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedCampaignForReport.bid)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                      selectedCampaignForReport.status === 'active' ? 'bg-green-500 text-white' :
                      selectedCampaignForReport.status === 'paused' ? 'bg-yellow-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {selectedCampaignForReport.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
                  </svg>
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-5 border-2 border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-700 uppercase">Impressions</span>
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{(selectedCampaignForReport.stats?.impressions || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border-2 border-green-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-green-700 uppercase">Clicks</span>
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{(selectedCampaignForReport.stats?.clicks || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border-2 border-yellow-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-yellow-700 uppercase">Conversions</span>
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
                      </svg>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{selectedCampaignForReport.stats?.conversions || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border-2 border-red-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-red-700 uppercase">Total Spend</span>
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(selectedCampaignForReport.stats?.spend || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Calculated Metrics */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                  </svg>
                  Calculated Metrics (Amazon-Style)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const impressions = selectedCampaignForReport.stats?.impressions || 0;
                    const clicks = selectedCampaignForReport.stats?.clicks || 0;
                    const conversions = selectedCampaignForReport.stats?.conversions || 0;
                    const spend = selectedCampaignForReport.stats?.spend || 0;
                    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
                    const conversionRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : 0;
                    const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : 0;
                    const cpa = conversions > 0 ? (spend / conversions).toFixed(2) : 0;
                    const roas = conversions > 0 && spend > 0 ? ((conversions * selectedCampaignForReport.bid * 10) / spend).toFixed(2) : 0;

                    return (
                      <>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <p className="text-sm text-purple-700 font-medium mb-1">CTR (Click-Through Rate)</p>
                          <p className="text-2xl font-bold text-purple-600">{ctr}%</p>
                          <p className="text-xs text-gray-600 mt-1">Industry avg: 0.5-2%</p>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                          <p className="text-sm text-indigo-700 font-medium mb-1">Conversion Rate</p>
                          <p className="text-2xl font-bold text-indigo-600">{conversionRate}%</p>
                          <p className="text-xs text-gray-600 mt-1">Clicks to sales</p>
                        </div>
                        <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                          <p className="text-sm text-pink-700 font-medium mb-1">Avg CPC</p>
                          <p className="text-2xl font-bold text-pink-600">{formatCurrency(cpc)}</p>
                          <p className="text-xs text-gray-600 mt-1">Cost per click</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <p className="text-sm text-orange-700 font-medium mb-1">CPA (Cost Per Acquisition)</p>
                          <p className="text-2xl font-bold text-orange-600">{formatCurrency(cpa)}</p>
                          <p className="text-xs text-gray-600 mt-1">Cost per sale</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Budget Information */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  Budget & Spending
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Daily Budget</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedCampaignForReport.dailyBudget)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Spent Today</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedCampaignForReport.dailySpend?.amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Budget Remaining</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedCampaignForReport.dailyBudget - (selectedCampaignForReport.dailySpend?.amount || 0))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setReportModalOpen(false);
                    setSelectedCampaignForReport(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placement (Page/Location)
              </label>
              <select
                value={campaignForm.placement}
                onChange={(e) => setCampaignForm({ ...campaignForm, placement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <optgroup label="Homepage">
                  <option value="homepage_banner">Homepage - Banner (Hero Section)</option>
                  <option value="homepage_top">Homepage - Top Section</option>
                  <option value="homepage_sidebar_left">Homepage - Left Sidebar</option>
                  <option value="homepage_sidebar_right">Homepage - Right Sidebar</option>
                  <option value="homepage_middle">Homepage - Middle Section</option>
                  <option value="homepage_bottom">Homepage - Bottom Section</option>
                </optgroup>
                <optgroup label="Search & Category">
                  <option value="search_sponsored_products">Search Results - Sponsored Products</option>
                  <option value="search_top">Search Results - Top Banner</option>
                  <option value="search_sidebar">Search Results - Sidebar</option>
                  <option value="category_top_banner">Category Page - Top Banner</option>
                  <option value="category_grid">Category Page - In Product Grid</option>
                  <option value="category_sidebar">Category Page - Sidebar</option>
                </optgroup>
                <optgroup label="Product Pages">
                  <option value="product_sidebar">Product Page - Sidebar</option>
                  <option value="product_top">Product Page - Top Banner</option>
                  <option value="product_bottom">Product Page - Bottom Banner</option>
                  <option value="product_related">Product Page - Related Products Section</option>
                </optgroup>
                <optgroup label="Cart & Checkout">
                  <option value="cart_sidebar">Cart Page - Sidebar</option>
                  <option value="cart_bottom">Cart Page - Bottom Banner</option>
                  <option value="checkout_top">Checkout Page - Top Banner</option>
                </optgroup>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                🎯 Select which page and section your ad will appear on
              </p>
            </div>

            {/* Banner Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banner Position
              </label>
              <select
                value={campaignForm.position}
                onChange={(e) => setCampaignForm({ ...campaignForm, position: e.target.value })}
                className="w-full px-5 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-3 border-blue-400 rounded-xl text-gray-900 font-semibold text-base shadow-md focus:ring-4 focus:ring-blue-300 focus:border-blue-600 hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer"
                style={{
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%232563eb'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '3rem'
                }}
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

            {/* Banner Size/Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banner Size/Type
              </label>
              <select
                value={campaignForm.bannerSize}
                onChange={(e) => setCampaignForm({ ...campaignForm, bannerSize: e.target.value })}
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

            {/* Custom Dimensions */}
            {campaignForm.bannerSize === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width (px) *
                  </label>
                  <input
                    type="number"
                    value={campaignForm.dimensions.width}
                    onChange={(e) => setCampaignForm({
                      ...campaignForm,
                      dimensions: { ...campaignForm.dimensions, width: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., 300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (px) *
                  </label>
                  <input
                    type="number"
                    value={campaignForm.dimensions.height}
                    onChange={(e) => setCampaignForm({
                      ...campaignForm,
                      dimensions: { ...campaignForm.dimensions, height: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., 250"
                    required
                  />
                </div>
              </div>
            )}

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

            {/* Pricing Guidelines */}
            {pricingSettings && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Bid Guidelines for {pricingSettings.displayName}</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium">Minimum Bid</p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(pricingSettings.minBid)}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Recommended Bid</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(pricingSettings.recommendedBid)}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Maximum Bid</p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(pricingSettings.maxBid)}</p>
                  </div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Minimum daily budget: {formatCurrency(pricingSettings.dailyBudgetMin)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label={`Bid Amount (₹) - ${campaignForm.pricing === 'CPC' ? 'per click' : 'per 1000 views'}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={campaignForm.bid}
                  onChange={(e) => setCampaignForm({ ...campaignForm, bid: e.target.value })}
                  required
                  placeholder={pricingSettings ? `${pricingSettings.minBid} - ${pricingSettings.maxBid}` : '0.00'}
                />
                {/* Bid Validation Feedback */}
                {(() => {
                  const recommendation = getBidRecommendation();
                  if (!recommendation) return null;

                  const colors = {
                    error: 'bg-red-50 border-red-200 text-red-800',
                    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                    success: 'bg-green-50 border-green-200 text-green-800',
                  };

                  return (
                    <div className={`mt-2 p-2 rounded border text-xs ${colors[recommendation.level]}`}>
                      {recommendation.message}
                    </div>
                  );
                })()}
              </div>

              <Input
                label="Daily Budget (₹)"
                type="number"
                step="0.01"
                min="0"
                value={campaignForm.dailyBudget}
                onChange={(e) => setCampaignForm({ ...campaignForm, dailyBudget: e.target.value })}
                required
                placeholder={pricingSettings ? `Minimum ₹${pricingSettings.dailyBudgetMin}` : 'Minimum ₹500'}
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