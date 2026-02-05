// FILE: apps/web/src/pages/dashboard/admin/ContactSubmissions.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { useToast } from '@/components/common/ToastContainer';
import {
  Mail, MessageSquare, Eye, Trash2, Check, X, AlertCircle, Search,
  Clock, CheckCircle, Send, RefreshCw, Download, Reply, User,
  Calendar, TrendingUp, Archive, Flag, MoreVertical
} from 'lucide-react';
import { formatDate } from '@/utils/format';
import NewBadge from '@/components/common/NewBadge';
import { getNewItemClasses, formatRelativeTime } from '@/utils/dateHelpers';

// Quick reply templates
const REPLY_TEMPLATES = [
  { id: 'thanks', label: 'Thank You', text: 'Thank you for contacting us. We have received your message and will respond within 24 hours.' },
  { id: 'received', label: 'Received', text: 'We have received your inquiry and our team is looking into it. We will get back to you shortly.' },
  { id: 'info', label: 'Need More Info', text: 'Thank you for reaching out. To better assist you, could you please provide more details about your inquiry?' },
  { id: 'resolved', label: 'Issue Resolved', text: 'We are pleased to inform you that your inquiry has been resolved. Please let us know if you need any further assistance.' },
];

const ContactSubmissions = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('new');
  const [filters, setFilters] = useState({ search: '' });
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [replyMode, setReplyMode] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  // Fetch contact submissions with stats
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-contact-submissions', page, activeTab, filters.search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      params.append('status', activeTab);
      if (filters.search) params.append('search', filters.search);
      const response = await api.get(`/admin/contact-submissions?${params}`);
      return response.data;
    },
  });

  // Fetch stats separately for accurate counts
  const { data: statsData } = useQuery({
    queryKey: ['admin-contact-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/contact-submissions/stats');
      return response.data.data;
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await api.put(`/admin/contact-submissions/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-contact-stats'] });
      toast.success('Status updated!');
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ id, message }) => {
      await api.post(`/admin/contact-submissions/${id}/reply`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-contact-stats'] });
      setReplyMode(false);
      setReplyText('');
      toast.success('Reply sent successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }) => {
      await api.post('/admin/contact-submissions/bulk-update', { ids, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-contact-stats'] });
      setSelectedItems([]);
      toast.success('Bulk update successful!');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/contact-submissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contact-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-contact-stats'] });
      toast.success('Submission deleted!');
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

  const handleReply = () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply message');
      return;
    }
    replyMutation.mutate({ id: viewingSubmission._id, message: replyText });
  };

  const handleBulkAction = (action) => {
    if (selectedItems.length === 0) {
      toast.error('Please select items first');
      return;
    }
    bulkUpdateMutation.mutate({ ids: selectedItems, status: action });
  };

  const handleExportCSV = () => {
    const submissions = data?.data || [];
    const csvData = [
      ['Date', 'Name', 'Email', 'Subject', 'Message', 'Status'].join(','),
      ...submissions.map(s => [
        new Date(s.createdAt).toLocaleDateString(),
        `"${s.name}"`,
        s.email,
        `"${s.subject}"`,
        `"${s.message?.substring(0, 100)}..."`,
        s.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contact-submissions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Exported successfully!');
  };

  const toggleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const submissions = data?.data || [];
    if (selectedItems.length === submissions.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(submissions.map(s => s._id));
    }
  };

  // Get time since submission for urgency
  const getUrgencyBadge = (createdAt) => {
    const hours = Math.floor((Date.now() - new Date(createdAt)) / (1000 * 60 * 60));
    if (hours < 4) return { label: 'New', color: 'bg-blue-100 text-blue-800' };
    if (hours < 24) return { label: `${hours}h`, color: 'bg-green-100 text-green-800' };
    if (hours < 48) return { label: '1d+', color: 'bg-yellow-100 text-yellow-800' };
    return { label: `${Math.floor(hours / 24)}d`, color: 'bg-red-100 text-red-800' };
  };

  const submissions = data?.data || [];
  const meta = data?.meta || {};
  const totalPages = Math.ceil((meta.total || 0) / (meta.limit || 20));
  const stats = statsData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contact Submissions</h1>
          <p className="text-sm text-gray-600 mt-1">Manage customer inquiries and messages</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
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
              <p className="text-sm text-gray-600">Needs Response</p>
              <p className="text-2xl font-bold text-red-600">{stats.new || 0}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Replied</p>
              <p className="text-2xl font-bold text-green-600">{stats.replied || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-purple-600">{stats.resolved || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Check className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold text-blue-600">{stats.responseRate || 0}%</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold">{stats.avgResponseTime || '—'}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {[
            { key: 'new', label: 'New', count: stats.new, color: 'blue' },
            { key: 'read', label: 'Read', count: stats.read, color: 'gray' },
            { key: 'replied', label: 'Replied', count: stats.replied, color: 'green' },
            { key: 'resolved', label: 'Resolved', count: stats.resolved, color: 'purple' },
            { key: 'spam', label: 'Spam', count: stats.spam, color: 'red' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`flex-1 min-w-fit px-6 py-4 font-medium text-sm transition-colors relative ${
                activeTab === tab.key
                  ? `text-${tab.color}-600 bg-${tab.color}-50 border-b-2 border-${tab.color}-600`
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 bg-${tab.color}-100 text-${tab.color}-700 rounded-full text-xs`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Bulk Actions */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by name, email, or subject..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedItems.length} selected</span>
              <button
                onClick={() => handleBulkAction('read')}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Mark Read
              </button>
              <button
                onClick={() => handleBulkAction('resolved')}
                className="px-3 py-1.5 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-lg"
              >
                Resolve
              </button>
              <button
                onClick={() => handleBulkAction('spam')}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"
              >
                Spam
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No submissions found</p>
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
                        checked={selectedItems.length === submissions.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Urgency</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Received</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {submissions.map((submission) => {
                    const urgency = getUrgencyBadge(submission.createdAt);
                    return (
                      <tr
                        key={submission._id}
                        className={`hover:bg-gray-50 cursor-pointer ${getNewItemClasses(submission.createdAt)}`}
                        onClick={() => setViewingSubmission(submission)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(submission._id)}
                            onChange={() => toggleSelectItem(submission._id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${urgency.color}`}>
                            {urgency.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{submission.name}</p>
                                <NewBadge createdAt={submission.createdAt} />
                              </div>
                              <p className="text-xs text-gray-500">{submission.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 font-medium truncate max-w-xs">{submission.subject}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{submission.message?.substring(0, 60)}...</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            submission.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            submission.status === 'replied' ? 'bg-green-100 text-green-800' :
                            submission.status === 'resolved' ? 'bg-purple-100 text-purple-800' :
                            submission.status === 'spam' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>{formatRelativeTime(submission.createdAt)}</div>
                          <div className="text-xs text-gray-400">{formatDate(submission.createdAt)}</div>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewingSubmission(submission)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setViewingSubmission(submission);
                                setReplyMode(true);
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Reply"
                            >
                              <Reply className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(submission._id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
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

            {totalPages > 1 && (
              <div className="border-t border-gray-200 px-6 py-4">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* View/Reply Modal */}
      {viewingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Contact Submission</h2>
                  <p className="text-gray-300 text-sm mt-1">ID: {viewingSubmission._id.slice(-8)}</p>
                </div>
                <button onClick={() => { setViewingSubmission(null); setReplyMode(false); setReplyText(''); }} className="text-gray-300 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Actions */}
              <div className="flex flex-wrap gap-2">
                {['new', 'read', 'replied', 'resolved', 'spam'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(viewingSubmission._id, status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      viewingSubmission.status === status
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Name</label>
                    <p className="text-gray-900 font-medium">{viewingSubmission.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                    <p>
                      <a href={`mailto:${viewingSubmission.email}`} className="text-blue-600 hover:underline">
                        {viewingSubmission.email}
                      </a>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Subject</label>
                    <p className="text-gray-900">{viewingSubmission.subject}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Received</label>
                    <p className="text-gray-900">{formatDate(viewingSubmission.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Message</label>
                <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-gray-900 whitespace-pre-wrap">{viewingSubmission.message}</p>
                </div>
              </div>

              {/* Previous Replies */}
              {viewingSubmission.replies && viewingSubmission.replies.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Previous Replies</label>
                  <div className="space-y-3">
                    {viewingSubmission.replies.map((reply, idx) => (
                      <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-green-800">Admin Reply</span>
                          <span className="text-xs text-gray-500">{formatDate(reply.createdAt)}</span>
                        </div>
                        <p className="text-gray-900">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply Section */}
              {replyMode && (
                <div className="border-t pt-6">
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Send Reply</label>

                  {/* Quick Templates */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {REPLY_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setReplyText(template.text)}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full"
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={5}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Type your reply..."
                  />
                  <div className="flex items-center justify-end gap-3 mt-3">
                    <Button variant="outline" onClick={() => { setReplyMode(false); setReplyText(''); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleReply} loading={replyMutation.isPending}>
                      <Send className="w-4 h-4 mr-2" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!replyMode && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setViewingSubmission(null)}>
                    Close
                  </Button>
                  <Button onClick={() => setReplyMode(true)}>
                    <Reply className="w-4 h-4 mr-2" />
                    Reply to Customer
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactSubmissions;
