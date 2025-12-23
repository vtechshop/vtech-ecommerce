// FILE: apps/web/src/pages/dashboard/admin/Reviews.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { useToast } from '@/components/common/ToastContainer';
import { Star, Eye, Trash2, Check, X, MessageSquare, AlertCircle } from 'lucide-react';
import { formatDate } from '@/utils/format';

const Reviews = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    rating: '',
  });
  const [viewingReview, setViewingReview] = useState(null);
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');

  // Fetch reviews
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (filters.status) params.append('status', filters.status);
      if (filters.rating) params.append('rating', filters.rating);

      const response = await api.get(`/admin/reviews?${params}`);
      return response.data;
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }) => {
      await api.put(`/admin/reviews/${id}/status`, { status, rejectionReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review status updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update review status');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete review');
    },
  });

  // Respond mutation
  const respondMutation = useMutation({
    mutationFn: async ({ id, text }) => {
      await api.put(`/admin/reviews/${id}/respond`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Response added successfully!');
      setRespondingTo(null);
      setResponseText('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to add response');
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

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-700">({rating})</span>
      </div>
    );
  };

  const reviews = data?.data || [];
  const meta = data?.meta || {};
  const totalPages = Math.ceil((meta.total || 0) / (meta.limit || 20));

  // Count reviews by status
  const statusCounts = reviews.reduce((acc, review) => {
    acc[review.status] = (acc[review.status] || 0) + 1;
    return acc;
  }, {});

  // Calculate average rating
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Product Reviews</h1>
        <p className="text-gray-700 mt-2">Manage and moderate customer reviews</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Total Reviews</p>
              <p className="text-2xl font-bold">{meta.total || 0}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending || 0}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Approved</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.approved || 0}</p>
            </div>
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Avg Rating</p>
              <p className="text-2xl font-bold text-blue-600">{avgRating}</p>
            </div>
            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <CustomSelect
              value={filters.status}
              onChange={(value) => {
                setFilters({ ...filters, status: value });
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              placeholder="All Statuses"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <CustomSelect
              value={filters.rating}
              onChange={(value) => {
                setFilters({ ...filters, rating: value });
                setPage(1);
              }}
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
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ status: '', rating: '' });
                setPage(1);
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews found</h3>
          <p className="text-gray-700">There are no reviews matching your criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr key={review._id} className="hover:bg-blue-100">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {review.productId?.images?.[0] && (
                          <img
                            src={review.productId.images[0]}
                            alt={review.productId.title}
                            className="w-10 h-10 rounded object-cover mr-3"
                          />
                        )}
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {review.productId?.title || 'Unknown Product'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {review.userId?.firstName} {review.userId?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{review.userId?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStars(review.rating)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md">
                        {review.comment?.length > 100
                          ? `${review.comment.substring(0, 100)}...`
                          : review.comment}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(review.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(review.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingReview(review)}
                          className="text-blue-600 hover:text-primary-900"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {review.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(review._id, 'approved')}
                              className="text-green-600 hover:text-green-900"
                              title="Approve"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(review._id, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                              title="Reject"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(review._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* View Review Modal */}
      {viewingReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Review Details</h2>
                <button
                  onClick={() => setViewingReview(null)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Product Info */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Product</h3>
                <div className="flex items-center gap-3">
                  {viewingReview.productId?.images?.[0] && (
                    <img
                      src={viewingReview.productId.images[0]}
                      alt={viewingReview.productId.title}
                      className="w-16 h-16 rounded object-cover"
                    />
                  )}
                  <div>
                    <div className="font-medium">{viewingReview.productId?.title}</div>
                    <div className="text-sm text-gray-500">{viewingReview.productId?.slug}</div>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Customer</h3>
                <div>
                  <div className="font-medium">
                    {viewingReview.userId?.firstName} {viewingReview.userId?.lastName}
                  </div>
                  <div className="text-sm text-gray-500">{viewingReview.userId?.email}</div>
                </div>
              </div>

              {/* Rating */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Rating</h3>
                {renderStars(viewingReview.rating)}
              </div>

              {/* Comment */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Comment</h3>
                <p className="text-gray-900">{viewingReview.comment}</p>
              </div>

              {/* Status */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
                {getStatusBadge(viewingReview.status)}
                {viewingReview.rejectionReason && (
                  <div className="mt-2 text-sm text-red-600">
                    Rejection Reason: {viewingReview.rejectionReason}
                  </div>
                )}
              </div>

              {/* Vendor Response */}
              {viewingReview.vendorResponse?.text ? (
                <div className="mb-6 bg-blue-100 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Admin Response</h3>
                  <p className="text-gray-900">{viewingReview.vendorResponse.text}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDate(viewingReview.vendorResponse.respondedAt)}
                  </p>
                </div>
              ) : (
                respondingTo === viewingReview._id ? (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Add Response</h3>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Write your response..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => handleRespond(viewingReview._id)}>
                        Submit Response
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setRespondingTo(null);
                        setResponseText('');
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6">
                    <Button
                      variant="outline"
                      onClick={() => setRespondingTo(viewingReview._id)}
                    >
                      Add Response
                    </Button>
                  </div>
                )
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                {viewingReview.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => {
                        handleStatusChange(viewingReview._id, 'approved');
                        setViewingReview(null);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleStatusChange(viewingReview._id, 'rejected');
                        setViewingReview(null);
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    handleDelete(viewingReview._id);
                    setViewingReview(null);
                  }}
                  className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
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
