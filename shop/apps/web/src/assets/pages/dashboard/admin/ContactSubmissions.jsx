// FILE: apps/web/src/pages/dashboard/admin/ContactSubmissions.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { useToast } from '@/components/common/ToastContainer';
import { Mail, MessageSquare, Eye, Trash2, Check, X, AlertCircle, Search } from 'lucide-react';
import { formatDate } from '@/utils/format';
import NewBadge from '@/components/common/NewBadge';
import { getNewItemClasses, formatRelativeTime } from '@/utils/dateHelpers';

const ContactSubmissions = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('new'); // new, read, replied, resolved, spam
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [updatingNotes, setUpdatingNotes] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch contact submissions
  const { data, isLoading } = useQuery({
    queryKey: ['admin-contact-submissions', page, activeTab, filters.search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      // Use activeTab for status filter
      params.append('status', activeTab);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/admin/contact-submissions?${params}`);
      return response.data;
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await api.put(`/admin/contact-submissions/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-submissions'] });
    },
  });

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, adminNotes }) => {
      await api.put(`/admin/contact-submissions/${id}/notes`, { adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-submissions'] });
      setUpdatingNotes(null);
      setAdminNotes('');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/contact-submissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-submissions'] });
      toast.success('Submission deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete submission');
    },
  });

  const handleStatusChange = (id, status) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this submission?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSaveNotes = (id) => {
    updateNotesMutation.mutate({ id, adminNotes });
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-primary-100 text-primary-800',
      read: 'bg-gray-100 text-gray-900',
      replied: 'bg-green-100 text-green-800',
      resolved: 'bg-secondary-100 text-secondary-800',
      spam: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.new}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const submissions = data?.data || [];
  const meta = data?.meta || {};
  const totalPages = Math.ceil((meta.total || 0) / (meta.limit || 20));

  // Count submissions by status
  const statusCounts = submissions.reduce((acc, sub) => {
    acc[sub.status] = (acc[sub.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Contact Submissions</h1>
        <p className="text-gray-700 mt-2">Manage contact form submissions from customers</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Total</p>
              <p className="text-2xl font-bold">{meta.total || 0}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">New</p>
              <p className="text-2xl font-bold text-blue-600">{statusCounts.new || 0}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Replied</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.replied || 0}</p>
            </div>
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Resolved</p>
              <p className="text-2xl font-bold text-secondary-600">{statusCounts.resolved || 0}</p>
            </div>
            <Check className="w-8 h-8 text-secondary-600" />
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 min-w-fit px-6 py-4 font-medium text-sm transition-colors relative ${
              activeTab === 'new'
                ? 'text-blue-600 bg-primary-50 border-b-2 border-primary-600'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            New
            {statusCounts.new > 0 && <span className="ml-2 px-2 py-0.5 bg-primary-100 text-blue-700 rounded-full text-xs">{statusCounts.new}</span>}
          </button>
          <button
            onClick={() => setActiveTab('read')}
            className={`flex-1 min-w-fit px-6 py-4 font-medium text-sm transition-colors relative ${
              activeTab === 'read'
                ? 'text-gray-700 bg-gray-100 border-b-2 border-gray-600'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Read
            {statusCounts.read > 0 && <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">{statusCounts.read}</span>}
          </button>
          <button
            onClick={() => setActiveTab('replied')}
            className={`flex-1 min-w-fit px-6 py-4 font-medium text-sm transition-colors relative ${
              activeTab === 'replied'
                ? 'text-green-600 bg-green-50 border-b-2 border-green-600'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Replied
            {statusCounts.replied > 0 && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{statusCounts.replied}</span>}
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex-1 min-w-fit px-6 py-4 font-medium text-sm transition-colors relative ${
              activeTab === 'resolved'
                ? 'text-secondary-600 bg-secondary-50 border-b-2 border-secondary-600'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Resolved
            {statusCounts.resolved > 0 && <span className="ml-2 px-2 py-0.5 bg-secondary-100 text-secondary-700 rounded-full text-xs">{statusCounts.resolved}</span>}
          </button>
          <button
            onClick={() => setActiveTab('spam')}
            className={`flex-1 min-w-fit px-6 py-4 font-medium text-sm transition-colors relative ${
              activeTab === 'spam'
                ? 'text-red-600 bg-red-50 border-b-2 border-red-600'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Spam
            {statusCounts.spam > 0 && <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">{statusCounts.spam}</span>}
          </button>
        </div>

        {/* Search Filter */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by name, email, or subject..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No contact submissions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {submissions.map((submission) => (
                    <tr key={submission._id} className={`transition-colors ${getNewItemClasses(submission.createdAt)}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{formatDate(submission.createdAt)}</div>
                        <div className="text-xs text-gray-500">{formatRelativeTime(submission.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">{submission.name}</div>
                          <NewBadge createdAt={submission.createdAt} />
                        </div>
                        <div className="text-xs text-gray-500">ID: {submission._id.slice(-8)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {submission.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {submission.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(submission.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewingSubmission(submission)}
                            className="text-blue-600 hover:text-primary-800"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(submission._id)}
                            className="text-red-600 hover:text-red-800"
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 px-6 py-4">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* View Modal */}
      {viewingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Contact Submission Details</h2>
                <button onClick={() => setViewingSubmission(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Actions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Change Status</label>
                <div className="flex gap-2 flex-wrap">
                  {['new', 'read', 'replied', 'resolved', 'spam'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(viewingSubmission._id, status)}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        viewingSubmission.status === status
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submission Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900 mt-1">{viewingSubmission.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900 mt-1">
                    <a href={`mailto:${viewingSubmission.email}`} className="text-blue-600 hover:underline">
                      {viewingSubmission.email}
                    </a>
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Subject</label>
                  <p className="text-gray-900 mt-1">{viewingSubmission.subject}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Message</label>
                  <p className="text-gray-900 mt-1 whitespace-pre-wrap">{viewingSubmission.message}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted</label>
                  <p className="text-gray-900 mt-1">{formatDate(viewingSubmission.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1">{getStatusBadge(viewingSubmission.status)}</p>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                {updatingNotes === viewingSubmission._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={4}
                      className="input"
                      placeholder="Add internal notes..."
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleSaveNotes(viewingSubmission._id)}>Save Notes</Button>
                      <Button variant="outline" onClick={() => setUpdatingNotes(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 whitespace-pre-wrap mb-2">
                      {viewingSubmission.adminNotes || 'No notes yet'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUpdatingNotes(viewingSubmission._id);
                        setAdminNotes(viewingSubmission.adminNotes || '');
                      }}
                    >
                      {viewingSubmission.adminNotes ? 'Edit Notes' : 'Add Notes'}
                    </Button>
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

export default ContactSubmissions;
