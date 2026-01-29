// FILE: apps/web/src/pages/ReferralProgram.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, Gift, Users, TrendingUp, Share2, Mail, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/common/ToastContainer';
import useAuth from '@/hooks/useAuth';
import api from '@/utils/api';
import { formatCurrency } from '@/utils/format';
import Spinner from '@/components/common/Spinner';

const ReferralProgram = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');

  // Fetch user's referral program
  const { data: referralData, isLoading } = useQuery({
    queryKey: ['my-referral-program'],
    queryFn: async () => {
      const { data } = await api.get('/referrals/my-program');
      return data.data;
    },
    enabled: isAuthenticated,
  });

  // Fetch leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ['referral-leaderboard'],
    queryFn: async () => {
      const { data } = await api.get('/referrals/leaderboard?limit=10');
      return data.data;
    },
  });

  // Apply referral code mutation
  const applyMutation = useMutation({
    mutationFn: async (code) => {
      const { data } = await api.post('/referrals/apply', { referralCode: code });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setReferralCodeInput('');
      queryClient.invalidateQueries(['my-referral-program']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to apply referral code');
    },
  });

  const referralLink = referralData
    ? `${window.location.origin}/register?ref=${referralData.referralCode}`
    : '';

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleShare = (platform) => {
    const text = `Join V-Tech using my referral code ${referralData.referralCode} and get ₹${(referralData.refereeReward / 100).toFixed(2)} off your first purchase!`;
    const url = referralLink;

    let shareUrl = '';

    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent('Join V-Tech!')}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const handleApplyCode = (e) => {
    e.preventDefault();
    if (referralCodeInput.trim()) {
      applyMutation.mutate(referralCodeInput.trim());
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <Gift className="w-16 h-16 mx-auto text-blue-600 dark:text-primary-400 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Referral Program
          </h1>
          <p className="text-gray-700 dark:text-gray-400 mb-8">
            Please log in to access your referral program and start earning rewards!
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-12">
        <div className="flex justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Gift className="w-16 h-16 mx-auto text-blue-600 dark:text-primary-400 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Referral Program
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-400 max-w-2xl mx-auto">
            Share your referral code with friends and earn ₹{(referralData.referrerReward / 100).toFixed(2)} for each friend who makes their first purchase!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {referralData.stats.totalReferrals}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-400">Total Referrals</div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {referralData.stats.successfulReferrals}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-400">Successful</div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <Gift className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(referralData.stats.totalEarnings)}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-400">Total Earnings</div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <TrendingUp className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {referralData.stats.conversionRate}%
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-400">Conversion Rate</div>
          </div>
        </div>

        {/* Your Referral Code */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-8 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Your Referral Code</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-lg p-4 text-2xl font-mono font-bold tracking-wider">
              {referralData.referralCode}
            </div>
            <button
              onClick={() => handleCopy(referralData.referralCode)}
              className="px-6 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold flex items-center gap-2"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="border-t border-white/20 pt-6">
            <h3 className="text-lg font-semibold mb-3">Share your referral link:</h3>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 text-sm font-mono"
              />
              <button
                onClick={() => handleCopy(referralLink)}
                className="px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleShare('whatsapp')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={() => handleShare('facebook')}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Facebook
              </button>
              <button
                onClick={() => handleShare('twitter')}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Twitter
              </button>
              <button
                onClick={() => handleShare('email')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Referred Users */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Your Referrals ({referralData.referredUsers.length})
            </h2>

            {referralData.referredUsers.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {referralData.referredUsers.map((ref) => (
                  <div
                    key={ref._id}
                    className="flex items-center justify-between p-3 bg-blue-100 dark:bg-gray-900 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {ref.userId?.name || 'Anonymous'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Joined: {new Date(ref.signupDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      {ref.hasCompletedFirstPurchase ? (
                        <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
                          ✓ Purchased
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-semibold">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No referrals yet. Start sharing your code!</p>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Top Referrers
            </h2>

            {leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className="flex items-center gap-4 p-3 bg-blue-100 dark:bg-gray-900 rounded-lg"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        entry.rank === 1
                          ? 'bg-yellow-400 text-yellow-900'
                          : entry.rank === 2
                          ? 'bg-gray-300 text-gray-700'
                          : entry.rank === 3
                          ? 'bg-orange-400 text-orange-900'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {entry.rank}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {entry.userName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {entry.successfulReferrals} successful referrals
                      </div>
                    </div>
                    <div className="text-right font-semibold text-blue-600 dark:text-primary-400">
                      {formatCurrency(entry.totalEarnings)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No data available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Apply Referral Code (if user hasn't used one yet) */}
        {!user.referredBy && (
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Have a referral code?
            </h3>
            <form onSubmit={handleApplyCode} className="flex gap-3">
              <input
                type="text"
                value={referralCodeInput}
                onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter referral code"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-900 dark:text-gray-100"
                maxLength={10}
              />
              <button
                type="submit"
                disabled={applyMutation.isPending || !referralCodeInput.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {applyMutation.isPending ? 'Applying...' : 'Apply'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralProgram;
