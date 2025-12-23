// FILE: apps/web/src/pages/dashboard/admin/Communications.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import Button from '@/components/common/Button';
import Pagination from '@/components/common/Pagination';
import Spinner from '@/components/common/Spinner';
import CustomSelect from '@/components/common/CustomSelect';
import { Mail, MessageSquare, Phone, Megaphone, Search, Filter, Eye, Trash2 } from 'lucide-react';
import { formatDate } from '@/utils/format';

const Communications = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    direction: '',
    search: '',
  });
  const [viewingMessage, setViewingMessage] = useState(null);

  // Fetch communications
  const { data, isLoading } = useQuery({
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/communications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-communications'] });
      alert('Message deleted successfully');
    },
  });

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMutation.mutate(id);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'email':
        return <Mail className="w-5 h-5 text-blue-600" />;
      case 'whatsapp':
        return <MessageSquare className="w-5 h-5 text-green-600" />;
      case 'sms':
        return <Phone className="w-5 h-5 text-secondary-600" />;
      case 'marketing':
        return <Megaphone className="w-5 h-5 text-orange-600" />;
      default:
        return <MessageSquare className="w-5 h-5 text-gray-700" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-primary-100 text-primary-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      read: 'bg-secondary-100 text-secondary-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || 'bg-blue-100 text-gray-900'}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const communications = data?.data || [];
  const totalPages = Math.ceil((data?.meta?.total || 0) / 20);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Communication Hub</h1>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-gray-700 text-sm font-medium mb-2">Total Messages</h3>
            <p className="text-3xl font-bold">{stats.total || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-gray-700 text-sm font-medium mb-2">Last 24h</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.recent24h || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-gray-700 text-sm font-medium mb-2">Emails</h3>
            <p className="text-3xl font-bold text-green-600">{stats.byType?.email || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-gray-700 text-sm font-medium mb-2">WhatsApp</h3>
            <p className="text-3xl font-bold text-green-600">{stats.byType?.whatsapp || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="text-gray-700 text-sm font-medium mb-2">Failed</h3>
            <p className="text-3xl font-bold text-red-600">{stats.failed || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search messages..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPage(1);
              }}
              className="input pl-10 w-full"
            />
          </div>

          <CustomSelect
            value={filters.type}
            onChange={(value) => {
              setFilters({ ...filters, type: value });
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Types' },
              { value: 'email', label: 'Email' },
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'sms', label: 'SMS' },
              { value: 'marketing', label: 'Marketing' },
              { value: 'notification', label: 'Notification' },
              { value: 'support', label: 'Support' },
            ]}
            placeholder="All Types"
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

        {(filters.type || filters.status || filters.direction || filters.search) && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({ type: '', status: '', direction: '', search: '' });
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-100 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Direction</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">From</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">To</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Subject/Message</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {communications.length > 0 ? (
                communications.map((comm) => (
                  <tr key={comm._id} className="border-b hover:bg-blue-100">
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(comm.type)}
                        <span className="capitalize text-sm">{comm.type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <span className={`text-xs font-medium ${comm.direction === 'incoming' ? 'text-blue-600' : 'text-green-600'}`}>
                        {comm.direction === 'incoming' ? '↓ IN' : '↑ OUT'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div>{comm.fromName || comm.from}</div>
                      {comm.fromName && <div className="text-xs text-gray-500">{comm.from}</div>}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div>{comm.toName || comm.to}</div>
                      {comm.toName && <div className="text-xs text-gray-500">{comm.to}</div>}
                    </td>
                    <td className="py-3 px-4 text-sm max-w-xs">
                      {comm.subject && <div className="font-medium mb-1">{comm.subject}</div>}
                      <div className="text-gray-700 truncate">{comm.message}</div>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      {getStatusBadge(comm.status)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {formatDate(comm.createdAt)}
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingMessage(comm)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(comm._id)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-500">
                    No communications found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* View Message Modal */}
      {viewingMessage && (
        <MessageDetailsModal
          message={viewingMessage}
          onClose={() => setViewingMessage(null)}
        />
      )}
    </div>
  );
};

// Message Details Modal
const MessageDetailsModal = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Message Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Type and Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {message.type === 'email' && <Mail className="w-5 h-5 text-blue-600" />}
              {message.type === 'whatsapp' && <MessageSquare className="w-5 h-5 text-green-600" />}
              {message.type === 'sms' && <Phone className="w-5 h-5 text-secondary-600" />}
              {message.type === 'marketing' && <Megaphone className="w-5 h-5 text-orange-600" />}
              <span className="font-semibold capitalize">{message.type}</span>
            </div>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
              message.status === 'delivered' ? 'bg-green-100 text-green-800' :
              message.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-primary-100 text-primary-800'
            }`}>
              {message.status}
            </span>
            <span className={`text-sm ${message.direction === 'incoming' ? 'text-blue-600' : 'text-green-600'}`}>
              {message.direction === 'incoming' ? '↓ Incoming' : '↑ Outgoing'}
            </span>
          </div>

          {/* From/To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">From:</label>
              <p className="mt-1">{message.fromName || message.from}</p>
              {message.fromName && <p className="text-sm text-gray-500">{message.from}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">To:</label>
              <p className="mt-1">{message.toName || message.to}</p>
              {message.toName && <p className="text-sm text-gray-500">{message.to}</p>}
            </div>
          </div>

          {/* Subject */}
          {message.subject && (
            <div>
              <label className="text-sm font-semibold text-gray-700">Subject:</label>
              <p className="mt-1 text-lg">{message.subject}</p>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="text-sm font-semibold text-gray-700">Message:</label>
            <div className="mt-2 p-4 bg-blue-100 rounded-lg whitespace-pre-wrap">
              {message.message}
            </div>
          </div>

          {/* HTML Content (if email) */}
          {message.htmlContent && (
            <div>
              <label className="text-sm font-semibold text-gray-700">HTML Content:</label>
              <div className="mt-2 p-4 bg-blue-100 rounded-lg border max-h-64 overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: message.htmlContent }} />
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-semibold text-gray-700">Created:</label>
              <p className="text-gray-700">{formatDate(message.createdAt)}</p>
            </div>
            {message.sentAt && (
              <div>
                <label className="font-semibold text-gray-700">Sent:</label>
                <p className="text-gray-700">{formatDate(message.sentAt)}</p>
              </div>
            )}
            {message.deliveredAt && (
              <div>
                <label className="font-semibold text-gray-700">Delivered:</label>
                <p className="text-gray-700">{formatDate(message.deliveredAt)}</p>
              </div>
            )}
            {message.readAt && (
              <div>
                <label className="font-semibold text-gray-700">Read:</label>
                <p className="text-gray-700">{formatDate(message.readAt)}</p>
              </div>
            )}
          </div>

          {/* Error message if failed */}
          {message.status === 'failed' && message.errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <label className="text-sm font-semibold text-red-800">Error:</label>
              <p className="text-red-700 mt-1">{message.errorMessage}</p>
            </div>
          )}

          {/* Metadata */}
          {message.metadata && Object.keys(message.metadata).length > 0 && (
            <div>
              <label className="text-sm font-semibold text-gray-700">Metadata:</label>
              <pre className="mt-2 p-4 bg-blue-100 rounded-lg text-xs overflow-auto">
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
