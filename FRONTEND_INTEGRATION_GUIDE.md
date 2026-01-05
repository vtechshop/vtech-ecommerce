# Frontend Integration Guide - V-Tech Kitchen

This guide shows you how to integrate the 12 newly implemented backend features into your React frontend.

---

## 📋 Table of Contents

1. [Loyalty Points System](#1-loyalty-points-system)
2. [Newsletter Subscription](#2-newsletter-subscription)
3. [GDPR Data Export & Deletion](#3-gdpr-data-export--deletion)
4. [Abandoned Cart Recovery](#4-abandoned-cart-recovery)
5. [PWA Installation Prompt](#5-pwa-installation-prompt)
6. [Admin Panels](#6-admin-panels)

---

## 1. Loyalty Points System

### Display Loyalty Points in Customer Dashboard

**File:** `apps/web/src/assets/pages/dashboard/customer/CustomerDashboard.jsx`

**Add this query after the existing queries (around line 26):**

```javascript
const { data: loyaltyAccount, isLoading: loyaltyLoading } = useQuery({
  queryKey: ['loyalty-account'],
  queryFn: async () => {
    const response = await api.get('/loyalty/account');
    return response.data.data;
  },
});
```

**Add this card in the stats grid (after line 50):**

```jsx
{/* Loyalty Points Card */}
<div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-4 sm:p-6 fade-in hover-lift text-white">
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-white text-sm font-medium">Loyalty Points</h3>
    <svg className="w-8 h-8 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  </div>
  <p className="text-3xl font-bold">{loyaltyAccount?.availablePoints || 0}</p>
  <div className="mt-2 flex items-center gap-2">
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white capitalize">
      {loyaltyAccount?.tier || 'bronze'} Tier
    </span>
    {loyaltyAccount?.tierProgress && (
      <span className="text-xs text-white/80">
        {loyaltyAccount.tierProgress.currentTierPoints}/{loyaltyAccount.tierProgress.nextTierPoints} to {loyaltyAccount.tierProgress.nextTier}
      </span>
    )}
  </div>
</div>
```

### Create Loyalty Page

**Create new file:** `apps/web/src/assets/pages/dashboard/customer/Loyalty.jsx`

```jsx
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import { formatDate } from '@/utils/format';

const Loyalty = () => {
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['loyalty-account'],
    queryFn: async () => {
      const response = await api.get('/loyalty/account');
      return response.data.data;
    },
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['loyalty-transactions'],
    queryFn: async () => {
      const response = await api.get('/loyalty/transactions?limit=50');
      return response.data.data;
    },
  });

  const tierColors = {
    bronze: 'bg-orange-100 text-orange-800 border-orange-200',
    silver: 'bg-gray-100 text-gray-800 border-gray-200',
    gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    platinum: 'bg-blue-100 text-blue-800 border-blue-200',
    diamond: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  if (accountLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Loyalty Rewards</h1>

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Available Points</h3>
          <p className="text-4xl font-bold text-purple-600">{account?.availablePoints || 0}</p>
          <p className="text-sm text-gray-500 mt-2">Worth ₹{account?.availablePoints || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Lifetime Points</h3>
          <p className="text-4xl font-bold text-blue-600">{account?.lifetimePoints || 0}</p>
          <p className="text-sm text-gray-500 mt-2">Total earned</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Current Tier</h3>
          <span className={`inline-flex items-center px-4 py-2 rounded-lg text-lg font-semibold border-2 capitalize ${tierColors[account?.tier] || tierColors.bronze}`}>
            {account?.tier || 'bronze'}
          </span>
          {account?.tierProgress && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{account.tierProgress.currentTierPoints} points</span>
                <span>{account.tierProgress.nextTierPoints} to {account.tierProgress.nextTier}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(account.tierProgress.currentTierPoints / account.tierProgress.nextTierPoints) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* How to Earn Points */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">How to Earn Points</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl mb-2">🛒</div>
            <h3 className="font-semibold mb-1">Shop</h3>
            <p className="text-sm text-gray-600">Earn 1 point per ₹1 spent</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl mb-2">⭐</div>
            <h3 className="font-semibold mb-1">Review</h3>
            <p className="text-sm text-gray-600">Get 50 points for each review</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl mb-2">🎁</div>
            <h3 className="font-semibold mb-1">Refer Friends</h3>
            <p className="text-sm text-gray-600">Earn 200 points per referral</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="text-3xl mb-2">🎂</div>
            <h3 className="font-semibold mb-1">Birthday Bonus</h3>
            <p className="text-sm text-gray-600">Get 500 points on your birthday</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Transaction History</h2>
        {transactionsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Points</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{formatDate(txn.createdAt)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        txn.type === 'earned' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {txn.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{txn.description}</td>
                    <td className={`py-3 px-4 text-sm font-semibold text-right ${
                      txn.type === 'earned' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {txn.type === 'earned' ? '+' : '-'}{txn.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No transactions yet. Start earning points!</p>
        )}
      </div>
    </div>
  );
};

export default Loyalty;
```

**Add route:** In your router configuration, add:
```jsx
<Route path="/dashboard/loyalty" element={<Loyalty />} />
```

---

## 2. Newsletter Subscription

### Footer Newsletter Form

**File:** `apps/web/src/components/layout/Footer.jsx`

**Add this component:**

```jsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/utils/api';

const NewsletterSubscribe = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);

  const subscribeMutation = useMutation({
    mutationFn: async (email) => {
      const response = await api.post('/newsletter/subscribe', { email });
      return response.data;
    },
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Successfully subscribed! Check your email.' });
      setEmail('');
      setTimeout(() => setMessage(null), 5000);
    },
    onError: (error) => {
      setMessage({
        type: 'error',
        text: error.response?.data?.error?.message || 'Subscription failed. Please try again.'
      });
      setTimeout(() => setMessage(null), 5000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      subscribeMutation.mutate(email);
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">Subscribe to Our Newsletter</h3>
      <p className="text-gray-400 text-sm mb-4">
        Get the latest updates on new products and upcoming sales
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          required
        />
        <button
          type="submit"
          disabled={subscribeMutation.isPending}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {message && (
        <p className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
};

// Use <NewsletterSubscribe /> in your footer
```

---

## 3. GDPR Data Export & Deletion

### Add to Settings Page

**File:** `apps/web/src/assets/pages/dashboard/customer/Settings.jsx`

**Add this section:**

```jsx
import { useMutation } from '@tanstack/react-query';
import api from '@/utils/api';

const GDPRSection = () => {
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get('/gdpr/export');
      return response.data;
    },
    onSuccess: (data) => {
      // Create a blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_data_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('Your data has been downloaded successfully!');
    },
    onError: () => {
      alert('Failed to export data. Please try again.');
    },
  });

  const requestDeletionMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/gdpr/request-deletion');
      return response.data;
    },
    onSuccess: (data) => {
      alert(`Account deletion scheduled for ${new Date(data.data.scheduledDeletionDate).toLocaleDateString()}. You have 30 days to cancel.`);
    },
    onError: () => {
      alert('Failed to request deletion. Please try again.');
    },
  });

  const handleExportData = () => {
    if (confirm('Export all your personal data? This may take a moment.')) {
      exportDataMutation.mutate();
    }
  };

  const handleRequestDeletion = () => {
    if (confirm('Are you sure you want to delete your account? This action can be cancelled within 30 days.')) {
      requestDeletionMutation.mutate();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Privacy & Data</h2>

      <div className="space-y-4">
        <div className="border-b pb-4">
          <h3 className="font-semibold mb-2">Export Your Data</h3>
          <p className="text-sm text-gray-600 mb-3">
            Download a copy of all your personal data stored in our system.
          </p>
          <button
            onClick={handleExportData}
            disabled={exportDataMutation.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
          >
            {exportDataMutation.isPending ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        <div>
          <h3 className="font-semibold mb-2 text-red-600">Delete Your Account</h3>
          <p className="text-sm text-gray-600 mb-3">
            Request permanent deletion of your account and all associated data. You will have 30 days to cancel this request.
          </p>
          <button
            onClick={handleRequestDeletion}
            disabled={requestDeletionMutation.isPending}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg transition-colors"
          >
            {requestDeletionMutation.isPending ? 'Requesting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add <GDPRSection /> to your Settings component
```

---

## 4. Abandoned Cart Recovery

### Track Cart Activity

**File:** `apps/web/src/utils/api.js` or create a cart hook

**Add this utility:**

```javascript
// Track cart abandonment
export const trackCartActivity = async (cart, userEmail) => {
  try {
    // This would be called from your cart service
    await api.post('/cart/track-abandoned', {
      cart,
      email: userEmail,
    });
  } catch (error) {
    console.error('Failed to track cart:', error);
  }
};
```

**Call this when:**
- User adds items to cart
- User updates cart
- User navigates away from checkout without completing

---

## 5. PWA Installation Prompt

### Add Install Button

**Create:** `apps/web/src/components/common/PWAInstallPrompt.jsx`

```jsx
import { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Don't show if dismissed in last 7 days
  const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
  if (lastDismissed && Date.now() - parseInt(lastDismissed) < 7 * 24 * 60 * 60 * 1000) {
    return null;
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 p-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
      <div className="flex items-start gap-3">
        <div className="bg-blue-100 rounded-full p-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Install V-Tech Kitchen</h3>
          <p className="text-sm text-gray-600 mb-3">
            Install our app for faster access and offline browsing!
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
```

**Add to your main layout:**
```jsx
import PWAInstallPrompt from '@/components/common/PWAInstallPrompt';

// In your Layout component
<PWAInstallPrompt />
```

---

## 6. Admin Panels

### Newsletter Admin Panel

**Create:** `apps/web/src/assets/pages/dashboard/admin/Newsletter.jsx`

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';
import { formatDate } from '@/utils/format';
import { useState } from 'react';

const Newsletter = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('subscribers');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: async () => {
      const response = await api.get('/newsletter/admin/statistics');
      return response.data.data;
    },
  });

  const { data: subscribers, isLoading: subscribersLoading } = useQuery({
    queryKey: ['newsletter-subscribers'],
    queryFn: async () => {
      const response = await api.get('/newsletter/admin/subscribers');
      return response.data.data;
    },
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['newsletter-campaigns'],
    queryFn: async () => {
      const response = await api.get('/newsletter/admin/campaigns');
      return response.data.data;
    },
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: async (subscriberId) => {
      await api.delete(`/newsletter/admin/subscribers/${subscriberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['newsletter-subscribers']);
      queryClient.invalidateQueries(['newsletter-stats']);
    },
  });

  if (statsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Newsletter Management</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Subscribers</h3>
          <p className="text-3xl font-bold text-blue-600">{stats?.totalSubscribers || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Active</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.activeSubscribers || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Campaigns</h3>
          <p className="text-3xl font-bold text-purple-600">{stats?.totalCampaigns || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">This Month</h3>
          <p className="text-3xl font-bold text-orange-600">{stats?.subscribersThisMonth || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('subscribers')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'subscribers'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Subscribers ({subscribers?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'campaigns'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Campaigns ({campaigns?.length || 0})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'subscribers' && (
            <div>
              {subscribersLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : subscribers && subscribers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Subscribed</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((subscriber) => (
                        <tr key={subscriber._id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm">{subscriber.email}</td>
                          <td className="py-3 px-4 text-sm">{subscriber.name || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              subscriber.status === 'subscribed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {subscriber.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">{formatDate(subscriber.createdAt)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                if (confirm('Delete this subscriber?')) {
                                  deleteSubscriberMutation.mutate(subscriber._id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No subscribers yet</p>
              )}
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div>
              {campaignsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : campaigns && campaigns.length > 0 ? (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign._id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{campaign.subject}</h3>
                          <p className="text-sm text-gray-600 mt-1">{campaign.content?.substring(0, 150)}...</p>
                          <div className="flex gap-4 mt-3 text-sm text-gray-500">
                            <span>Sent to: {campaign.recipientCount || 0}</span>
                            <span>Status: {campaign.status}</span>
                            <span>Created: {formatDate(campaign.createdAt)}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          campaign.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : campaign.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No campaigns yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Newsletter;
```

### Loyalty Admin Panel

**Create:** `apps/web/src/assets/pages/dashboard/admin/LoyaltyManagement.jsx`

```jsx
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import Spinner from '@/components/common/Spinner';

const LoyaltyManagement = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['loyalty-stats'],
    queryFn: async () => {
      const response = await api.get('/loyalty/statistics');
      return response.data.data;
    },
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['loyalty-users'],
    queryFn: async () => {
      const response = await api.get('/loyalty/admin/users?limit=50');
      return response.data.data;
    },
  });

  if (statsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Loyalty Program Management</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Points Issued</h3>
          <p className="text-3xl font-bold text-purple-600">{stats?.totalPointsIssued?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Points Redeemed</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.totalPointsRedeemed?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Active Members</h3>
          <p className="text-3xl font-bold text-blue-600">{stats?.activeMembers?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Redemption Rate</h3>
          <p className="text-3xl font-bold text-orange-600">{stats?.redemptionRate || 0}%</p>
        </div>
      </div>

      {/* Tier Distribution */}
      {stats?.tierDistribution && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Tier Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.tierDistribution).map(([tier, count]) => (
              <div key={tier} className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold capitalize">{tier}</p>
                <p className="text-gray-600">{count} users</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Users */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Top Loyalty Members</h2>
        {usersLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : users && users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Tier</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Available Points</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Lifetime Points</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{user.user?.name || user.user?.email || 'Unknown'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize bg-purple-100 text-purple-800">
                        {user.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold">{user.availablePoints?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-right">{user.lifetimePoints?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No loyalty members yet</p>
        )}
      </div>
    </div>
  );
};

export default LoyaltyManagement;
```

---

## 🚀 Next Steps

1. **Add Routes:** Add all new pages to your React Router configuration
2. **Update Navigation:** Add links to Loyalty and Newsletter pages in your dashboard sidebar
3. **Test Features:** Test each integration with real data
4. **Style Adjustments:** Customize colors and styles to match your brand
5. **Mobile Testing:** Ensure all components are responsive
6. **PWA Icons:** Generate and add PWA icons (see IMPLEMENTATION_SUMMARY.md)

---

## 📚 API Endpoints Reference

### Loyalty
- `GET /api/loyalty/account` - Get user's loyalty account
- `GET /api/loyalty/transactions` - Get transaction history
- `POST /api/loyalty/redeem` - Redeem points at checkout
- `GET /api/loyalty/statistics` - Admin statistics
- `GET /api/loyalty/admin/users` - Admin user list

### Newsletter
- `POST /api/newsletter/subscribe` - Subscribe
- `GET /api/newsletter/admin/subscribers` - List subscribers (admin)
- `GET /api/newsletter/admin/statistics` - Stats (admin)

### GDPR
- `GET /api/gdpr/export` - Export user data
- `POST /api/gdpr/request-deletion` - Request account deletion
- `POST /api/gdpr/cancel-deletion` - Cancel deletion request

---

**Note:** All components use TanStack Query (React Query) for data fetching. Make sure you have `@tanstack/react-query` installed and QueryClient configured in your app.

**Happy Integration!** 🎉
