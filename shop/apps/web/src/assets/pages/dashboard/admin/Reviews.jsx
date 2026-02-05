// FILE: apps/web/src/pages/dashboard/admin/Reviews.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { useToast } from '@/components/common/ToastContainer';
import {
  Star, Eye, Trash2, Check, X, MessageSquare, AlertCircle, Search,
  RefreshCw, Download, ThumbsUp, ThumbsDown, Shield, TrendingUp,
  BarChart3, Reply, Filter, MoreVertical, Clock, CheckCircle
} from 'lucide-react';
import { formatDate } from '@/utils/format';
import { formatRelativeTime } from '@/utils/dateHelpers';

// Response templates
const RESPONSE_TEMPLATES = [
  { id: 'thanks', label: 'Thank You', text: 'Thank you for taking the time to share your feedback. We greatly appreciate your review and are glad you had a positive experience with our product.' },
  { id: 'sorry', label: 'Apology', text: 'We sincerely apologize for any inconvenience you experienced. Your feedback is valuable to us, and we are committed to improving our products and services.' },
  { id: 'contact', label: 'Contact Us', text: 'Thank you for your feedback. We would love to learn more about your experience. Please contact our customer support team so we can assist you further.' },
  { id: 'resolved', label: 'Issue Resolved', text: 'We appreciate your patience. The issue you reported has been addressed. Please feel free to reach out if you need any further assistance.' },
];

const Reviews = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    rating: '',
    search: '',
    verified: '',
    hasResponse: '',
  });
  const [viewingReview, setViewingReview] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  // Fetch reviews
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-reviews', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (filters.status) params.append('status', filters.status);
      if (filters.rating) params.append('rating', filters.rating);
      if (filters.search) params.append('search', filters.search);
      if (filters.verified) params.append('verified', filters.verified);
      if (filters.hasResponse) params.append('hasResponse', filters.hasResponse);

      const response = await api.get(`/admin/reviews?${params}`);
      return response.data;
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['admin-reviews-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/reviews/stats');
      return response.data.data;
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }) => {
      await api.put(`/admin/reviews/${id}/status`, { status, rejectionReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reviews-stats'] });
      toast.success('Review status updated!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update status');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reviews-stats'] });
      toast.success('Review deleted!');
    },
  });

  // Respond mutation
  const respondMutation = useMutation({
    mutationFn: async ({ id, text }) => {
      await api.put(`/admin/reviews/${id}/respond`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reviews-stats'] });
      toast.success('Response added!');
      setResponseText('');
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }) => {
      await api.post('/admin/reviews/bulk-update', { ids, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reviews-stats'] });
      setSelectedItems([]);
      toast.success('Bulk update successful!');
    },
  });

  const handleStatusChange = (id, status) => {
    let rejectionReason = null;
    if (status === 'rejected') {
      rejectionReason = prompt('Please provide a reason for rejection:');
      if (!rejectionReason) return;
    }
    updateStatusMutation.mutate({ id, status, rejectionReason });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this review?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleRespond = (id) => {
    if (responseText.trim().length < 10) {
      toast.error('Response must be at least 10 characters');
      return;
    }
    respondMutation.mutate({ id, text: responseText });
  };

  const handleBulkAction = (status) => {
    if (selectedItems.length === 0) {
      toast.error('Please select reviews first');
      return;
    }
    if (status === 'delete') {
      if (!confirm(`Delete ${selectedItems.length} reviews?`)) return;
    }
    bulkUpdateMutation.mutate({ ids: selectedItems, status });
  };

  const handleExportCSV = () => {
    const reviews = data?.data || [];
    const csvData = [
      ['Date', 'Product', 'Customer', 'Rating', 'Comment', 'Status', 'Verified', 'Helpful'].join(','),
      ...reviews.map(r => [
        new Date(r.createdAt).toLocaleDateString(),
        `"${r.productId?.title || 'Unknown'}"`,
        `"${r.userId?.firstName || ''} ${r.userId?.lastName || ''}"`,
        r.rating,
        `"${(r.comment || '').substring(0, 100).replace(/"/g, '""')}"`,
        r.status,
        r.verified ? 'Yes' : 'No',
        r.helpfulCount || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reviews-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Exported successfully!');
  };

  const toggleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const reviews = data?.data || [];
    if (selectedItems.length === reviews.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(reviews.map(r => r._id));
    }
  };

  const renderStars = (rating, size = 'sm') => {
    const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-700">({rating})</span>
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: X },
    };
    const style = styles[status] || styles.pending;
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Calculate rating distribution bar widths
  const getRatingBarWidth = (count, total) => {
    if (!total || total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const reviews = data?.data || [];
  const meta = data?.meta || {};
  const totalPages = Math.ceil((meta.total || 0) / (meta.limit || 20));
  const stats = statsData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Reviews</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and moderate customer reviews</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating Overview Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Rating Overview</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="text-5xl font-bold">{stats.avgRating?.toFixed(1) || '0.0'}</div>
            <div>
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} className={`w-5 h-5 ${star <= Math.round(stats.avgRating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                ))}
              </div>
              <p className="text-sm text-gray-400">{stats.total || 0} total reviews</p>
            </div>
          </div>
          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-xs w-8">{rating} star</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${rating >= 4 ? 'bg-green-500' : rating === 3 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${getRatingBarWidth(stats.ratingDistribution?.[rating] || 0, stats.total)}%` }}
                  />
                </div>
                <span className="text-xs w-8 text-right">{stats.ratingDistribution?.[rating] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reviews</p>
                <p className="text-2xl font-bold">{stats.total || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-purple-600">{stats.verified || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Insights Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Review Insights
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Response Rate</span>
              <span className="text-lg font-semibold text-green-600">{stats.responseRate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Helpful Votes</span>
              <span className="text-lg font-semibold">{stats.totalHelpful || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">This Week</span>
              <span className="text-lg font-semibold text-blue-600">{stats.thisWeek || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Positive (4-5 stars)</span>
              <span className="text-lg font-semibold text-green-600">
                {stats.total > 0 ? Math.round(((stats.ratingDistribution?.[5] || 0) + (stats.ratingDistribution?.[4] || 0)) / stats.total * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by product, customer, or comment..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <CustomSelect
            value={filters.status}
            onChange={(value) => { setFilters({ ...filters, status: value }); setPage(1); }}
            options={[
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            placeholder="All Status"
          />

          <CustomSelect
            value={filters.rating}
            onChange={(value) => { setFilters({ ...filters, rating: value }); setPage(1); }}
            options={[
              { value: '', label: 'All Ratings' },
              { value: '5', label: '5 Stars' },
              { value: '4', label: '4 Stars' },
              { value: '3', label: '3 Stars' },
              { value: '2', label: '2 Stars' },
              { value: '1', label: '1 Star' },
            ]}
            placeholder="All Ratings"
          />

          <CustomSelect
            value={filters.verified}
            onChange={(value) => { setFilters({ ...filters, verified: value }); setPage(1); }}
            options={[
              { value: '', label: 'All Reviews' },
              { value: 'true', label: 'Verified Only' },
              { value: 'false', label: 'Unverified' },
            ]}
            placeholder="Verified Status"
          />

          <button
            onClick={() => {
              setFilters({ status: '', rating: '', search: '', verified: '', hasResponse: '' });
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4">
            <span className="text-sm text-gray-600">{selectedItems.length} selected</span>
            <button
              onClick={() => handleBulkAction('approved')}
              className="px-3 py-1.5 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-lg"
            >
              Approve All
            </button>
            <button
              onClick={() => handleBulkAction('rejected')}
              className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg"
            >
              Reject All
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"
            >
              Delete All
            </button>
          </div>
        )}
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No reviews found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === reviews.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Rating</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Comment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reviews.map((review) => (
                    <tr key={review._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(review._id)}
                          onChange={() => toggleSelectItem(review._id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {review.productId?.images?.[0] ? (
                            <img
                              src={review.productId.images[0]}
                              alt={review.productId.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                              <MessageSquare className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="max-w-xs">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {review.productId?.title || 'Unknown Product'}
                            </p>
                            {review.verified && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                <Shield className="w-3 h-3" />
                                Verified Purchase
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {review.userId?.firstName} {review.userId?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{review.userId?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          {renderStars(review.rating)}
                          {(review.helpfulCount > 0 || review.unhelpfulCount > 0) && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-0.5">
                                <ThumbsUp className="w-3 h-3" /> {review.helpfulCount || 0}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <ThumbsDown className="w-3 h-3" /> {review.unhelpfulCount || 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm text-gray-900 truncate">
                          {review.comment?.length > 80 ? `${review.comment.substring(0, 80)}...` : review.comment}
                        </p>
                        {review.vendorResponse?.text && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1">
                            <Reply className="w-3 h-3" /> Responded
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(review.status)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{formatRelativeTime(review.createdAt)}</p>
                        <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingReview(review)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {review.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(review._id, 'approved')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(review._id, 'rejected')}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(review._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="border-t border-gray-200 px-6 py-4">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* View Review Modal */}
      {viewingReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Review Details</h2>
                  <p className="text-gray-300 text-sm mt-1">ID: {viewingReview._id.slice(-8)}</p>
                </div>
                <button onClick={() => setViewingReview(null)} className="text-gray-300 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status & Rating */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusBadge(viewingReview.status)}
                  {viewingReview.verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <Shield className="w-3 h-3" />
                      Verified Purchase
                    </span>
                  )}
                </div>
                {renderStars(viewingReview.rating, 'lg')}
              </div>

              {/* Product Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Product</label>
                <div className="flex items-center gap-3">
                  {viewingReview.productId?.images?.[0] && (
                    <img
                      src={viewingReview.productId.images[0]}
                      alt={viewingReview.productId.title}
                      className="w-16 h-16 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{viewingReview.productId?.title || 'Unknown Product'}</p>
                    <p className="text-sm text-gray-500">{viewingReview.productId?.slug}</p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Customer</label>
                  <p className="font-medium text-gray-900">
                    {viewingReview.userId?.firstName} {viewingReview.userId?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{viewingReview.userId?.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Helpful Votes</label>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 text-green-600">
                      <ThumbsUp className="w-4 h-4" /> {viewingReview.helpfulCount || 0}
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <ThumbsDown className="w-4 h-4" /> {viewingReview.unhelpfulCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Title */}
              {viewingReview.title && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Title</label>
                  <p className="text-lg font-medium text-gray-900 mt-1">{viewingReview.title}</p>
                </div>
              )}

              {/* Comment */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Comment</label>
                <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-gray-900 whitespace-pre-wrap">{viewingReview.comment}</p>
                </div>
              </div>

              {/* Review Images */}
              {viewingReview.images && viewingReview.images.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Customer Photos</label>
                  <div className="flex gap-2 mt-2">
                    {viewingReview.images.map((img, idx) => (
                      <img key={idx} src={img} alt={`Review ${idx + 1}`} className="w-20 h-20 rounded object-cover" />
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {viewingReview.rejectionReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <label className="text-xs font-medium text-red-700 uppercase">Rejection Reason</label>
                  <p className="text-red-800 mt-1">{viewingReview.rejectionReason}</p>
                </div>
              )}

              {/* Vendor Response */}
              {viewingReview.vendorResponse?.text ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-green-700 uppercase">Admin Response</label>
                    <span className="text-xs text-gray-500">{formatDate(viewingReview.vendorResponse.respondedAt)}</span>
                  </div>
                  <p className="text-gray-900">{viewingReview.vendorResponse.text}</p>
                </div>
              ) : (
                <div className="border-t pt-4">
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Add Response</label>

                  {/* Quick Templates */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {RESPONSE_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setResponseText(template.text)}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full"
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Write your response to this review..."
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex justify-end mt-2">
                    <Button onClick={() => handleRespond(viewingReview._id)} loading={respondMutation.isPending}>
                      <Reply className="w-4 h-4 mr-2" />
                      Submit Response
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex gap-2">
                  {viewingReview.status === 'pending' && (
                    <>
                      <Button onClick={() => { handleStatusChange(viewingReview._id, 'approved'); setViewingReview(null); }}>
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="outline" onClick={() => { handleStatusChange(viewingReview._id, 'rejected'); setViewingReview(null); }}>
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => { handleDelete(viewingReview._id); setViewingReview(null); }}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;
