// FILE: apps/web/src/pages/dashboard/admin/Communications.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { useToast } from '@/components/common/ToastContainer';
import {
  Mail, MessageSquare, Phone, Megaphone, Search, Eye, Trash2, X,
  RefreshCw, Download, CheckCircle, Clock, AlertCircle, Send,
  ArrowDownLeft, ArrowUpRight, Bell, TrendingUp, BarChart3,
  Archive, Filter, MoreVertical
} from 'lucide-react';
import { formatDate } from '@/utils/format';
import { formatRelativeTime } from '@/utils/dateHelpers';

const Communications = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    direction: '',
    search: '',
  });
  const [viewingMessage, setViewingMessage] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  // Fetch communications
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-communications', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '20');
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.direction) params.append('direction', filters.direction);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/communications?${params}`);
      return response.data;
    },
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['communication-stats'],
    queryFn: async () => {
      const response = await api.get('/communications/stats');
      return response.data.data;
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/communications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-communications'] });
      queryClient.invalidateQueries({ queryKey: ['communication-stats'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/communications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-communications'] });
      queryClient.invalidateQueries({ queryKey: ['communication-stats'] });
      toast.success('Message deleted successfully');
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, action }) => {
      await api.post('/communications/bulk-update', { ids, action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-communications'] });
      queryClient.invalidateQueries({ queryKey: ['communication-stats'] });
      setSelectedItems([]);
      toast.success('Bulk action completed');
    },
  });

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportCSV = () => {
    const communications = data?.data || [];
    const csvData = [
      ['Date', 'Type', 'Direction', 'From', 'To', 'Subject', 'Status'].join(','),
      ...communications.map(c => [
        new Date(c.createdAt).toLocaleDateString(),
        c.type,
        c.direction,
        `"${c.fromName || c.from}"`,
        `"${c.toName || c.to}"`,
        `"${c.subject || ''}"`,
        c.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `communications-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Exported successfully!');
  };

  const handleBulkAction = (action) => {
    if (selectedItems.length === 0) {
      toast.error('Please select items first');
      return;
    }
    bulkUpdateMutation.mutate({ ids: selectedItems, action });
  };

  const toggleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const communications = data?.data || [];
    if (selectedItems.length === communications.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(communications.map(c => c._id));
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      email: <Mail className="w-4 h-4 text-blue-600" />,
      whatsapp: <MessageSquare className="w-4 h-4 text-green-600" />,
      sms: <Phone className="w-4 h-4 text-purple-600" />,
      marketing: <Megaphone className="w-4 h-4 text-orange-600" />,
      notification: <Bell className="w-4 h-4 text-yellow-600" />,
      support: <MessageSquare className="w-4 h-4 text-indigo-600" />,
    };
    return icons[type] || <MessageSquare className="w-4 h-4 text-gray-600" />;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Send className="w-3 h-3" /> },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertCircle className="w-3 h-3" /> },
      read: { bg: 'bg-purple-100', text: 'text-purple-800', icon: <Eye className="w-3 h-3" /> },
    };
    const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: null };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
        {style.icon}
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const communications = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communication Hub</h1>
          <p className="text-sm text-gray-600 mt-1">Manage all customer communications in one place</p>
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
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Communication Overview</h2>
          <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1 rounded-full">
            <BarChart3 className="w-4 h-4" />
            Last 30 days
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Messages</p>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Last 24h</p>
            <p className="text-2xl font-bold text-blue-400">{stats?.recent24h || 0}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Delivered</p>
            <p className="text-2xl font-bold text-green-400">{stats?.delivered || 0}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">{stats?.pending || 0}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Failed</p>
            <p className="text-2xl font-bold text-red-400">{stats?.failed || 0}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Delivery Rate</p>
            <p className="text-2xl font-bold text-green-400">
              {stats?.total > 0 ? Math.round((stats?.delivered || 0) / stats.total * 100) : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Channel Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { type: 'email', label: 'Email', icon: Mail, color: 'blue' },
          { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'green' },
          { type: 'sms', label: 'SMS', icon: Phone, color: 'purple' },
          { type: 'notification', label: 'Push', icon: Bell, color: 'yellow' },
          { type: 'marketing', label: 'Marketing', icon: Megaphone, color: 'orange' },
          { type: 'support', label: 'Support', icon: MessageSquare, color: 'indigo' },
        ].map((channel) => (
          <div
            key={channel.type}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:border-${channel.color}-300 transition-colors ${
              filters.type === channel.type ? `border-${channel.color}-500 bg-${channel.color}-50` : ''
            }`}
            onClick={() => setFilters({ ...filters, type: filters.type === channel.type ? '' : channel.type })}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 bg-${channel.color}-100 rounded-lg`}>
                <channel.icon className={`w-5 h-5 text-${channel.color}-600`} />
              </div>
              <p className="text-2xl font-bold">{stats?.byType?.[channel.type] || 0}</p>
            </div>
            <p className="text-sm text-gray-600 mt-2">{channel.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search messages..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <CustomSelect
            value={filters.type}
            onChange={(value) => {
              setFilters({ ...filters, type: value });
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Channels' },
              { value: 'email', label: 'Email' },
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'sms', label: 'SMS' },
              { value: 'marketing', label: 'Marketing' },
              { value: 'notification', label: 'Notification' },
              { value: 'support', label: 'Support' },
            ]}
            placeholder="All Channels"
          />

          <CustomSelect
            value={filters.status}
            onChange={(value) => {
              setFilters({ ...filters, status: value });
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'sent', label: 'Sent' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'failed', label: 'Failed' },
              { value: 'read', label: 'Read' },
            ]}
            placeholder="All Status"
          />

          <CustomSelect
            value={filters.direction}
            onChange={(value) => {
              setFilters({ ...filters, direction: value });
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Directions' },
              { value: 'incoming', label: 'Incoming' },
              { value: 'outgoing', label: 'Outgoing' },
            ]}
            placeholder="All Directions"
          />
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4">
            <span className="text-sm text-gray-600">{selectedItems.length} selected</span>
            <button
              onClick={() => handleBulkAction('read')}
              className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg"
            >
              Mark as Read
            </button>
            <button
              onClick={() => handleBulkAction('archive')}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg"
            >
              Archive
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : communications.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No communications found</p>
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
                        checked={selectedItems.length === communications.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Channel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Direction</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">From</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Subject/Message</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {communications.map((comm) => (
                    <tr
                      key={comm._id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setViewingMessage(comm)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(comm._id)}
                          onChange={() => toggleSelectItem(comm._id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-gray-100 rounded-lg">
                            {getTypeIcon(comm.type)}
                          </div>
                          <span className="text-sm font-medium capitalize">{comm.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          comm.direction === 'incoming' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {comm.direction === 'incoming' ? (
                            <><ArrowDownLeft className="w-3 h-3" /> IN</>
                          ) : (
                            <><ArrowUpRight className="w-3 h-3" /> OUT</>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{comm.fromName || comm.from}</p>
                        {comm.fromName && <p className="text-xs text-gray-500">{comm.from}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{comm.toName || comm.to}</p>
                        {comm.toName && <p className="text-xs text-gray-500">{comm.to}</p>}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {comm.subject && <p className="text-sm font-medium text-gray-900 truncate">{comm.subject}</p>}
                        <p className="text-xs text-gray-500 truncate">{comm.message?.substring(0, 50)}...</p>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(comm.status)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{formatRelativeTime(comm.createdAt)}</p>
                        <p className="text-xs text-gray-500">{formatDate(comm.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingMessage(comm)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(comm._id)}
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
              <div className="p-4 border-t">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* View Message Modal */}
      {viewingMessage && (
        <MessageDetailsModal
          message={viewingMessage}
          onClose={() => setViewingMessage(null)}
          getTypeIcon={getTypeIcon}
          getStatusBadge={getStatusBadge}
        />
      )}
    </div>
  );
};

// Message Details Modal
const MessageDetailsModal = ({ message, onClose, getTypeIcon, getStatusBadge }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                {message.type === 'email' && <Mail className="w-5 h-5" />}
                {message.type === 'whatsapp' && <MessageSquare className="w-5 h-5" />}
                {message.type === 'sms' && <Phone className="w-5 h-5" />}
                {message.type === 'marketing' && <Megaphone className="w-5 h-5" />}
                {message.type === 'notification' && <Bell className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-xl font-bold capitalize">{message.type} Message</h2>
                <p className="text-gray-300 text-sm">ID: {message._id?.slice(-8)}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Direction */}
          <div className="flex items-center gap-4">
            {getStatusBadge(message.status)}
            <span className={`inline-flex items-center gap-1 text-sm font-medium ${
              message.direction === 'incoming' ? 'text-blue-600' : 'text-green-600'
            }`}>
              {message.direction === 'incoming' ? (
                <><ArrowDownLeft className="w-4 h-4" /> Incoming</>
              ) : (
                <><ArrowUpRight className="w-4 h-4" /> Outgoing</>
              )}
            </span>
          </div>

          {/* From/To */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">From</label>
              <p className="text-gray-900 font-medium">{message.fromName || message.from}</p>
              {message.fromName && <p className="text-sm text-gray-500">{message.from}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">To</label>
              <p className="text-gray-900 font-medium">{message.toName || message.to}</p>
              {message.toName && <p className="text-sm text-gray-500">{message.to}</p>}
            </div>
          </div>

          {/* Subject */}
          {message.subject && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Subject</label>
              <p className="text-lg font-medium text-gray-900 mt-1">{message.subject}</p>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Message</label>
            <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-100 whitespace-pre-wrap">
              {message.message}
            </div>
          </div>

          {/* HTML Content (if email) */}
          {message.htmlContent && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">HTML Preview</label>
              <div className="mt-2 p-4 bg-white border rounded-lg max-h-64 overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: message.htmlContent }} />
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="text-xs font-medium text-gray-500 uppercase">Created</label>
              <p className="text-gray-900 mt-1">{formatDate(message.createdAt)}</p>
            </div>
            {message.sentAt && (
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs font-medium text-gray-500 uppercase">Sent</label>
                <p className="text-gray-900 mt-1">{formatDate(message.sentAt)}</p>
              </div>
            )}
            {message.deliveredAt && (
              <div className="bg-green-50 rounded-lg p-3">
                <label className="text-xs font-medium text-gray-500 uppercase">Delivered</label>
                <p className="text-green-700 mt-1">{formatDate(message.deliveredAt)}</p>
              </div>
            )}
            {message.readAt && (
              <div className="bg-purple-50 rounded-lg p-3">
                <label className="text-xs font-medium text-gray-500 uppercase">Read</label>
                <p className="text-purple-700 mt-1">{formatDate(message.readAt)}</p>
              </div>
            )}
          </div>

          {/* Error message if failed */}
          {message.status === 'failed' && message.errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 font-medium mb-1">
                <AlertCircle className="w-4 h-4" />
                Delivery Failed
              </div>
              <p className="text-red-700 text-sm">{message.errorMessage}</p>
            </div>
          )}

          {/* Metadata */}
          {message.metadata && Object.keys(message.metadata).length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Metadata</label>
              <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-auto">
                {JSON.stringify(message.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default Communications;
